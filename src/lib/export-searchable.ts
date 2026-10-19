import type { Adventure } from "./types";
import { sizes } from "./templates";
import { capturePages, download, filename } from "./export";
import { addPdfFont, addTextLayer, pageText } from "./pdf-text-layer";
import { outlineEntries } from "./outline";
interface Destination {
  pageNumber: number;
  top: number;
}
export async function exportSearchablePdf(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const images = await capturePages(doc, progress);
  const papers = [...document.querySelectorAll<HTMLElement>(".canvas .paper")];
  if (images.length !== papers.length)
    throw new Error(
      "Page layout changed during export. Please export again after reflow finishes.",
    );
  const { jsPDF } = await import("jspdf");
  const size = sizes[doc.settings.size];
  const pdf = new jsPDF({
    unit: "px",
    format: [size.width, size.height],
    hotfixes: ["px_scaling"],
    compress: true,
    putOnlyUsedFonts: true,
  });
  pdf.setProperties({
    title: doc.title,
    author: doc.author,
    creator: "Adventure Drafter",
    subject: "Searchable adventure with links and bookmarks",
  });
  await addPdfFont(pdf);
  const destinations = new Map<string, Destination>();
  papers.forEach((paper, index) => {
    const rect = paper.getBoundingClientRect(),
      scale = size.width / rect.width;
    if (!destinations.has(`page-${paper.dataset.pageId}`))
      destinations.set(`page-${paper.dataset.pageId}`, {
        pageNumber: index + 1,
        top: 0,
      });
    paper
      .querySelectorAll<HTMLElement>("[data-ref-id]")
      .forEach((el) =>
        destinations.set(`ref-${el.dataset.refId}`, {
          pageNumber: index + 1,
          top: Math.max(0, (el.getBoundingClientRect().top - rect.top) * scale),
        }),
      );
  });
  for (let i = 0; i < papers.length; i++) {
    progress(
      `Adding searchable text and links · page ${i + 1} of ${papers.length}…`,
    );
    if (i) pdf.addPage([size.width, size.height]);
    pdf.addImage(
      images[i],
      "PNG",
      0,
      0,
      size.width,
      size.height,
      undefined,
      "FAST",
    );
    addTextLayer(pdf, pageText(papers[i], size.width));
    const rect = papers[i].getBoundingClientRect(),
      scale = size.width / rect.width;
    for (const anchor of papers[i].querySelectorAll<HTMLAnchorElement>(
      "a[href]",
    )) {
      if (anchor.closest(".no-print")) continue;
      const href = anchor.getAttribute("href") || "";
      const target = href.startsWith("#")
        ? destinations.get(href.slice(1))
        : undefined;
      if (!target && !/^(https?:|mailto:)/i.test(href)) continue;
      for (const box of anchor.getClientRects()) {
        if (!box.width || !box.height) continue;
        pdf.link(
          (box.x - rect.x) * scale,
          (box.y - rect.y) * scale,
          box.width * scale,
          box.height * scale,
          target ? { ...target, magFactor: "FitH" } : { url: href },
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const parents: { level: number; node: ReturnType<typeof pdf.outline.add> }[] =
    [];
  for (const entry of outlineEntries(doc)) {
    const destination = destinations.get(`ref-${entry.id}`);
    if (!destination) continue;
    while (parents.length && parents.at(-1)!.level >= entry.level)
      parents.pop();
    const node = pdf.outline.add(parents.at(-1)?.node ?? null, entry.title, {
      pageNumber: destination.pageNumber,
    });
    parents.push({ level: entry.level, node });
  }
  download(pdf.output("blob"), `${filename(doc)}-searchable.pdf`);
}
