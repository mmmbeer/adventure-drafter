import {
  Paragraph,
  TextRun,
  Table,
  ImageRun,
  ColumnBreak,
  ExternalHyperlink,
  InternalHyperlink,
  Bookmark,
  AlignmentType,
  BorderStyle,
  TabStopType,
  LeaderType,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  type ParagraphChild,
} from "docx";
import type { Adventure } from "./types";
import {
  wordLists,
  wordContainer,
  type WordList,
} from "./export-block-formatting";
import { wordDivider, pngImage } from "./export-images";
import { wordTable } from "./word-table";
import {
  wordSize,
  twips,
  wordFont,
  wordColor,
  wordBorders,
  wordFill,
} from "./word-format";

/** Read resolved styles so direct formatting, named styles and nested type sizes agree. */
export function wordRuns(
  element: HTMLElement,
  paper: string,
): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent) continue;
      const css = getComputedStyle(element);
      children.push(
        new TextRun({
          text: node.textContent,
          font: wordFont(css.fontFamily),
          size: wordSize(css.fontSize),
          bold: css.fontWeight === "bold" || Number(css.fontWeight) >= 600,
          italics: css.fontStyle === "italic",
          color: wordColor(css.color, paper),
          underline:
            element.closest("u") || css.textDecorationLine.includes("underline")
              ? {}
              : undefined,
          strike:
            !!element.closest("s,del") ||
            css.textDecorationLine.includes("line-through"),
          superScript: !!element.closest("sup"),
          subScript: !!element.closest("sub"),
          shading: wordFill(css, paper),
          characterSpacing: Number.isFinite(parseFloat(css.letterSpacing))
            ? twips(css.letterSpacing)
            : undefined,
        }),
      );
    } else if (node instanceof HTMLElement) {
      const css = getComputedStyle(node);
      if (css.display === "none" || css.visibility === "hidden") continue;
      if (node.tagName === "BR") children.push(new TextRun({ break: 1 }));
      else if (node.tagName === "A") {
        const content = wordRuns(node, paper);
        const href = node.getAttribute("href") || "";
        if (/^(https?:|mailto:)/i.test(href))
          children.push(
            new ExternalHyperlink({ link: href, children: content }),
          );
        else if (href.startsWith("#"))
          children.push(
            new InternalHyperlink({
              anchor: wordBookmark(href.slice(1)),
              children: content,
            }),
          );
        else children.push(...content);
      } else children.push(...wordRuns(node, paper));
    }
  }
  return children;
}
/** Word limits bookmark names to 40 characters, including generated UUID targets. */
export function wordBookmark(id: string) {
  let hash = 2166136261;
  for (const char of id)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `b_${id.replace(/[^a-z0-9]/gi, "").slice(0, 28)}_${hash.toString(16).padStart(8, "0")}`;
}

export function wordContent(
  doc: Adventure,
  paper: string,
  prefix = "",
  seen = new Set<string>(),
) {
  const lists = wordLists(prefix);
  function bookmark(element: HTMLElement, children: ParagraphChild[]) {
    const id = element.id;
    if (!id || seen.has(id)) return children;
    seen.add(id);
    return [new Bookmark({ id: wordBookmark(id), children })];
  }
  async function convert(
    element: HTMLElement,
    width: number,
    list?: WordList,
  ): Promise<(Paragraph | Table)[]> {
    const css = getComputedStyle(element);
    if (css.display === "none" || css.visibility === "hidden") return [];
    const tag = element.tagName;
    if (element.hasAttribute("data-column-break"))
      return [
        new Paragraph({
          children: [new ColumnBreak()],
          spacing: { before: 0, after: 0 },
        }),
      ];
    if (tag === "HR") {
      return [
        await wordDivider(
          { attrs: { divider: element.dataset.divider } },
          doc.settings.theme,
          width,
          {
            style: BorderStyle.SINGLE,
            size: 6,
            color: wordColor(css.borderTopColor, paper),
          },
        ),
      ];
    }
    if (tag === "TABLE")
      return [
        await wordTable(element as HTMLTableElement, width, paper, convert),
      ];
    if (tag === "IMG" || element.matches("figure.image-node")) {
      const image = (
        tag === "IMG" ? element : element.querySelector("img")
      ) as HTMLImageElement;
      if (!image) return [];
      const data = await pngImage(image.src);
      const rendered = image.getBoundingClientRect();
      const imageWidth = Math.min(width, rendered.width || width);
      const height = (imageWidth * data.height) / data.width;
      const flow = element.dataset.flow || image.dataset.flow;
      return [
        new Paragraph({
          alignment:
            flow === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER,
          spacing: {
            before: twips(css.marginTop),
            after: twips(css.marginBottom),
          },
          children: bookmark(element, [
            new ImageRun({
              type: "png",
              data: data.data,
              transformation: { width: imageWidth, height },
              altText: {
                name: image.alt || "Adventure illustration",
                title: image.alt,
                description: image.alt,
              },
              floating:
                flow === "left" || flow === "right"
                  ? {
                      horizontalPosition: {
                        relative: HorizontalPositionRelativeFrom.COLUMN,
                        align:
                          flow === "right"
                            ? HorizontalPositionAlign.RIGHT
                            : HorizontalPositionAlign.LEFT,
                      },
                      verticalPosition: {
                        relative: VerticalPositionRelativeFrom.PARAGRAPH,
                        offset: 0,
                      },
                      wrap: { type: TextWrappingType.SQUARE },
                      margins: {
                        left: 7 * 9525,
                        right: 7 * 9525,
                        bottom: 8 * 9525,
                      },
                    }
                  : undefined,
            }),
          ]),
        }),
      ];
    }
    if (tag === "UL" || tag === "OL") {
      const current = lists.add(
        {
          type: tag === "OL" ? "orderedList" : "bulletList",
          attrs: {
            start: element.getAttribute("start"),
            listStyleType: css.listStyleType,
          },
        },
        list,
      );
      return (
        await Promise.all(
          [...element.children].map((item) =>
            convert(item as HTMLElement, width, current),
          ),
        )
      ).flat();
    }
    if (tag === "LI") {
      const result: (Paragraph | Table)[] = [];
      for (const [index, child] of [...element.children].entries())
        result.push(
          ...(await convert(
            child as HTMLElement,
            width,
            index === 0 || child.matches("ul,ol") ? list : undefined,
          )),
        );
      if (!element.children.length)
        result.push(paragraph(element, width, list));
      return result;
    }
    if (
      /^(P|H[1-6]|PRE)$/.test(tag) ||
      element.hasAttribute("data-level") ||
      element.matches(".toc-entry")
    )
      return [paragraph(element, width, list)];
    const boxWidth = Math.min(
      width,
      element.getBoundingClientRect().width || width,
    );
    const children = (
      await Promise.all(
        [...element.children].map((child) =>
          convert(
            child as HTMLElement,
            boxWidth -
              (parseFloat(css.paddingLeft) || 0) -
              (parseFloat(css.paddingRight) || 0),
            list,
          ),
        ),
      )
    ).flat();
    if (
      tag === "ASIDE" ||
      tag === "BLOCKQUOTE" ||
      element.hasAttribute("data-statblock")
    ) {
      const box = wordContainer(
        children,
        {},
        {
          borders: wordBorders(css, paper),
          shading: wordFill(css, paper),
          margins: {
            top: twips(css.paddingTop),
            bottom: twips(css.paddingBottom),
            left: twips(css.paddingLeft),
            right: twips(css.paddingRight),
          },
        },
        boxWidth,
      );
      if (element.id && !seen.has(element.id))
        return [
          new Paragraph({
            children: bookmark(element, []),
            spacing: { before: 0, after: 0, line: 1 },
            keepNext: true,
          }),
          box,
        ];
      return [box];
    }
    if (element.id && !seen.has(element.id)) {
      children.unshift(
        new Paragraph({
          children: bookmark(element, []),
          spacing: { before: 0, after: 0, line: 1 },
          keepNext: true,
        }),
      );
    }
    return children;
  }
  function paragraph(element: HTMLElement, width: number, list?: WordList) {
    const css = getComputedStyle(element);
    const level = Number(element.dataset.level || element.tagName.slice(1));
    const heading =
      /^H[1-6]$/.test(element.tagName) || element.hasAttribute("data-level");
    const body = wordRuns(element, paper);
    // Dotted TOC leaders are purely decorative in the editor's flex row.
    if (element.matches(".toc-entry")) {
      const title = element.querySelector("span");
      const number = element.querySelector("b");
      if (title && number)
        body.splice(
          0,
          body.length,
          ...wordRuns(title, paper),
          new TextRun("\t"),
          ...wordRuns(number, paper),
        );
    }
    return new Paragraph({
      children: bookmark(
        element,
        element.tagName === "A" && element.getAttribute("href")?.startsWith("#")
          ? [
              new InternalHyperlink({
                anchor: wordBookmark(element.getAttribute("href")!.slice(1)),
                children: body,
              }),
            ]
          : body,
      ),
      tabStops: element.matches(".toc-entry")
        ? [
            {
              type: TabStopType.RIGHT,
              position: twips(width),
              leader: LeaderType.DOT,
            },
          ]
        : undefined,
      style:
        element.closest<HTMLElement>("[data-style-id]")?.dataset.styleId ||
        (
          {
            title: "AdventureTitle",
            subtitle: "AdventureSubtitle",
            caption: "AdventureCaption",
          } as Record<string, string>
        )[element.dataset.textRole || ""] ||
        (element.tagName === "PRE"
          ? "AdventureCode"
          : heading
            ? `AdventureHeading${level}`
            : undefined),
      outlineLevel: heading ? Math.max(0, level - 1) : undefined,
      alignment:
        (
          {
            center: AlignmentType.CENTER,
            right: AlignmentType.RIGHT,
            justify: AlignmentType.JUSTIFIED,
          } as Record<
            string,
            (typeof AlignmentType)[keyof typeof AlignmentType]
          >
        )[css.textAlign] || AlignmentType.LEFT,
      spacing: {
        before: twips(css.marginTop),
        after: twips(css.marginBottom),
        line: Math.round(
          (parseFloat(css.lineHeight) / parseFloat(css.fontSize) ||
            doc.settings.lineHeight) * 240,
        ),
      },
      keepNext: heading || css.breakAfter === "avoid",
      keepLines: css.breakInside === "avoid",
      widowControl: true,
      border: wordBorders(css, paper),
      shading: wordFill(css, paper),
      indent: {
        left: twips(css.marginLeft) + twips(css.paddingLeft),
        right: twips(css.marginRight) + twips(css.paddingRight),
      },
      ...(list ? { numbering: list } : {}),
    });
  }
  return { convert, lists };
}
