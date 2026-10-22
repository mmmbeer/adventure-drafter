import type { Adventure } from "./types";
import {
  capturePages,
  exportDpi,
  type ExportPageChoice,
} from "./export-capture";
import { download, filename } from "./export";
import { pngDensity } from "./png-density";
import { pageNumber } from "./references";

export async function exportPageImage(
  doc: Adventure,
  progress: (s: string) => void,
  choice: Pick<ExportPageChoice, "pageId" | "part">,
) {
  const [page] = await capturePages(doc, progress, choice);
  const index = doc.pages.findIndex((p) => p.id === page.pageId);
  const number = pageNumber(doc, index) + page.part;
  const response = await fetch(page.image);
  const bytes = pngDensity(
    new Uint8Array(await response.arrayBuffer()),
    exportDpi,
  );
  download(
    new Blob([bytes as BlobPart], { type: "image/png" }),
    `${filename(doc)}-page-${number}.png`,
  );
}
