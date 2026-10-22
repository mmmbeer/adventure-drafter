// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";
import { createAdventure, page } from "../src/lib/documents";
import { editableWordDocument } from "../src/lib/export-editable";

vi.mock("../src/lib/export-images", async (load) => ({
  ...(await load<typeof import("../src/lib/export-images")>()),
  pngImage: vi.fn(async () => ({
    data: Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1cAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    ),
    width: 1,
    height: 1,
  })),
}));
it("writes native pages, sections, typography and tables with native paper shapes only in headers", async () => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  const doc = createAdventure(true);
  doc.pages = [page("body"), page("body")];
  document.body.innerHTML = `<main class="desk"><div class="canvas">${doc.pages
    .map(
      (p, i) => `
    <article class="paper body" data-page-id="${p.id}" data-part="0">
      <div class="page-writing"><div class="tiptap">
        <h1 id="ref-heading-${i}" style="font-size:32px;font-family:Cinzel">Editable chapter ${i + 1}</h1>
        <p style="font-size:15px;font-family:Spectral">Editable body ${i + 1}</p>
        <div data-wide="true"><table><tbody><tr><th><p>Header</p></th></tr><tr><td><p>Native cell ${i + 1}</p></td></tr></tbody></table></div>
        <p style="font-size:20px;font-family:Lora">After wide table</p>
      </div></div>
    </article>`,
    )
    .join("")}</div></main>`;
  const file = await editableWordDocument(doc, () => {});
  const zip = await JSZip.loadAsync(await Packer.toBuffer(file));
  const content = await zip.file("word/document.xml")!.async("string");
  expect(content).toContain("Editable chapter 1");
  expect(content).toContain("Editable chapter 2");
  expect(content).toContain("Native cell 1");
  expect(content).toContain("Native cell 2");
  expect(content).toContain('w:ascii="Spectral"');
  expect(content).toContain('w:sz w:val="11.25pt"');
  expect(content).toContain('w:type w:val="continuous"');
  expect(content).toContain('w:type w:val="nextPage"');
  expect(content.match(/<w:tbl>/g)).toHaveLength(2);
  expect(content).not.toContain("w:drawing");
  const header = await zip.file("word/header1.xml")!.async("string");
  expect(header).toContain("Paper color");
  expect(header).toContain("a:solidFill");
  expect(header).not.toContain("a:blip");
  expect(header).toContain("wp:anchor");
  expect(document.querySelector(".export-stage")).toBeNull();
}, 15000);
