import type { JSONContent } from "@tiptap/core";
import { DOMSerializer, type Schema } from "@tiptap/pm/model";

export interface BackflowPlan {
  sourceId: string;
  before: JSONContent[];
  source: JSONContent[];
  pulled: JSONContent[];
  consumed: number;
  remainder?: JSONContent;
}
function plainText(node: JSONContent) {
  return (node.content ?? []).map((part) => part.text ?? "").join("");
}
/** Split at a character boundary without dropping spaces, marks, or inline runs. */
export function splitParagraph(node: JSONContent, cut: number): [JSONContent, JSONContent] | null {
  if (node.type !== "paragraph" || !(node.content ?? []).every((part) => part.type === "text")) return null;
  const text = plainText(node);
  if (cut <= 0 || cut >= text.length) return null;
  const group = node.attrs?.flowGroup || crypto.randomUUID();
  const left: JSONContent[] = [], right: JSONContent[] = [];
  let position = 0;
  for (const part of node.content ?? []) {
    const source = part.text ?? "";
    const split = Math.max(0, Math.min(source.length, cut - position));
    if (split) left.push({ ...part, text: source.slice(0, split) });
    if (split < source.length) right.push({ ...part, text: source.slice(split) });
    position += source.length;
  }
  return [
    { ...node, attrs: { ...node.attrs, flowGroup: group }, content: left },
    { ...node, attrs: { ...node.attrs, flowGroup: group }, content: right },
  ];
}
export function appendFlow(previous: JSONContent[], incoming: JSONContent[]): JSONContent[] {
  const result = [...previous];
  for (const node of incoming) {
    const last = result.at(-1);
    if (last?.type === "paragraph" && node.type === "paragraph" &&
        last.attrs?.flowGroup && last.attrs.flowGroup === node.attrs?.flowGroup) {
      result[result.length - 1] = { ...last, content: [...(last.content ?? []), ...(node.content ?? [])] };
    } else result.push(node);
  }
  return result;
}
function fits(page: HTMLElement) {
  return page.scrollWidth <= page.clientWidth + 2 &&
    page.scrollHeight <= page.clientHeight + 2;
}
/**
 * Probe a hidden sibling of the live editor. Never insert trial content into
 * ProseMirror's managed DOM or mutate either editor during measurement.
 */
export function planBackflow(
  previousDom: HTMLElement, nextDom: HTMLElement,
  previous: JSONContent[], source: JSONContent[], sourceId: string, schema: Schema,
): BackflowPlan | null {
  if (!source.length || source.length !== nextDom.children.length || !fits(previousDom)) return null;
  if (!previousDom.parentElement) return null;
  const probe = previousDom.cloneNode(true) as HTMLElement;
  probe.setAttribute("aria-hidden", "true");
  probe.removeAttribute("contenteditable");
  probe.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none";
  previousDom.parentElement.append(probe);
  try {
    if (!fits(probe)) return null;
    const pulled: JSONContent[] = [];
    let consumed = 0, remainder: JSONContent | undefined;
    for (let i = 0; i < Math.min(source.length, 24); i++) {
      const trial = nextDom.children[i].cloneNode(true);
      probe.append(trial);
      if (fits(probe)) {
        pulled.push(source[i]);
        consumed++;
        continue;
      }
      trial.remove();
      // The next paragraph may be longer than the available gap. Pull back
      // its largest fitting word-aligned prefix rather than leaving a void.
      const node = source[i];
      if (node.type === "paragraph") {
        const text = plainText(node);
        const boundaries = [...text.matchAll(/\s+/g)]
          .map((match) => (match.index ?? 0) + match[0].length)
          .filter((position) => position > 0 && position < text.length);
        let low = 0, high = boundaries.length - 1, best: [JSONContent, JSONContent] | null = null;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const split = splitParagraph(node, boundaries[mid]);
          if (!split) break;
          const candidate = DOMSerializer.fromSchema(schema)
            .serializeNode(schema.nodeFromJSON(split[0]));
          probe.append(candidate);
          const okay = fits(probe);
          candidate.parentNode?.removeChild(candidate);
          if (okay) { best = split; low = mid + 1; }
          else high = mid - 1;
        }
        if (best) {
          pulled.push(best[0]);
          remainder = best[1];
          consumed++;
        }
      }
      break;
    }
    return consumed ? { sourceId, before: previous, source, pulled, consumed, remainder } : null;
  } finally {
    probe.remove();
  }
}
