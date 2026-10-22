import {
  Footer,
  Header,
  Paragraph,
  PageNumber,
  TabStopType,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { pageDesign } from "./designs";
import type { Adventure } from "./types";
import { mergeValue } from "./merge-tags";

/** Preserve all editor slots, including intentional blanks, in editable Word. */
export function wordRunningText(
  doc: Adventure,
  design: ReturnType<typeof pageDesign>,
  title: boolean,
  width: number,
  artwork: ParagraphChild[] = [],
) {
  const runs = (template: string, size: number, font = "Inter") =>
    template
      .replaceAll("{chapter}", design.chapter)
      .replace(/\{(title|subtitle|author|footer)\}/g, (_, tag: string) =>
        mergeValue(doc, tag, design.number),
      )
      .split(/(\{page\}|\{pages\})/g)
      .filter(Boolean)
      .map((part) =>
        part === "{page}" || part === "{pages}"
          ? new TextRun({
              font,
              size: `${size / 2}pt`,
              color: doc.settings.theme.accent.slice(1),
              children: [
                part === "{page}" ? PageNumber.CURRENT : PageNumber.TOTAL_PAGES,
              ],
            })
          : new TextRun({
              text: part,
              font,
              size: `${size / 2}pt`,
              color: doc.settings.theme.accent.slice(1),
            }),
      );
  const text = design.templates;
  const line = (left: string, center: string, right: string, size = 13.5) =>
    new Paragraph({
      spacing: { before: 0, after: 0 },
      tabStops: [
        { type: TabStopType.CENTER, position: Math.round((width * 15) / 2) },
        { type: TabStopType.RIGHT, position: Math.round(width * 15) },
      ],
      children: [
        ...(size === 12 ? artwork : []),
        ...runs(left, size),
        new TextRun("\t"),
        ...runs(
          center,
          size === 12 ? 12 : 19.5,
          size === 12 ? "Inter" : doc.settings.theme.headingFont,
        ),
        new TextRun("\t"),
        ...runs(right, size),
      ],
    });
  return {
    headers: {
      default: new Header({
        children: [
          design.hideHeader
            ? line("", "", "", 12)
            : line(text.headerLeft, "", text.headerRight, 12),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          line(
            text.footerLeft,
            design.hideNumber || title ? "" : text.footerCenter,
            title ? "" : text.footerRight,
          ),
        ],
      }),
    },
  };
}
