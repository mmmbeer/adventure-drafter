// @vitest-environment jsdom
import { splitTable } from "../src/lib/table-flow";
import { describe, it, expect } from "vitest";
import {
  createAdventure,
  page,
  paragraph,
  heading,
  entries,
  keywordIndex,
  validateAdventure,
  pageNumber,
  sheetCount,
  nodeText,
} from "../src/lib/model";
import { cleanHtml, splitNode, extensions } from "../src/lib/editor";
import { generateJSON, generateHTML } from "@tiptap/core";
import { importText } from "../src/lib/import";
describe("document publishing model", () => {
  it("changes templates without replacing content", () => {
    const d = createAdventure();
    const before = JSON.stringify(d.pages);
    d.settings.theme = { ...d.settings.theme, accent: "#000000" };
    expect(JSON.stringify(d.pages)).toBe(before);
  });
  it("generates TOC and keyword references after reordering", () => {
    const d = createAdventure(true);
    const a = page("body", [
      heading("The bell", 9),
      paragraph("Mara knows the Bellkeeper."),
    ]);
    d.pages = [page("title"), page("toc"), a, page("index")];
    d.settings.tocDepth = 9;
    d.indexTerms = ["Mara", "Bellkeeper", "moss"];
    expect(entries(d)[0]).toMatchObject({
      title: "The bell",
      level: 9,
      page: 3,
      pageId: a.id,
    });
    expect(keywordIndex(d).find((x) => x.term === "Mara")?.pages).toEqual([3]);
    d.pages = [a, ...d.pages.filter((p) => p.id !== a.id)];
    expect(entries(d)[0].page).toBe(1);
  });
  it("counts continued contents pages in subsequent page references", () => {
    const d = createAdventure(true);
    d.pages = [
      page("toc"),
      page(
        "body",
        Array.from({ length: 100 }, (_, i) => heading(`Heading ${i}`)),
      ),
    ];
    expect(sheetCount(d, d.pages[0])).toBeGreaterThan(1);
    expect(entries(d)[0].page).toBe(pageNumber(d, 1));
  });
  it("rejects invalid files and clamps page geometry", () => {
    expect(() => validateAdventure({})).toThrow();
    const d = createAdventure();
    d.settings.columns = 100;
    expect(validateAdventure(d).settings.columns).toBe(3);
  });
  it("splits long rich text without losing text or marks", () => {
    const n = {
      type: "paragraph",
      content: [
        { type: "text", text: "Before the bell ", marks: [{ type: "bold" }] },
        { type: "text", text: "the village was quiet." },
      ],
    };
    const halves = splitNode(n)!;
    expect(
      halves
        .flatMap((n) => n.content ?? [])
        .map((n) => n.text)
        .join(""),
    ).toBe(n.content.map((n) => n.text).join(""));
    expect(halves[0].content?.[0].marks).toEqual([{ type: "bold" }]);
  });
  it("preserves high heading levels through HTML round trips", () => {
    const d = { type: "doc", content: [heading("Ninth-level heading", 9)] };
    expect(
      generateJSON(generateHTML(d, extensions()), extensions()).content?.[0]
        .attrs?.level,
    ).toBe(9);
  });
  it("removes active HTML and unsafe pasted image sources", () => {
    const clean = cleanHtml(
      '<script>alert(1)</script><iframe src="https://x.test"></iframe><p onclick="alert(1)">Safe</p><img src="javascript:alert(1)">',
    );
    expect(clean).not.toMatch(/script|iframe|onclick|javascript/);
  });
  it("imports Homebrewery page/column breaks and monster blocks", async () => {
    const r = await importText(
      "# The marsh\n\n{{monster,frame\n## Spirit\n\nArmor Class 12\n}}\n\n\\column\n\nEnd.\n\n\\page\n\n# Next",
      "Import",
      true,
    );
    expect(r.document.pages).toHaveLength(2);
    expect(
      r.document.pages[0].content.content?.some((n) => n.type === "statBlock"),
    ).toBe(true);
    expect(
      r.document.pages[0].content.content?.some(
        (n) => n.type === "columnBreak",
      ),
    ).toBe(true);
    expect(nodeText(r.document.pages[1].content)).toContain("Next");
  });
  it("keeps GFM tables and sanitizes Markdown HTML", async () => {
    const r = await importText(
      "| d6 | Result |\n|---|---|\n| 1 | Goblin |\n\n<script>bad()</script>",
      "Table",
    );
    expect(
      r.document.pages[0].content.content?.some((n) => n.type === "table"),
    ).toBe(true);
    expect(nodeText(r.document.pages[0].content)).not.toContain("bad()");
  });
});

describe("rich content round trips", () => {
  it("indexes names without introducing spaces between formatting runs", () => {
    const d = createAdventure(true);
    d.pages = [
      page("body", [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bell", marks: [{ type: "bold" }] },
            { type: "text", text: "keeper" },
          ],
        },
      ]),
    ];
    d.indexTerms = ["Bellkeeper"];
    expect(keywordIndex(d)[0].pages).toEqual([1]);
  });
  it("continues numbered lists and does not duplicate ordinary table rows", () => {
    const list = {
      type: "orderedList",
      attrs: { start: 4 },
      content: Array.from({ length: 4 }, (_, i) => ({
        type: "listItem",
        content: [paragraph(String(i))],
      })),
    };
    expect(splitNode(list)?.[1].attrs?.start).toBe(6);
    const table = {
      type: "table",
      content: Array.from({ length: 4 }, (_, i) => ({
        type: "tableRow",
        content: [{ type: "tableCell", content: [paragraph(String(i))] }],
      })),
    };
    const parts = splitTable(table, 2)!;
    expect(parts.flatMap((p) => p.content ?? [])).toHaveLength(4);
  });
});
