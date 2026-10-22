// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { capturePages, exportPageChoices } from "../src/lib/export-capture";
import { createAdventure } from "../src/lib/documents";
import { toPng, getFontEmbedCSS } from "html-to-image";
vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => "data:image/png;base64,AA=="),
  getFontEmbedCSS: vi.fn(async () => "/* every page font */"),
}));
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  document.body.innerHTML =
    '<main class="desk"><div class="canvas"><article class="paper" data-page-id="cover" data-part="0" style="font-family:Cinzel"></article><article class="paper" data-page-id="toc" data-part="0" style="font-family:Spectral"></article><article class="paper" data-page-id="toc" data-part="1" style="font-family:Lora"></article></div></main>';
});
describe("shared visual export capture", () => {
  it("embeds fonts from every page plus uploaded fonts, and uses 300 DPI", async () => {
    const doc = createAdventure(true);
    doc.fonts = [
      { name: "Custom Scribe", data: "data:font/woff2;base64,AA==" },
    ];
    await capturePages(doc, () => {});
    const stage = vi.mocked(getFontEmbedCSS).mock.calls[0][0];
    expect(stage.querySelectorAll(".paper")).toHaveLength(3);
    const options = vi.mocked(toPng).mock.calls[0][1]!;
    expect(options.pixelRatio).toBe(300 / 96);
    expect(options.fontEmbedCSS).toContain("every page font");
    expect(options.fontEmbedCSS).toContain('font-family:"Custom Scribe"');
    expect(document.querySelector(".export-stage")).toBeNull();
  });
  it("exports only the selected physical continuation page and never reuses stale captures", async () => {
    const doc = createAdventure(true);
    const choices = exportPageChoices(doc);
    expect(choices).toHaveLength(3);
    expect(choices[2]).toMatchObject({ key: "toc:1", pageId: "toc", part: 1 });
    const pages = await capturePages(doc, () => {}, choices[2]);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ pageId: "toc", part: 1 });
    await capturePages(doc, () => {}, choices[2]);
    expect(toPng).toHaveBeenCalledTimes(2);
  });
  it("cleans up capture DOM after rendering fails", async () => {
    vi.mocked(toPng).mockRejectedValueOnce(new Error("rendering failed"));
    await expect(capturePages(createAdventure(true), () => {})).rejects.toThrow(
      "rendering failed",
    );
    expect(document.querySelector(".export-stage")).toBeNull();
  });
});
