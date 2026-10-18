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

/**
 * Previous versions of the typing rule replaced only the capture group.
 * They persisted literal "{author}" + the merge node + "}}" together.
 * Repair only that exact fingerprint so intentional braces remain untouched.
 */
export function repairLegacyMergeTagArtifacts(node: JSONContent): JSONContent {
  if (!node.content?.length) return node;
  const children = node.content.map(repairLegacyMergeTagArtifacts);
  const fixed: JSONContent[] = [];
  for (let i = 0; i < children.length; i++) {
    const current = children[i];
    const before = fixed.at(-1);
    const after = children[i + 1];
    const name = current.attrs?.name;
    const token = `{${name}}`;
    if (current.type === "mergeTag" && validMergeTag(name) &&
        before?.type === "text" && before.text?.endsWith(token) &&
        after?.type === "text" && after.text?.startsWith("}}")) {
      const prefix = before.text.slice(0, -token.length);
      if (prefix) fixed[fixed.length - 1] = { ...before, text: prefix };
      else fixed.pop();
      fixed.push(current);
      const suffix = after.text.slice(2);
      if (suffix) children[i + 1] = { ...after, text: suffix };
      else i++;
    } else fixed.push(current);
  }
  return { ...node, content: fixed };
}

/**
 * Rehydrate raw merge tokens in documents created before inline fields
 * were supported. Only recognized tokens in ordinary text become nodes.
 * Existing merge nodes and literal code examples are left unchanged.
 */
export function hydrateMergeTags(node: JSONContent): JSONContent {
  if (!node.content?.length || node.type === "codeBlock") return node;
  const token = /\{(title|subtitle|author|page|pages|footer)\}/g;
  const content = node.content.flatMap((part): JSONContent[] => {
    if (part.type !== "text" || !part.text ||
        part.marks?.some((mark) => mark.type === "code")) {
      return [hydrateMergeTags(part)];
    }
    const replacement: JSONContent[] = [];
    let start = 0;
    for (const match of part.text.matchAll(token)) {
      const at = match.index ?? 0;
      if (at > start) replacement.push({ ...part, text: part.text.slice(start, at) });
      replacement.push({ ...mergeNode(match[1] as MergeTagName), marks: part.marks });
      start = at + match[0].length;
    }
    if (!replacement.length) return [part];
    if (start < part.text.length)
      replacement.push({ ...part, text: part.text.slice(start) });
    return replacement;
  });
  return { ...node, content };
}
