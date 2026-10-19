import type { jsPDF } from "jspdf";
export interface PdfText {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
}
const excluded = '.no-print,button,[aria-hidden="true"],.column-resize-handle';
/** Read text from the rendered layout, so columns, merge values, and fonts match the page. */
export function pageText(root: HTMLElement, width: number): PdfText[] {
  const page = root.getBoundingClientRect(),
    scale = width / page.width;
  const runs: PdfText[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const parent = current.parentElement;
    if (!parent || parent.closest(excluded)) continue;
    const css = getComputedStyle(parent);
    if (
      css.visibility === "hidden" ||
      css.display === "none" ||
      !parent.getClientRects().length
    )
      continue;
    const content = current.textContent || "";
    for (const match of content.matchAll(/\S+\s*/gu)) {
      const range = document.createRange();
      range.setStart(current, match.index!);
      range.setEnd(current, match.index! + match[0].length);
      const rects = [...range.getClientRects()].filter(
        (r) => r.width > 0 && r.height > 0,
      );
      if (rects.length === 1) {
        const rect = rects[0];
        if (rect.bottom <= page.bottom + 1 && rect.top >= page.top - 1)
          runs.push({
            text: match[0].replace(/\s+/g, " "),
            x: (rect.x - page.x) * scale,
            y: (rect.y - page.y) * scale,
            width: rect.width * scale,
            size: parseFloat(css.fontSize),
          });
      } else {
        // A long word may wrap. Preserve its exact characters and line positions.
        let offset = match.index!;
        for (const char of match[0]) {
          range.setStart(current, offset);
          offset += char.length;
          range.setEnd(current, offset);
          const rect = range.getBoundingClientRect();
          if (rect.width && rect.height && rect.bottom <= page.bottom + 1)
            runs.push({
              text: char,
              x: (rect.x - page.x) * scale,
              y: (rect.y - page.y) * scale,
              width: rect.width * scale,
              size: parseFloat(css.fontSize),
            });
        }
      }
    }
  }
  return runs;
}
export async function addPdfFont(pdf: jsPDF) {
  const response = await fetch("/fonts/pdf-text.ttf");
  if (!response.ok)
    throw new Error(
      "The searchable PDF font could not be loaded. Try again when the app is available.",
    );
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192)
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  pdf.addFileToVFS("pdf-text.ttf", btoa(binary));
  pdf.addFont("pdf-text.ttf", "SearchText", "normal");
  pdf.setFont("SearchText");
}
export function addTextLayer(pdf: jsPDF, runs: PdfText[]) {
  pdf.setFont("SearchText", "normal");
  for (const run of runs) {
    if (!run.text.trim()) continue;
    pdf.setFontSize(run.size * 0.75);
    const natural = pdf.getTextWidth(run.text);
    pdf.text(run.text, run.x, run.y, {
      baseline: "top",
      renderingMode: "invisible",
      horizontalScale: natural ? run.width / natural : 1,
    });
  }
}
