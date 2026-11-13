// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Editor, generateJSON } from "@tiptap/core";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { cleanHtml, extensions } from "../src/lib/editor";
import { importFile, importWordHtml } from "../src/lib/import";
import { normalizeWordHtml, isWordHtml } from "../src/lib/word-html";
import { nodeText } from "../src/lib/model";

// Vite selects Mammoth's browser transport in production. Node's transport
// accepts a Buffer instead of an ArrayBuffer; keep the real DOCX parser.
vi.mock("mammoth", async (importOriginal) => {
  const mammoth = await importOriginal<typeof import("mammoth")>();
  return {
    ...mammoth,
    convertToHtml: (
      input: { arrayBuffer: ArrayBuffer },
      options: Parameters<typeof mammoth.convertToHtml>[1],
    ) =>
      mammoth.convertToHtml(
        { buffer: Buffer.from(input.arrayBuffer) },
        options,
      ),
  };
});

const wordList = (marker: string, text: string, depth = 1, id = "l0") =>
  `<p class="MsoListParagraph" style="mso-list:${id} level${depth} lfo1"><span style="mso-list:Ignore">${marker}<span>&nbsp;&nbsp;</span></span>${text}</p>`;

function content(html: string) {
  return generateJSON(cleanHtml(normalizeWordHtml(html)), extensions())
    .content!;
}

describe("Word style imports", () => {
  it("maps standard clipboard styles without copying Word typography", () => {
    const html = `<p class="MsoTitle">The Glass Tower</p>
      <p class="MsoSubtitle">A short adventure</p>
      <p class="MsoHeading1">First chapter</p><p class="MsoHeading1">Second chapter</p>
      <p class="MsoHeading9">Deep heading</p>
      <p style="mso-outline-level:4">Outline heading</p>
      <p class="MsoNormal" style="font-family:Calibri;font-size:36pt;color:red">Body <span style="font-weight:bold">bold</span> <i>italic</i></p>
      <p class="MsoQuote">A quoted clue.</p>`;
    expect(isWordHtml(html)).toBe(true);
    const nodes = content(html);
    expect(
      nodes
        .filter((node) => node.type === "heading")
        .map((node) => node.attrs?.level),
    ).toEqual([1, 1, 9, 4]);
    expect(nodes[0]).toMatchObject({
      type: "paragraph",
      attrs: { textRole: "title" },
    });
    expect(nodes[1]).toMatchObject({
      type: "paragraph",
      attrs: { textRole: "subtitle" },
    });
    expect(nodeText({ type: "doc", content: nodes })).toContain(
      "A quoted clue.",
    );
    expect(nodes.at(-1)?.type).toBe("blockquote");
    const body = nodes.at(-2)!;
    expect(body.content?.find((node) => node.text === "bold")?.marks).toEqual([
      { type: "bold" },
    ]);
    expect(JSON.stringify(nodes)).not.toMatch(/Calibri|36pt|"red"/);
  });

  it("keeps Word lists nested, preserves numbering, and separates list runs", () => {
    const nodes = content(
      wordList("3.", "First") +
        wordList("4.", "Second") +
        wordList("•", "Nested bullet", 2) +
        wordList("5.", "Third") +
        '<p class="MsoNormal">Between</p>' +
        wordList("•", "New list"),
    );
    expect(nodes.map((node) => node.type)).toEqual([
      "orderedList",
      "paragraph",
      "bulletList",
    ]);
    expect(nodes[0].attrs?.start).toBe(3);
    expect(nodes[0].content).toHaveLength(3);
    expect(nodes[0].content?.[1].content?.[1].type).toBe("bulletList");
    expect(nodeText(nodes[0])).toContain("Nested bullet");
    expect(nodeText(nodes[0])).not.toContain("3.");
  });

  it("preserves semantic lists, tables, links, and inline emphasis", () => {
    const nodes = content(`<ol start="4"><li><p>Item</p></li></ol>
      <table><tr><th>Name</th><th>Value</th></tr><tr><td><b>Key</b></td><td>5</td></tr></table>
      <p><a href="https://example.com">Link</a><span style="text-decoration:underline">Underlined</span></p>`);
    expect(nodes[0]).toMatchObject({
      type: "orderedList",
      attrs: { start: 4 },
    });
    expect(nodes[1].type).toBe("table");
    expect(nodes[1].content).toHaveLength(2);
    expect(nodes[2].content?.[0].marks?.[0].type).toBe("link");
    expect(nodes[2].content?.[1].marks?.[0].type).toBe("underline");
  });

  it("sanitizes pasted HTML and rejects empty imports", () => {
    const imported = importWordHtml(
      `<p class="MsoNormal" onclick="bad()">Safe<script>bad()</script><img src="file:///local/image.png" alt="Map" /></p><iframe src="https://example.com"></iframe>`,
    );
    const json = JSON.stringify(imported.document.pages);
    expect(json).not.toMatch(/bad|file:|iframe|onclick/);
    expect(nodeText(imported.document.pages[0].content)).toContain("SafeMap");
    expect(() => importWordHtml("<p> </p>")).toThrow(/Paste some/);
  });

  it("normalizes Word paste inside every shared editor while preserving ordinary paste", () => {
    const editor = new Editor({ extensions: extensions() });
    const paste = (html: string) => {
      let transformed = html;
      editor.view.someProp("transformPastedHTML", (fn) => {
        transformed = fn(transformed, editor.view);
      });
      return transformed;
    };
    expect(
      paste('<p class="MsoHeading2" style="font-size:50pt">Chapter</p>'),
    ).toBe("<h2>Chapter</h2>");
    expect(
      paste('<p style="color: rgb(255, 0, 0)">Ordinary paste</p>'),
    ).toContain("color:");
    editor.destroy();
  });

  it("imports real DOCX Title, Subtitle, all nine headings and adjacent headings", async () => {
    const document = new Document({
      styles: {
        paragraphStyles: [
          { id: "Subtitle", name: "Subtitle", basedOn: "Normal" },
          ...Array.from({ length: 9 }, (_, i) => ({
            id: `Heading${i + 1}`,
            name: `Heading ${i + 1}`,
            basedOn: "Normal",
          })),
        ],
      },
      sections: [
        {
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              text: "The Glass Tower",
            }),
            new Paragraph({
              style: "Subtitle",
              text: "A short adventure",
            }),
            ...Array.from(
              { length: 9 },
              (_, i) =>
                new Paragraph({
                  style: `Heading${i + 1}`,
                  text: `Heading ${i + 1}`,
                }),
            ),
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              text: "Another chapter",
            }),
            new Paragraph({
              children: [new TextRun({ text: "Body bold", bold: true })],
            }),
            new Paragraph({
              style: "Normal",
              text: "List item",
              bullet: { level: 0 },
            }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(document);
    const bytes = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const file = {
      name: "standard-styles.docx",
      size: buffer.length,
      arrayBuffer: async () => bytes,
    } as File;
    const imported = await importFile(file);
    const nodes = imported.document.pages[0].content.content!;
    expect(
      nodes
        .filter((node) => node.type === "heading")
        .map((node) => node.attrs?.level),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 1]);
    expect(nodes[0]).toMatchObject({
      type: "paragraph",
      attrs: { textRole: "title" },
    });
    expect(nodes[1]).toMatchObject({
      type: "paragraph",
      attrs: { textRole: "subtitle" },
    });
    expect(nodes.at(-1)?.type).toBe("bulletList");
    expect(nodeText(imported.document.pages[0].content)).toContain(
      "Another chapter",
    );
  });
});
