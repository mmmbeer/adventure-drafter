import type { JSONContent } from "@tiptap/core";
import { AdventureTableView } from "../components/AdventureTableView";
import { DOMSerializer, type Schema } from "@tiptap/pm/model";
import { layoutFits, layoutProbe } from "./layout-measurement";
import {
  joinTables,
  splitTable,
  tableCuts,
  tableHeaderCount,
  tableLayoutKey,
} from "./table-flow";

/** Match the resizable editor's wrapper and column sizing in measurement. */
export function tableElement(node: JSONContent, schema: Schema) {
  const model = schema.nodeFromJSON(node);
  const view = new AdventureTableView(model, 25);
  DOMSerializer.fromSchema(schema).serializeFragment(
    model.content,
    {},
    view.contentDOM,
  );
  return view.dom;
}

export function fittingTablePrefix(
  probe: HTMLElement,
  table: JSONContent,
  schema: Schema,
  previous?: JSONContent,
) {
  const render = (part: JSONContent) =>
    tableElement(
      previous ? (joinTables(previous, part) ?? part) : part,
      schema,
    );
  const cuts = tableCuts(table);
  if (!cuts.length) return null;
  const headers = tableHeaderCount(table);
  // Prefer at least two body rows on each side where the table allows it.
  const balanced = cuts.filter(
    (cut) => cut - headers >= 2 && table.content!.length - cut >= 2,
  );
  const search = (options: number[]) => {
    let low = 0,
      high = options.length - 1;
    let best: [JSONContent, JSONContent] | null = null;
    const first = splitTable(table, options[0]);
    if (!first) return null;
    const minimum = render(first[0]);
    probe.append(minimum);
    const column = minimum.getBoundingClientRect().left;
    const hasRoom = layoutFits(probe);
    minimum.remove();
    if (!hasRoom) return null;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const split = splitTable(table, options[mid])!;
      const candidate = render(split[0]);
      probe.append(candidate);
      const fits =
        layoutFits(probe) &&
        Math.abs(candidate.getBoundingClientRect().left - column) < 2;
      candidate.remove();
      if (fits) {
        best = split;
        low = mid + 1;
      } else high = mid - 1;
    }
    return best;
  };
  return (balanced.length ? search(balanced) : null) ?? search(cuts);
}

export interface TableLayoutPlan {
  content: JSONContent[];
  overflow: JSONContent[];
}

/** Fill complete columns with measured row groups before spilling to a page. */
export function planTableLayout(
  dom: HTMLElement,
  nodes: JSONContent[],
  schema: Schema,
): TableLayoutPlan | null {
  if (
    !nodes.some((node) => node.type === "table") ||
    nodes.length !== dom.children.length
  )
    return null;
  const probe = layoutProbe(dom);
  if (!probe) return null;
  probe.replaceChildren();
  const content: JSONContent[] = [];
  try {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type !== "table") {
        probe.append(dom.children[i].cloneNode(true));
        if (!layoutFits(probe)) {
          // Preserve table work even when the following paragraph spills.
          if (!content.some((node) => node.type === "table")) return null;
          const overflow = nodes.slice(i);
          while (
            content.at(-1)?.type === "heading" ||
            content.at(-1)?.attrs?.keep
          )
            overflow.unshift(content.pop()!);
          return content.length ? { content, overflow } : null;
        }
        content.push(nodes[i]);
        continue;
      }
      let table = nodes[i];
      while (i + 1 < nodes.length) {
        const joined = joinTables(table, nodes[i + 1]);
        if (!joined) break;
        table = joined;
        i++;
      }
      for (;;) {
        const whole = tableElement(table, schema);
        probe.append(whole);
        const fits = layoutFits(probe);
        whole.remove();
        if (fits) {
          content.push(table);
          probe.append(whole);
          break;
        }
        const split = fittingTablePrefix(probe, table, schema);
        if (!split) {
          // An indivisible row at the top cannot be fixed by creating more pages.
          const overflow = [table, ...nodes.slice(i + 1)];
          while (
            content.at(-1)?.type === "heading" ||
            content.at(-1)?.attrs?.keep
          )
            overflow.unshift(content.pop()!);
          if (!content.length) return null;
          return { content, overflow };
        }
        content.push(split[0]);
        probe.append(tableElement(split[0], schema));
        table = split[1];
      }
    }
    return content.length === nodes.length &&
      content.every((node, i) =>
        node.type === "table"
          ? tableLayoutKey(node) === tableLayoutKey(nodes[i])
          : JSON.stringify(node) === JSON.stringify(nodes[i]),
      )
      ? null
      : { content, overflow: [] };
  } finally {
    probe.remove();
  }
}
