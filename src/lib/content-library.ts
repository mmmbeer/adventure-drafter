import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
import type { LibraryEntry } from "./authoring-types";
import { cloneBlocks, plainText } from "./anchors";
export const libraryCategories: LibraryEntry["category"][] = [
  "NPC",
  "Creature",
  "Location",
  "Item",
  "Encounter",
  "Boxed text",
  "Other",
];
function sourceIdentities(nodes: JSONContent[]): JSONContent[] {
  const visit = (node: JSONContent): JSONContent => ({
    ...node,
    ...(node.attrs?.refId
      ? {
          attrs: {
            ...node.attrs,
            sourceRefId: node.attrs.sourceRefId || node.attrs.refId,
          },
        }
      : {}),
    ...(node.content ? { content: node.content.map(visit) } : {}),
  });
  return nodes.map(visit);
}
export function linkedBlock(entry: LibraryEntry): JSONContent {
  return {
    type: "reusableBlock",
    attrs: {
      refId: crypto.randomUUID(),
      libraryId: entry.id,
      revision: entry.revision,
      name: entry.name,
    },
    content: cloneBlocks(sourceIdentities(entry.content)),
  };
}
export function linkedInstances(doc: Adventure, id: string) {
  const result: {
    pageId: string;
    refId: string;
    text: string;
    revision: number;
  }[] = [];
  const visit = (node: JSONContent, pageId: string) => {
    if (node.type === "reusableBlock" && node.attrs?.libraryId === id)
      result.push({
        pageId,
        refId: node.attrs.refId,
        text: plainText(node),
        revision: Number(node.attrs.revision),
      });
    node.content?.forEach((n) => visit(n, pageId));
  };
  doc.pages.forEach((p) => visit(p.content, p.id));
  return result;
}
/** Keep destination IDs for matching nodes when replacing a linked instance. */
function replacement(
  nodes: JSONContent[],
  previous: JSONContent[],
): JSONContent[] {
  const fresh = cloneBlocks(sourceIdentities(nodes));
  const previousIds = new Map<string, string>();
  const remember = (n: JSONContent) => {
    if (n.attrs?.sourceRefId && n.attrs.refId)
      previousIds.set(n.attrs.sourceRefId, n.attrs.refId);
    n.content?.forEach(remember);
  };
  previous.forEach(remember);
  const ids = new Map<string, string>();
  const match = (n: JSONContent) => {
    const oldId = previousIds.get(n.attrs?.sourceRefId);
    if (oldId && n.attrs?.refId) ids.set(n.attrs.refId, oldId);
    n.content?.forEach(match);
  };
  fresh.forEach(match);
  const patch = (node: JSONContent): JSONContent => ({
    ...node,
    ...(node.attrs
      ? {
          attrs: {
            ...node.attrs,
            ...(ids.has(node.attrs.refId)
              ? { refId: ids.get(node.attrs.refId) }
              : {}),
            ...(ids.has(node.attrs.targetId)
              ? { targetId: ids.get(node.attrs.targetId) }
              : {}),
          },
        }
      : {}),
    ...(node.content ? { content: node.content.map(patch) } : {}),
  });
  return fresh.map(patch);
}
export function publishLibraryEntry(
  doc: Adventure,
  entry: LibraryEntry,
): Adventure {
  const visit = (node: JSONContent): JSONContent => {
    if (node.type === "reusableBlock" && node.attrs?.libraryId === entry.id)
      return {
        ...node,
        attrs: { ...node.attrs, name: entry.name, revision: entry.revision },
        content: replacement(entry.content, node.content ?? []),
      };
    return node.content ? { ...node, content: node.content.map(visit) } : node;
  };
  return {
    ...doc,
    contentLibrary: [
      ...(doc.contentLibrary ?? []).filter((e) => e.id !== entry.id),
      entry,
    ],
    pages: doc.pages.map((p) => ({ ...p, content: visit(p.content) })),
  };
}
