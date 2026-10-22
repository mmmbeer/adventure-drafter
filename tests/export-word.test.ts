// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import { createAdventure } from "../src/lib/documents";
import { wordContent, wordRuns, wordBookmark } from "../src/lib/word-content";
import { cleanExportPage } from "../src/lib/export-layout";
import { wordColor, wordSize } from "../src/lib/word-format";

async function xml(
  children: (Paragraph | import("docx").Table)[],
  numbering: import("docx").INumberingOptions["config"] = [],
) {
  const zip = await JSZip.loadAsync(
    await Packer.toBuffer(
      new Document({
        sections: [{ children }],
        numbering: { config: numbering },
      }),
    ),
  );
  return zip.file("word/document.xml")!.async("string");
}
function element(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.replaceChildren(host);
  return host.firstElementChild as HTMLElement;
}
describe("native editable Word export", () => {
  it("writes real text with the resolved screen font, size, colors and marks", async () => {
    const source = element(
      '<p style="font-family:Spectral;font-size:20px;color:rgb(40, 95, 133)">Editable <span style="font-family:Cinzel;font-size:32px;font-weight:700;font-style:italic">Heading</span></p>',
    );
    const content = await xml([
      new Paragraph({ children: wordRuns(source, "#ffffff") }),
    ]);
    expect(content).toContain("Editable ");
    expect(content).toContain("Heading");
    expect(content).toContain('w:ascii="Spectral"');
    expect(content).toContain('w:ascii="Cinzel"');
    expect(content).toContain('w:sz w:val="15pt"');
    expect(content).toContain('w:sz w:val="24pt"');
    expect(content).toContain('w:color w:val="285F85"');
    expect(content).not.toContain("w:drawing");
  });
  it("exports native row/column spans, repeating headers, widths and row-safe breaks", async () => {
    const source = element(
      '<table><colgroup><col style="width:100px"><col style="width:200px"></colgroup><tbody><tr><th><p>Roll</p></th><th><p>Result</p></th></tr><tr><td rowspan="2"><p>Shared</p></td><td><p>One</p></td></tr><tr><td><p>Two</p></td></tr><tr><td colspan="2"><p>Both</p></td></tr></tbody></table>',
    );
    const converter = wordContent(createAdventure(true), "#ffffff");
    const content = await xml(await converter.convert(source, 300));
    expect(content).toContain("<w:tbl>");
    expect(content).toContain("<w:tblHeader/>");
    expect(content).toContain("<w:cantSplit/>");
    expect(content).toContain('w:gridSpan w:val="2"');
    expect(content).toContain('w:vMerge w:val="restart"');
    expect(content).toContain('w:vMerge w:val="continue"');
    expect(content).toContain('w:gridCol w:w="1500"');
    expect(content).toContain('w:gridCol w:w="3000"');
    for (const text of ["Roll", "Result", "Shared", "One", "Two", "Both"])
      expect(content).toContain(text);
    expect(content).not.toContain("w:drawing");
  });
  it("keeps resolved placeholders as searchable native text and strips all selection controls", async () => {
    const source = element(
      '<article class="paper active"><p class="selectedCell document-selection-text"><span class="merge-tag"><button class="merge-tag-value" style="font-family:Lora;font-size:18px">Mara Voss</button><button class="merge-tag-remove no-print">×</button></span></p><div class="node-tools">Resize</div></article>',
    );
    const cleaned = cleanExportPage(source);
    expect(
      cleaned.querySelector(
        "button,.selectedCell,.document-selection-text,.node-tools",
      ),
    ).toBeNull();
    const value = cleaned.querySelector<HTMLElement>(".merge-tag-value")!;
    const content = await xml([
      new Paragraph({ children: wordRuns(value, "#ffffff") }),
    ]);
    expect(content).toContain("Mara Voss");
    expect(content).toContain('w:ascii="Lora"');
    expect(content).toContain('w:sz w:val="13.5pt"');
    expect(content).not.toContain("×");
    expect(source.querySelector("button")).not.toBeNull();
  });
  it("keeps UUID reference targets within Word's bookmark-name limit", () => {
    const id = "ref-792d9d65-3841-4dfb-bcbf-252ccce79896";
    expect(wordBookmark(id).length).toBeLessThanOrEqual(40);
    expect(wordBookmark(id)).toMatch(/^[A-Za-z][A-Za-z0-9_]+$/);
    expect(wordBookmark(id)).toBe(wordBookmark(id));
    expect(wordBookmark(id)).not.toBe(wordBookmark(id + "other"));
  });
  it("converts CSS units and translucent theme colors without substituting defaults", () => {
    expect(wordSize(15)).toBe("11.25pt");
    expect(wordColor("color(srgb 0.2 0.4 0.6)")).toBe("336699");
    expect(wordColor("rgba(0, 0, 0, 0.5)", "#ffffff")).toBe("808080");
    expect(wordColor("rgba(0, 0, 0, 0)")).toBeUndefined();
  });
});
