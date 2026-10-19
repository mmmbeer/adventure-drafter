import { Extension, type Editor } from "@tiptap/core";
import type { CSSProperties } from "react";

export const borderEdges = [
  "all",
  "top",
  "bottom",
  "left",
  "right",
  "top-bottom",
  "none",
] as const;
export const borderStyles = ["solid", "dashed", "dotted", "double"] as const;
export interface BoxFormat {
  edges?: (typeof borderEdges)[number];
  style?: (typeof borderStyles)[number];
  width?: number;
  color?: string;
  background?: string;
  padding?: number;
}
export const boxTypes = [
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "callout",
  "statBlock",
  "table",
  "tableCell",
  "tableHeader",
];
const isColor = (v: unknown): v is string =>
  typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v);
export function cleanBoxFormat(value: unknown): BoxFormat {
  if (!value || typeof value !== "object") return {};
  const v = value as BoxFormat;
  const box: BoxFormat = {};
  if (borderEdges.includes(v.edges!)) box.edges = v.edges;
  if (borderStyles.includes(v.style!)) box.style = v.style;
  if (isColor(v.color)) box.color = v.color;
  if (v.background === "transparent" || isColor(v.background))
    box.background = v.background;
  if (typeof v.width === "number" && Number.isFinite(v.width))
    box.width = Math.min(12, Math.max(0, v.width));
  if (typeof v.padding === "number" && Number.isFinite(v.padding))
    box.padding = Math.min(60, Math.max(0, v.padding));
  return box;
}
export function boxCss(value: unknown): CSSProperties {
  const box = cleanBoxFormat(value);
  const css: CSSProperties = {};
  if (box.edges) {
    const line = `${box.width ?? 1}px ${box.style ?? "solid"} ${box.color ?? "#823a32"}`;
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const enabled =
        box.edges === "all" ||
        box.edges.split("-").includes(side.toLowerCase());
      css[`border${side}`] = enabled ? line : "0px solid transparent";
    }
  }
  if (box.background) css.backgroundColor = box.background;
  if (box.padding !== undefined) css.padding = `${box.padding}px`;
  return css;
}
export function boxHtml(value: unknown) {
  const box = cleanBoxFormat(value);
  if (!Object.keys(box).length) return {};
  return {
    "data-box-format": JSON.stringify(box),
    style: Object.entries(boxCss(box))
      .map(
        ([key, v]) =>
          `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`,
      )
      .join(";"),
  };
}
export function updateBoxFormat(
  editor: Editor,
  target: string,
  patch: Partial<BoxFormat> | null,
) {
  const types =
    target === "cells"
      ? ["tableCell", "tableHeader"]
      : target === "text"
        ? ["paragraph", "heading", "codeBlock"]
        : [target];
  return editor
    .chain()
    .command(({ tr }) => {
      const visited = new Set<number>();
      for (const { $from, $to } of tr.selection.ranges)
        tr.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
          if (!types.includes(node.type.name) || visited.has(pos)) return;
          visited.add(pos);
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            boxFormat:
              patch === null
                ? null
                : cleanBoxFormat({ ...node.attrs.boxFormat, ...patch }),
          });
        });
      // Node selections and cursors are both covered by nodesBetween, including
      // their ancestors. Table cell selections include every selected cell.
      return true;
    })
    .run();
}
export const BoxFormatting = Extension.create({
  name: "boxFormatting",
  addGlobalAttributes() {
    return [
      {
        types: boxTypes,
        attributes: {
          boxFormat: {
            default: null,
            parseHTML: (e) => {
              try {
                return e.dataset.boxFormat
                  ? cleanBoxFormat(JSON.parse(e.dataset.boxFormat))
                  : null;
              } catch {
                return null;
              }
            },
            renderHTML: (a) => boxHtml(a.boxFormat),
          },
        },
      },
    ];
  },
});
