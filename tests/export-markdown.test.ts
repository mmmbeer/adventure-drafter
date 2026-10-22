import { describe, it, expect } from "vitest";
import {
  createAdventure,
  page,
  paragraph,
  heading,
} from "../src/lib/documents";
import { markdownDocument, markdownBlocks } from "../src/lib/export-markdown";
import { splitTable } from "../src/lib/table-flow";

describe("Markdown export", () => {
  it("resolves fields, preserves inline marks and embeds rule artwork", async () => {
    const doc = createAdventure(true);
    doc.title = "The Archive";
    doc.author = "Mara";
    doc.pages = [
      page("body", [
        heading("Opening"),
        {
          type: "paragraph",
          content: [
            { type: "mergeTag", attrs: { name: "author" } },
            {
              type: "text",
              text: " keeps a | lantern",
              marks: [{ type: "bold" }],
            },
          ],
        },
        { type: "horizontalRule", attrs: { divider: "theme" } },
      ]),
    ];
    const out = await markdownDocument(
      doc,
      async (url) => `data:image/png;base64,${url}`,
    );
    expect(out).toContain("# Opening");
    expect(out).toContain("Mara **keeps a \\| lantern**");
    expect(out).toContain(
      "![Decorative horizontal rule](data:image/png;base64,/dividers/parchment.png)",
    );
    expect(out).not.toContain("{author}");
    expect(out).toContain('"fontSizePx":15');
  });
  it("rejoins table continuations across columns and pages without duplicate headers or rows", async () => {
    const doc = createAdventure(true);
    const cell = (name: string, header = false) => ({
      type: header ? "tableHeader" : "tableCell",
      content: [paragraph(name)],
    });
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [cell("Roll", true), cell("Result", true)],
        },
        ...Array.from({ length: 6 }, (_, i) => ({
          type: "tableRow",
          content: [cell(`${i + 1}`), cell(`Result ${i + 1}`)],
        })),
      ],
    };
    const [left, right] = splitTable(table, 3)!;
    const [middle, last] = splitTable(right, 3)!;
    doc.pages = [page("body", [left, middle]), page("body", [last])];
    expect(markdownBlocks(doc)).toHaveLength(1);
    const out = await markdownDocument(doc);
    expect(out.match(/\| Roll \| Result \|/g)).toHaveLength(1);
    for (let i = 1; i <= 6; i++)
      expect(out.match(new RegExp(`Result ${i}`, "g"))).toHaveLength(1);
  });
  it("preserves merged cells using HTML, multiline code and column/page markers", async () => {
    const doc = createAdventure(true);
    doc.pages = [
      page("body", [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { colspan: 2, rowspan: 2 },
                  content: [paragraph("Merged")],
                },
              ],
            },
          ],
        },
        { type: "columnBreak" },
        { type: "codeBlock", content: [{ type: "text", text: "x = ```\ny" }] },
      ]),
      page("body", [paragraph("Last")]),
    ];
    const out = await markdownDocument(doc);
    expect(out).toContain('colspan="2" rowspan="2"');
    expect(out).toContain("<p>Merged</p>");
    expect(out).toContain("````\nx = ```\ny\n````");
    expect(out).toContain("<!-- columnbreak -->");
    expect(out).toContain("<!-- pagebreak -->");
  });
});
