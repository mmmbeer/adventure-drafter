import type { Adventure } from "./types";
import { sizes } from "./templates";
import { download, filename } from "./export";
import { capturePages } from "./export-capture";
import { addPdfFont, addTextLayer } from "./pdf-text-layer";
import { outlineEntries } from "./outline";
interface Destination {
  pageNumber: number;
  top: number;
}
export async function exportSearchablePdf(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const pages = await capturePages(doc, progress);
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
  pages.forEach((page, index) => {
    if (!destinations.has(`page-${page.pageId}`))
      destinations.set(`page-${page.pageId}`, {
        pageNumber: index + 1,
        top: 0,
      });
    page.targets.forEach((target) => {
      if (!destinations.has(target.id))
        destinations.set(target.id, { pageNumber: index + 1, top: target.top });
    });
  });
  for (const [i, page] of pages.entries()) {
    progress(
      `Adding searchable text and links · page ${i + 1} of ${pages.length}…`,
    );
    if (i) pdf.addPage([size.width, size.height]);
    pdf.addImage(
      page.image,
      "PNG",
      0,
      0,
      size.width,
      size.height,
      undefined,
      "FAST",
    );
    addTextLayer(pdf, page.text);
    for (const link of page.links) {
      const target = link.href.startsWith("#")
        ? destinations.get(link.href.slice(1))
        : undefined;
      if (!target && !/^(https?:|mailto:)/i.test(link.href)) continue;
      pdf.link(
        link.x,
        link.y,
        link.width,
        link.height,
        target ? { ...target, magFactor: "FitH" } : { url: link.href },
      );
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
  download(pdf.output("blob"), `${filename(doc)}.pdf`);
}
