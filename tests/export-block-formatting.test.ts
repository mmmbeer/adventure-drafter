import { describe, it, expect } from "vitest";
import { BorderStyle, LevelFormat, Packer, Document, Paragraph } from "docx";
import JSZip from "jszip";
import {
  wordBox,
  wordLists,
  wordTextStyles,
  wordTextStyle,
  wordContainer,
} from "../src/lib/export-block-formatting";
import { createAdventure } from "../src/lib/documents";

describe("editable Word block formatting", () => {
  it("exports title styles, code styles, selected borders and shading into Word XML", async () => {
    const box = wordBox({
      edges: "bottom",
      width: 3,
      color: "#123456",
      style: "dashed",
      background: "#eeeeee",
      padding: 8,
    });
    expect(box.borders?.bottom).toMatchObject({
      style: BorderStyle.DASHED,
      size: 18,
      color: "123456",
    });
    expect(box.borders?.top?.style).toBe(BorderStyle.NIL);
    const doc = new Document({
      styles: { paragraphStyles: wordTextStyles(createAdventure(true)) },
      sections: [
        {
          children: [
            new Paragraph({
              text: "Adventure title",
              style: wordTextStyle({
                type: "paragraph",
                attrs: { textRole: "title" },
              }),
              border: box.borders,
              shading: box.shading,
            }),
            wordContainer(
              [
                new Paragraph({
                  text: "code",
                  style: wordTextStyle({ type: "codeBlock" }),
                }),
              ],
              { edges: "all", padding: 12 },
            ),
          ],
        },
      ],
    });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:pStyle w:val="AdventureTitle"');
    expect(xml).toContain('w:pStyle w:val="AdventureCode"');
    expect(xml).toContain('w:fill="eeeeee"');
    expect(xml).toContain('w:val="dashed"');
    expect(xml).toContain('w:w="180"');
    const tableBorders = xml.match(/<w:tblBorders>.*?<\/w:tblBorders>/)?.[0];
    expect(tableBorders).toBeDefined();
    expect(tableBorders).not.toContain('w:val="single"');
  });
  it("keeps independent numbering starts, marker styles and nested levels", () => {
    const lists = wordLists();
    const roman = lists.add({
      type: "orderedList",
      attrs: { start: 4, listStyleType: "lower-roman" },
    });
    const square = lists.add(
      { type: "bulletList", attrs: { listStyleType: "square" } },
      roman,
    );
    const next = lists.add({ type: "orderedList" });
    expect(lists.config[0].levels[0]).toMatchObject({
      start: 4,
      format: LevelFormat.LOWER_ROMAN,
    });
    expect(lists.config[1].levels[1]).toMatchObject({
      text: "▪",
      format: LevelFormat.BULLET,
    });
    expect(square.level).toBe(1);
    expect(next.reference).not.toBe(roman.reference);
    expect(lists.config[2].levels[0].start).toBe(1);
  });
});
