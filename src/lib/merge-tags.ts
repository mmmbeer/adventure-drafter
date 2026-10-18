import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
import { physicalPageCount } from "./references";
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
    case "pages": return String(physicalPageCount(doc));
    case "footer": return doc.settings.footer || doc.author;
    default: return `{${name}}`;
  }
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

export function interpolateMergeTags(value: string, doc: Adventure, page: number): string {
  return value.replace(/\{(title|subtitle|author|page|pages|footer)\}/g,
    (_, name: string) => mergeValue(doc, name, page));
}
