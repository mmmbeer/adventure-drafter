import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
export const anchorTypes = [
  "heading",
  "callout",
  "statBlock",
  "table",
  "image",
  "reusableBlock",
];
export const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
/** Preserve existing identities. Repair only missing or duplicated anchors. */
export function identifyNodes(
  node: JSONContent,
  seen = new Set<string>(),
): JSONContent {
  let result = node;
  if (anchorTypes.includes(node.type ?? "")) {
    let id = node.attrs?.refId;
    if (!validId(id) || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    if (id !== node.attrs?.refId)
      result = { ...node, attrs: { ...node.attrs, refId: id } };
  }
  if (node.content) {
    const children = node.content.map((child) => identifyNodes(child, seen));
    if (children.some((child, i) => child !== node.content![i]))
      result = { ...result, content: children };
  }
  return result;
}
export function identifyDocument(doc: Adventure): Adventure {
  const seen = new Set<string>();
  return {
    ...doc,
    pages: doc.pages.map((p) => {
      const content = identifyNodes(p.content, seen);
      return content === p.content ? p : { ...p, content };
    }),
  };
}
/** Copies get new identities, with references inside the copy pointing at its own targets. */
export function cloneBlocks(nodes: JSONContent[]): JSONContent[] {
  const ids = new Map<string, string>();
  const visit = (n: JSONContent) => {
    if (validId(n.attrs?.refId)) ids.set(n.attrs!.refId, crypto.randomUUID());
    n.content?.forEach(visit);
  };
  nodes.forEach(visit);
  const clone = (n: JSONContent): JSONContent => {
    const attrs = { ...n.attrs };
    if (attrs.refId) attrs.refId = ids.get(attrs.refId);
    if (attrs.targetId && ids.has(attrs.targetId))
      attrs.targetId = ids.get(attrs.targetId);
    if (attrs.flowGroup) delete attrs.flowGroup;
    return {
      ...n,
      ...(n.attrs ? { attrs } : {}),
      ...(n.content ? { content: n.content.map(clone) } : {}),
    };
  };
  return nodes.map(clone);
}
export function plainText(node: JSONContent): string {
  return (
    node.text ??
    (node.content ?? [])
      .map(plainText)
      .join(["paragraph", "heading"].includes(node.type ?? "") ? "" : " ")
  );
}
