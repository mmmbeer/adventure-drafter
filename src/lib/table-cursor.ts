import type { JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import type { TableLayoutPlan } from "./table-pagination";

/** Row objects survive a split, so repeated headers cannot shift a body caret. */
export function tableCursor(
  before: JSONContent[],
  plan: TableLayoutPlan,
  position: number,
  schema: Schema,
) {
  const size = (node: JSONContent) => schema.nodeFromJSON(node).nodeSize;
  let offset = 0;
  let target: JSONContent | undefined;
  let within = 0;
  for (const node of before) {
    if (position >= offset && position < offset + size(node)) {
      target = node;
      within = position - offset;
      if (node.type === "table") {
        let rowOffset = offset + 1;
        for (const row of node.content ?? []) {
          if (position >= rowOffset && position < rowOffset + size(row)) {
            target = row;
            within = position - rowOffset;
            break;
          }
          rowOffset += size(row);
        }
      }
      break;
    }
    offset += size(node);
  }
  for (const [page, nodes] of [plan.content, plan.overflow].entries()) {
    offset = 0;
    for (const node of nodes) {
      if (node === target) return { page, position: offset + within };
      if (node.type === "table") {
        let rowOffset = offset + 1;
        for (const row of node.content ?? []) {
          if (row === target) return { page, position: rowOffset + within };
          rowOffset += size(row);
        }
      }
      offset += size(node);
    }
  }
  return undefined;
}
