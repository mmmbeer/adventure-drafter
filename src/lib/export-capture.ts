import type { Adventure } from "./types";
import { sizes } from "./templates";
import { cleanExportPage, renderedPapers } from "./export-layout";
import { embedExportArtwork } from "./export-assets";
import { pageText, type PdfText } from "./pdf-text-layer";

export const exportDpi = 300;
export interface CapturedPage {
  image: string;
  pageId: string;
  part: number;
  text: PdfText[];
  targets: { id: string; top: number }[];
  links: {
    href: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}
export interface ExportPageChoice {
  key: string;
  pageId: string;
  part: number;
  label: string;
}
export function exportPageChoices(doc: Adventure): ExportPageChoice[] {
  return renderedPapers().map((paper, index) => ({
    key: `${paper.dataset.pageId}:${paper.dataset.part || 0}`,
    pageId: paper.dataset.pageId!,
    part: Number(paper.dataset.part || 0),
    label: `Page ${index + 1} · ${doc.pages.find((p) => p.id === paper.dataset.pageId)?.kind || "body"}${Number(paper.dataset.part) ? " · continued" : ""}`,
  }));
}

function pageMetadata(page: HTMLElement, width: number) {
  const rect = page.getBoundingClientRect();
  const scale = width / rect.width;
  return {
    pageId: page.dataset.pageId!,
    part: Number(page.dataset.part || 0),
    text: pageText(page, width),
    targets: [...page.querySelectorAll<HTMLElement>("[data-ref-id]")].map(
      (el) => ({
        id: `ref-${el.dataset.refId}`,
        top: Math.max(0, (el.getBoundingClientRect().top - rect.top) * scale),
      }),
    ),
    links: [...page.querySelectorAll<HTMLAnchorElement>("a[href]")].flatMap(
      (anchor) =>
        [...anchor.getClientRects()]
          .filter((box) => box.width && box.height)
          .map((box) => ({
            href: anchor.getAttribute("href") || "",
            x: (box.x - rect.x) * scale,
            y: (box.y - rect.y) * scale,
            width: box.width * scale,
            height: box.height * scale,
          })),
    ),
  };
}

/** Every visual export uses the same 300 DPI pages, fonts and resolved values. */
export async function capturePages(
  doc: Adventure,
  progress: (s: string) => void,
  choice?: Pick<ExportPageChoice, "pageId" | "part">,
): Promise<CapturedPage[]> {
  await document.fonts.ready;
  const { toPng, getFontEmbedCSS } = await import("html-to-image");
  const papers = renderedPapers().filter(
    (p) =>
      !choice ||
      (p.dataset.pageId === choice.pageId &&
        Number(p.dataset.part || 0) === choice.part),
  );
  if (!papers.length)
    throw new Error("This page is no longer available. Choose a page again.");
  const stage = document.createElement("div");
  stage.className = "export-stage";
  stage.style.cssText =
    "position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none;zoom:1";
  const pages = papers.map(cleanExportPage);
  stage.append(...pages);
  document.body.append(stage);
  try {
    progress("Embedding fonts and artwork…");
    await embedExportArtwork(stage);
    await document.fonts.ready;
    // Collect every page's font families, not only those used on the cover.
    const fontEmbedCSS =
      (await getFontEmbedCSS(stage, { preferredFontFormat: "woff2" })) +
      doc.fonts
        .map(
          (font) =>
            `\n@font-face{font-family:${JSON.stringify(font.name)};src:url(${JSON.stringify(font.data)})}`,
        )
        .join("");
    const size = sizes[doc.settings.size];
    const captured: CapturedPage[] = [];
    for (const [index, page] of pages.entries()) {
      progress(
        `Rendering page ${index + 1} of ${pages.length} at ${exportDpi} DPI…`,
      );
      const metadata = pageMetadata(page, size.width);
      const image = await toPng(page, {
        width: size.width,
        height: size.height,
        pixelRatio: exportDpi / 96,
        fontEmbedCSS,
        skipAutoScale: true,
        style: {
          boxShadow: "none",
          outline: "none",
          margin: "0",
          transform: "none",
        },
      });
      captured.push({ image, ...metadata });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return captured;
  } finally {
    stage.remove();
  }
}
