import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
import { pageNumber } from "./references";
import { plainText } from "./anchors";
export interface ReferenceTarget {
  id: string;
  title: string;
  kind: string;
  pageId: string;
  page: number;
  level?: number;
}
export function referenceTargets(doc: Adventure): ReferenceTarget[] {
  const targets: ReferenceTarget[] = [];
  doc.pages.forEach((page, index) => {
    if (!["body", "title"].includes(page.kind)) return;
    const visit = (node: JSONContent) => {
      if (node.attrs?.refId) {
        const title =
          node.attrs.referenceLabel ||
          (node.type === "image"
            ? node.attrs.alt
            : plainText(
                node.type === "heading" ? node : (node.content?.[0] ?? node),
              ));
        targets.push({
          id: node.attrs.refId,
          title: String(title || `Untitled ${node.type}`).slice(0, 180),
          kind: node.attrs.kind || node.type,
          pageId: page.id,
          page: pageNumber(doc, index),
          level: node.type === "heading" ? Number(node.attrs.level) : undefined,
        });
      }
      node.content?.forEach(visit);
    };
    visit(page.content);
  });
  return targets;
}
export function referenceValue(doc: Adventure, attrs: Record<string, unknown>) {
  const target = referenceTargets(doc).find((t) => t.id === attrs.targetId);
  if (!target)
    return `[Missing reference: ${attrs.fallback || "deleted target"}]`;
  if (attrs.format === "page") return String(target.page);
  if (attrs.format === "title") return target.title;
  return `${target.title}, page ${target.page}`;
}
export function missingReferences(doc: Adventure) {
  const ids = new Set(referenceTargets(doc).map((t) => t.id));
  const missing: { pageId: string; label: string }[] = [];
  const visit = (n: JSONContent, pageId: string) => {
    if (n.type === "crossReference" && !ids.has(n.attrs?.targetId))
      missing.push({ pageId, label: n.attrs?.fallback || "Deleted target" });
    n.content?.forEach((c) => visit(c, pageId));
  };
  doc.pages.forEach((p) => visit(p.content, p.id));
  return missing;
}
export function goToReference(id: string) {
  const target = document.getElementById(`ref-${id}`);
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
}
