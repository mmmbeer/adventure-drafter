import type { JSONContent } from "@tiptap/core";
import type { Adventure, Page } from "./types";
import { sizes } from "./templates";
export function nodeText(node: JSONContent): string {
  if (node.type === "hardBreak") return "\n";
  return (
    node.text ??
    (node.content ?? [])
      .map(nodeText)
      .join(["paragraph", "heading"].includes(node.type ?? "") ? "" : "\n")
  );
}
export function generatedCapacity(doc: Adventure) {
  return Math.max(
    6,
    Math.floor(
      (sizes[doc.settings.size].height - 2 * doc.settings.margin - 110) / 42,
    ),
  );
}
export function sheetCount(doc: Adventure, p: Page) {
  const count =
    p.kind === "toc"
      ? doc.pages
          .flatMap((p) => (p.kind === "body" ? (p.content.content ?? []) : []))
          .filter(
            (n) =>
              n.type === "heading" &&
              Number(n.attrs?.level ?? 1) <= doc.settings.tocDepth,
          ).length
      : p.kind === "index"
        ? new Set(doc.indexTerms.map((t) => t.trim()).filter(Boolean)).size
        : 0;
  return Math.max(1, Math.ceil(count / generatedCapacity(doc)));
}
export function pageNumber(doc: Adventure, index: number) {
  return (
    doc.settings.pageStart +
    doc.pages
      .slice(0, index)
      .reduce((total, p) => total + sheetCount(doc, p), 0)
  );
}
export function physicalPageCount(doc: Adventure) {
  return doc.pages.reduce((total, p) => total + sheetCount(doc, p), 0);
}
export function entries(doc: Adventure) {
  return doc.pages.flatMap((p, i) =>
    (p.kind === "body" ? (p.content.content ?? []) : []).flatMap((n, j) =>
      n.type === "heading"
        ? [
            {
              title: nodeText(n),
              level: Number(n.attrs?.level ?? 1),
              page: pageNumber(doc, i),
              pageId: p.id,
              target: `${p.id}-heading-${j}`,
            },
          ]
        : [],
    ),
  );
}
export function keywordIndex(doc: Adventure) {
  return [...new Set(doc.indexTerms.map((t) => t.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((term) => ({
      term,
      pages: doc.pages.flatMap((p, i) =>
        p.kind === "body" &&
        nodeText(p.content)
          .toLocaleLowerCase()
          .includes(term.toLocaleLowerCase())
          ? [pageNumber(doc, i)]
          : [],
      ),
    }));
}
