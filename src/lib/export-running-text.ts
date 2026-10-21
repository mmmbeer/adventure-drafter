import {
  Footer,
  Header,
  Paragraph,
  PageNumber,
  TabStopType,
  TextRun,
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
) {
  const runs = (template: string) =>
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
              children: [
                part === "{page}" ? PageNumber.CURRENT : PageNumber.TOTAL_PAGES,
              ],
            })
          : new TextRun(part),
      );
  const text = design.templates;
  const line = (left: string, center: string, right: string) =>
    new Paragraph({
      style: "RunningText",
      tabStops: [
        { type: TabStopType.CENTER, position: Math.round((width * 15) / 2) },
        { type: TabStopType.RIGHT, position: Math.round(width * 15) },
      ],
      children: [
        ...runs(left),
        new TextRun("\t"),
        ...runs(center),
        new TextRun("\t"),
        ...runs(right),
      ],
    });
  return {
    headers: {
      default: new Header({
        children: [
          design.hideHeader
            ? line("", "", "")
            : line(text.headerLeft, "", text.headerRight),
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
