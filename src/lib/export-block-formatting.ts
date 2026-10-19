import { Table, TableRow, TableCell, Paragraph, TableBorders } from "docx";
import {
  AlignmentType,
  BorderStyle,
  LevelFormat,
  ShadingType,
  type IBordersOptions,
  type IParagraphStyleOptions,
  type INumberingOptions,
} from "docx";
import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./model";
import { cleanBoxFormat } from "./box-formatting";

export function wordBox(value: unknown) {
  const box = cleanBoxFormat(value);
  let borders:
    { -readonly [K in keyof IBordersOptions]: IBordersOptions[K] } | undefined;
  if (box.edges) {
    const style = {
      solid: BorderStyle.SINGLE,
      dashed: BorderStyle.DASHED,
      dotted: BorderStyle.DOTTED,
      double: BorderStyle.DOUBLE,
    }[box.style || "solid"];
    borders = {};
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const enabled =
        box.edges === "all" || box.edges.split("-").includes(side);
      borders[side] = {
        style: enabled && box.width !== 0 ? style : BorderStyle.NIL,
        size: Math.round((box.width ?? 1) * 6),
        color: (box.color || "#823a32").slice(1),
        space: Math.round((box.padding ?? 0) * 0.75),
      };
    }
  }
  const padding =
    box.padding === undefined ? undefined : Math.round(box.padding * 15);
  return {
    borders,
    shading: box.background
      ? {
          type: ShadingType.CLEAR,
          fill:
            box.background === "transparent" ? "auto" : box.background.slice(1),
        }
      : undefined,
    margins:
      padding === undefined
        ? undefined
        : { top: padding, bottom: padding, left: padding, right: padding },
  };
}
export function wordTextStyles(doc: Adventure): IParagraphStyleOptions[] {
  const size = doc.settings.fontSize * 1.5;
  return [
    {
      id: "AdventureTitle",
      name: "Title",
      basedOn: "Normal",
      next: "Normal",
      run: {
        font: doc.settings.theme.headingFont,
        size: Math.round(size * 2.8),
        color: doc.settings.theme.accent.slice(1),
      },
      paragraph: { keepNext: true },
    },
    {
      id: "AdventureSubtitle",
      name: "Subtitle",
      basedOn: "Normal",
      next: "Normal",
      run: {
        font: doc.settings.theme.headingFont,
        size: Math.round(size * 1.5),
        color: doc.settings.theme.accent.slice(1),
      },
      paragraph: { keepNext: true },
    },
    {
      id: "AdventureCaption",
      name: "Caption",
      basedOn: "Normal",
      run: { size: Math.round(size * 0.85), italics: true },
    },
    {
      id: "AdventureCode",
      name: "Code block",
      basedOn: "Normal",
      run: { font: "JetBrains Mono", size: Math.round(size * 0.8) },
    },
  ];
}
export function wordTextStyle(node: JSONContent) {
  return node.type === "codeBlock"
    ? "AdventureCode"
    : (
        {
          title: "AdventureTitle",
          subtitle: "AdventureSubtitle",
          caption: "AdventureCaption",
        } as Record<string, string>
      )[node.attrs?.textRole];
}
export interface WordList {
  reference: string;
  level: number;
}
export function wordLists() {
  const config: INumberingOptions["config"][number][] = [];
  return {
    config,
    add(node: JSONContent, parent?: WordList): WordList {
      const reference = `adventure-list-${config.length}`;
      const level = Math.min((parent?.level ?? -1) + 1, 8);
      const bullet = node.type === "bulletList";
      const marker = node.attrs?.listStyleType;
      const format = bullet
        ? LevelFormat.BULLET
        : {
            "lower-alpha": LevelFormat.LOWER_LETTER,
            "upper-alpha": LevelFormat.UPPER_LETTER,
            "lower-roman": LevelFormat.LOWER_ROMAN,
            "upper-roman": LevelFormat.UPPER_ROMAN,
          }[marker as string] || LevelFormat.DECIMAL;
      config.push({
        reference,
        levels: Array.from({ length: 9 }, (_, i) => ({
          level: i,
          format,
          start: bullet
            ? 1
            : Math.max(1, Math.min(9999, Number(node.attrs?.start) || 1)),
          text: bullet
            ? { circle: "○", square: "▪" }[marker as string] || "•"
            : `%${i + 1}.`,
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 360 * (i + 1), hanging: 180 } },
          },
        })),
      });
      return { reference, level };
    },
  };
}

export function wordContainer(
  children: (Paragraph | Table)[],
  value: unknown,
  defaults = {},
) {
  const overrides = Object.fromEntries(
    Object.entries(wordBox(value)).filter(([, item]) => item !== undefined),
  );
  return new Table({
    width: { size: 100, type: "pct" },
    borders: TableBorders.NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: children.length ? children : [new Paragraph("")],
            ...defaults,
            ...overrides,
          }),
        ],
      }),
    ],
  });
}
