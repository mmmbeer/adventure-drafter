import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
import { cloneBlocks, plainText } from "./anchors";
import { pageNumber } from "./references";
interface Block {
  node: JSONContent;
  pageId: string;
  body: boolean;
}
export interface OutlineEntry {
  id: string;
  title: string;
  level: number;
  pageId: string;
  page: number;
  parent?: string;
}
function blocks(doc: Adventure): Block[] {
  return doc.pages.flatMap<Block>((p) =>
    p.kind === "body"
      ? (p.content.content ?? []).map((node) => ({
          node,
          pageId: p.id,
          body: true,
        }))
      : [{ node: p.content, pageId: p.id, body: false }],
  );
}
export function outlineEntries(doc: Adventure): OutlineEntry[] {
  const parents: OutlineEntry[] = [];
  const result: OutlineEntry[] = [];
  doc.pages.forEach((p, i) => {
    if (p.kind !== "body") {
      parents.length = 0;
      return;
    }
    (p.content.content ?? []).forEach((n) => {
      if (n.type !== "heading" || !n.attrs?.refId) return;
      const level = Number(n.attrs.level || 1);
      while (parents.length && parents.at(-1)!.level >= level) parents.pop();
      const entry = {
        id: n.attrs.refId,
        title: plainText(n),
        level,
        pageId: p.id,
        page: pageNumber(doc, i),
        parent: parents.at(-1)?.id,
      };
      result.push(entry);
      parents.push(entry);
    });
  });
  return result;
}
function section(items: Block[], id: string) {
  const start = items.findIndex(
    (b) => b.body && b.node.type === "heading" && b.node.attrs?.refId === id,
  );
  if (start < 0) throw new Error("This section is no longer available.");
  const level = Number(items[start].node.attrs?.level || 1);
  let end = start + 1;
  while (
    end < items.length &&
    items[end].body &&
    !(
      items[end].node.type === "heading" &&
      Number(items[end].node.attrs?.level || 1) <= level
    )
  )
    end++;
  return { start, end };
}
export function rearrangeSection(
  doc: Adventure,
  id: string,
  targetId?: string,
  duplicate = false,
): Adventure {
  const items = blocks(doc);
  const range = section(items, id);
  const target = targetId ? section(items, targetId).start : range.end;
  if (!duplicate && target >= range.start && target <= range.end) return doc;
  const source = items.slice(range.start, range.end);
  const destinationPage = items[target]?.body
    ? items[target].pageId
    : source.at(-1)!.pageId;
  const copied = duplicate
    ? cloneBlocks(source.map((b) => b.node))
    : source.map((b) => b.node);
  const inserted = copied.map((node) => ({
    node,
    body: true,
    pageId: destinationPage,
  }));
  items.splice(target, 0, ...inserted);
  if (!duplicate)
    items.splice(
      range.start + (target < range.start ? inserted.length : 0),
      source.length,
    );
  const byPage = new Map<string, JSONContent[]>();
  for (const item of items)
    if (item.body) {
      const nodes = byPage.get(item.pageId) ?? [];
      nodes.push(item.node);
      byPage.set(item.pageId, nodes);
    }
  return {
    ...doc,
    pages: doc.pages.map((p) =>
      p.kind !== "body"
        ? p
        : {
            ...p,
            content: {
              type: "doc",
              content: byPage.get(p.id)?.length
                ? byPage.get(p.id)
                : [{ type: "paragraph" }],
            },
          },
    ),
  };
}
export function moveSection(
  doc: Adventure,
  id: string,
  direction: -1 | 1,
): Adventure {
  const outline = outlineEntries(doc),
    current = outline.find((e) => e.id === id);
  if (!current) return doc;
  const siblings = outline.filter(
    (e) => e.parent === current.parent && e.level === current.level,
  );
  const at = siblings.findIndex((e) => e.id === id);
  if (direction === -1 && at > 0)
    return rearrangeSection(doc, id, siblings[at - 1].id);
  if (direction === 1 && at + 1 < siblings.length)
    return rearrangeSection(doc, siblings[at + 1].id, id);
  return doc;
}
