import type { JSONContent } from "@tiptap/core";
import { joinTables } from "./table-flow";
import { tableElement, fittingTablePrefix } from "./table-pagination";
import { layoutFits as fits, layoutProbe } from "./layout-measurement";
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
export function splitParagraph(
  node: JSONContent,
  cut: number,
): [JSONContent, JSONContent] | null {
  if (
    node.type !== "paragraph" ||
    !(node.content ?? []).every((part) => part.type === "text")
  )
    return null;
  const text = plainText(node);
  if (cut <= 0 || cut >= text.length) return null;
  const group = node.attrs?.flowGroup || crypto.randomUUID();
  const left: JSONContent[] = [],
    right: JSONContent[] = [];
  let position = 0;
  for (const part of node.content ?? []) {
    const source = part.text ?? "";
    const split = Math.max(0, Math.min(source.length, cut - position));
    if (split) left.push({ ...part, text: source.slice(0, split) });
    if (split < source.length)
      right.push({ ...part, text: source.slice(split) });
    position += source.length;
  }
  return [
    { ...node, attrs: { ...node.attrs, flowGroup: group }, content: left },
    { ...node, attrs: { ...node.attrs, flowGroup: group }, content: right },
  ];
}
export function appendFlow(
  previous: JSONContent[],
  incoming: JSONContent[],
): JSONContent[] {
  const result = [...previous];
  for (const node of incoming) {
    const last = result.at(-1);
    if (
      last?.type === "paragraph" &&
      node.type === "paragraph" &&
      last.attrs?.flowGroup &&
      last.attrs.flowGroup === node.attrs?.flowGroup
    ) {
      result[result.length - 1] = {
        ...last,
        content: [...(last.content ?? []), ...(node.content ?? [])],
      };
    } else {
      const table = last ? joinTables(last, node) : null;
      if (table) result[result.length - 1] = table;
      else result.push(node);
    }
  }
  return result;
}
/**
 * Probe a hidden sibling of the live editor. Never insert trial content into
 * ProseMirror's managed DOM or mutate either editor during measurement.
 */
export function planBackflow(
  previousDom: HTMLElement,
  nextDom: HTMLElement,
  previous: JSONContent[],
  source: JSONContent[],
  sourceId: string,
  schema: Schema,
): BackflowPlan | null {
  if (
    !source.length ||
    source.length !== nextDom.children.length ||
    !fits(previousDom)
  )
    return null;
  const probe = layoutProbe(previousDom);
  if (!probe) return null;
  try {
    if (!fits(probe)) return null;
    const pulled: JSONContent[] = [];
    let consumed = 0,
      remainder: JSONContent | undefined;
    for (let i = 0; i < Math.min(source.length, 24); i++) {
      const node = source[i];
      if (node.type === "table") {
        const previousNode = appendFlow(previous, pulled).at(-1);
        const joined = previousNode ? joinTables(previousNode, node) : null;
        const replaced = joined ? probe.lastElementChild : null;
        replaced?.remove();
        const whole = tableElement(joined ?? node, schema);
        probe.append(whole);
        if (fits(probe)) {
          pulled.push(node);
          consumed++;
          continue;
        }
        whole.remove();
        const split = fittingTablePrefix(
          probe,
          node,
          schema,
          joined ? previousNode : undefined,
        );
        if (split) {
          pulled.push(split[0]);
          remainder = split[1];
          consumed++;
        } else if (replaced) probe.append(replaced);
        break;
      }
      const trial = nextDom.children[i].cloneNode(true);
      probe.append(trial);
      if (fits(probe)) {
        pulled.push(source[i]);
        consumed++;
        continue;
      }
      trial.parentNode?.removeChild(trial);
      // The next paragraph may be longer than the available gap. Pull back
      // its largest fitting word-aligned prefix rather than leaving a void.
      if (node.type === "paragraph") {
        const text = plainText(node);
        const boundaries = [...text.matchAll(/\s+/g)]
          .map((match) => (match.index ?? 0) + match[0].length)
          .filter((position) => position > 0 && position < text.length);
        let low = 0,
          high = boundaries.length - 1,
          best: [JSONContent, JSONContent] | null = null;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const split = splitParagraph(node, boundaries[mid]);
          if (!split) break;
          const candidate = DOMSerializer.fromSchema(schema).serializeNode(
            schema.nodeFromJSON(split[0]),
          );
          probe.append(candidate);
          const okay = fits(probe);
          candidate.parentNode?.removeChild(candidate);
          if (okay) {
            best = split;
            low = mid + 1;
          } else high = mid - 1;
        }
        if (best) {
          pulled.push(best[0]);
          remainder = best[1];
          consumed++;
        }
      }
      break;
    }
    return consumed
      ? { sourceId, before: previous, source, pulled, consumed, remainder }
      : null;
  } finally {
    probe.remove();
  }
}
