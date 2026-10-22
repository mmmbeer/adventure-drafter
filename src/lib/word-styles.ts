import type { Adventure } from "./types";
import type { IStylesOptions } from "docx";
import { wordTextStyles } from "./export-block-formatting";
import { wordColor, wordSize, twips } from "./word-format";

export function wordStyles(doc: Adventure): IStylesOptions {
  const theme = doc.settings.theme;
  return {
    default: {
      document: {
        run: {
          font: theme.bodyFont,
          size: wordSize(doc.settings.fontSize),
          color: wordColor(theme.ink),
        },
      },
    },
    paragraphStyles: [
      ...wordTextStyles(doc),
      ...(doc.namedStyles ?? []).map((style) => ({
        id: style.id,
        name: style.name,
        basedOn: "Normal",
        quickFormat: true,
        run: {
          font: style.fontFamily,
          size: wordSize(style.fontSize),
          color: wordColor(style.color),
          bold: style.bold,
          italics: style.italic,
        },
        paragraph: {
          spacing: {
            before: twips(style.spaceBefore),
            after: twips(style.spaceAfter),
            line: Math.round(style.lineHeight * 240),
          },
        },
      })),
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `AdventureHeading${i + 1}`,
        name: `Heading ${i + 1}`,
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: theme.headingFont,
          color: wordColor(theme.accent),
          size: wordSize(
            doc.settings.fontSize *
              [2.15, 1.55, 1.16, 1.07, 1, 1, 1, 1, 0.9][i],
          ),
        },
        paragraph: { outlineLevel: i, keepNext: true },
      })),
    ],
  };
}
