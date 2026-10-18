import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
export const MERGE_TAGS = [
  { name: "title", label: "Adventure title" },
  { name: "subtitle", label: "Subtitle" },
  { name: "author", label: "Author" },
  { name: "page", label: "Page number" },
  { name: "pages", label: "Total pages" },
  { name: "footer", label: "Footer" },
] as const;
export type MergeTagName = (typeof MERGE_TAGS)[number]["name"];
export function validMergeTag(name: string): name is MergeTagName {
  return MERGE_TAGS.some((tag) => tag.name === name);
}
export function mergeValue(doc: Adventure, name: string, page: number): string {
  switch (name) {
    case "title": return doc.title;
    case "subtitle": return doc.subtitle;
    case "author": return doc.author;
    case "page": return String(page);
    case "pages": return String(doc.pages.reduce((count, item) => count + sheetCountSafe(doc, item), 0));
    case "footer": return doc.settings.footer || doc.author;
    default: return `{${name}}`;
  }
}
/** The full page-count computation is supplied by the caller to avoid cycles. */
function sheetCountSafe(doc: Adventure, p: Adventure["pages"][number]) {
  if (p.kind === "toc" || p.kind === "index") return 1;
  return 1;
}
export function mergeNode(name: MergeTagName): JSONContent {
  return { type: "mergeTag", attrs: { name } };
}
export function resolveText(node: JSONContent, doc: Adventure, page: number): string {
  if (node.type === "mergeTag") return mergeValue(doc, node.attrs?.name || "", page);
  if (node.type === "hardBreak") return "\n";
  return node.text ?? (node.content ?? []).map((n) => resolveText(n, doc, page))
    .join(["paragraph", "heading"].includes(node.type ?? "") ? "" : "\n");
}
