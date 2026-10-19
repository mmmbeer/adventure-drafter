import { pageDesign } from "./designs";
import { referenceValue } from "./cross-references";
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Packer,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  VerticalPositionRelativeFrom,
  HorizontalPositionRelativeFrom,
  TextWrappingType,
  ColumnBreak,
  ExternalHyperlink,
} from "docx";
import type { JSONContent } from "@tiptap/core";
import {
  entries,
  keywordIndex,
  sizes,
  pageNumber,
  type Adventure,
} from "./model";
import { mergeValue } from "./merge-tags";
import { download, filename } from "./export";
export async function exportEditable(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const theme = doc.settings.theme;
  const color = (s: string) => s.replace("#", "");
  const accent = color(theme.accent);
  const ink = color(theme.ink);
  const sz = sizes[doc.settings.size];
  let currentPage = doc.settings.pageStart;
  async function pngImage(url: string, opacity = 1) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Image unavailable");
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image conversion unavailable");
      context.globalAlpha = opacity;
      context.drawImage(image, 0, 0);
      return {
        data: Uint8Array.from(
          atob(canvas.toDataURL("image/png").split(",")[1]),
          (c) => c.charCodeAt(0),
        ),
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function runs(nodes: JSONContent[] = []): (TextRun | ExternalHyperlink)[] {
    return nodes.flatMap((n) => {
      if (n.type === "hardBreak") return [new TextRun({ break: 1 })];
      if (n.type === "crossReference")
        return [new TextRun(referenceValue(doc, n.attrs ?? {}))];
      if (n.type === "mergeTag")
        return [new TextRun(mergeValue(doc, n.attrs?.name || "", currentPage))];
      if (n.type !== "text") return runs(n.content);
      const m = (type: string) => n.marks?.find((m) => m.type === type);
      const run = new TextRun({
        text: n.text ?? "",
        bold: !!m("bold"),
        italics: !!m("italic"),
        underline: m("underline") ? {} : undefined,
        strike: !!m("strike"),
        superScript: !!m("superscript"),
        subScript: !!m("subscript"),
        font: m("textStyle")?.attrs?.fontFamily,
        size: m("textStyle")?.attrs?.fontSize
          ? Math.round(Number.parseFloat(m("textStyle")!.attrs!.fontSize) * 1.5)
          : undefined,
        color: m("textStyle")?.attrs?.color
          ? color(m("textStyle")!.attrs!.color)
          : undefined,
        shading: m("highlight") ? { fill: "F5D681" } : undefined,
      });
      const href = m("link")?.attrs?.href;
      return href && /^(https?:|mailto:)/i.test(href)
        ? [new ExternalHyperlink({ link: href, children: [run] })]
        : [run];
    });
  }
  const border = { style: BorderStyle.SINGLE, size: 5, color: accent };
  async function convert(
    n: JSONContent,
    list?: { kind: string; level: number },
  ): Promise<(Paragraph | Table)[]> {
    if (n.type === "image") {
      try {
        const image = await pngImage(n.attrs?.src);
        const availableWidth =
          (sz.width - doc.settings.margin * 2 - doc.settings.gutter) /
          (doc.settings.columns || 2);
        const width = availableWidth * (Number(n.attrs?.width ?? 100) / 100);
        const height = (width * image.height) / image.width;
        const scale = Math.min(
          1,
          (sz.height - doc.settings.margin * 2 - 40) / height,
        );
        return [
          new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: image.data,
                transformation: {
                  width: width * scale,
                  height: height * scale,
                },
                altText: {
                  name: n.attrs?.alt || "Adventure illustration",
                  title: n.attrs?.alt || "",
                  description: n.attrs?.alt || "",
                },
              }),
            ],
          }),
        ];
      } catch {
        throw new Error(
          "An image could not be included in editable DOCX. Upload it again.",
        );
      }
    }
    if (n.type === "table") {
      const rows: TableRow[] = [];
      for (const row of n.content ?? []) {
        const cells: TableCell[] = [];
        for (const cell of row.content ?? []) {
          const children = (
            await Promise.all((cell.content ?? []).map((c) => convert(c)))
          ).flat();
          cells.push(
            new TableCell({
              children: children.length ? children : [new Paragraph("")],
              columnSpan: cell.attrs?.colspan || 1,
              shading:
                cell.type === "tableHeader"
                  ? { fill: color(theme.paper) }
                  : undefined,
              borders: {
                top: border,
                bottom: border,
                left: border,
                right: border,
              },
            }),
          );
        }
        rows.push(
          new TableRow({
            children: cells,
            tableHeader: row.content?.some((c) => c.type === "tableHeader"),
          }),
        );
      }
      return [new Table({ rows, width: { size: 100, type: "pct" } })];
    }
    if (n.type === "callout" || n.type === "statBlock") {
      const children = (
        await Promise.all((n.content ?? []).map((c) => convert(c)))
      ).flat();
      return [
        new Table({
          width: { size: 100, type: "pct" },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children,
                  shading: { fill: color(theme.paper) },
                  borders: {
                    top: border,
                    bottom: border,
                    left: border,
                    right: border,
                  },
                  margins: { top: 100, bottom: 100, left: 130, right: 130 },
                }),
              ],
            }),
          ],
        }),
      ];
    }
    if (n.type === "bulletList" || n.type === "orderedList")
      return (
        await Promise.all(
          (n.content ?? []).map((c) =>
            convert(c, { kind: n.type!, level: (list?.level ?? -1) + 1 }),
          ),
        )
      ).flat();
    if (n.type === "listItem")
      return (
        await Promise.all(
          (n.content ?? []).map((c, i) =>
            convert(c, i === 0 ? list : undefined),
          ),
        )
      ).flat();
    if (n.type === "columnBreak")
      return [
        new Paragraph({
          children: [new ColumnBreak()],
          pageBreakBefore: false,
        }),
      ];
    if (n.type === "horizontalRule")
      return [new Paragraph({ border: { bottom: border } })];
    if (n.type === "paragraph" || n.type === "heading")
      return [
        new Paragraph({
          children: runs(n.content),
          style:
            n.attrs?.styleId ||
            (n.type === "heading"
              ? `AdventureHeading${n.attrs?.level || 1}`
              : undefined),
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
            )[n.attrs?.textAlign] || AlignmentType.LEFT,
          keepNext: n.type === "heading" || n.attrs?.keep,
          spacing: {
            before: parseFloat(n.attrs?.spaceBefore ?? "0") * 15,
            after: n.attrs?.spaceAfter
              ? parseFloat(n.attrs.spaceAfter) * 15
              : 100,
            line: Math.round(
              Number(n.attrs?.lineHeight ?? doc.settings.lineHeight) * 240,
            ),
          },
          indent: n.attrs?.indent
            ? { left: Number(n.attrs.indent) * 15 }
            : undefined,
          ...(list
            ? list.kind === "bulletList"
              ? { bullet: { level: Math.min(list.level, 8) } }
              : {
                  numbering: {
                    reference: "adventure-list",
                    level: Math.min(list.level, 8),
                  },
                }
            : {}),
        }),
      ];
    return (
      await Promise.all((n.content ?? []).map((c) => convert(c, list)))
    ).flat();
  }
  const sections = [];
  for (let i = 0; i < doc.pages.length; i++) {
    progress(`Converting page ${i + 1}…`);
    const p = doc.pages[i];
    const design = pageDesign(doc, p, i);
    currentPage = pageNumber(doc, i);
    let children: (Paragraph | Table)[] = [];
    if (p.kind === "toc") {
      children = [
        new Paragraph({ text: "Contents", style: "AdventureHeading1" }),
        ...entries(doc)
          .filter((e) => e.level <= doc.settings.tocDepth)
          .map(
            (e) =>
              new Paragraph({
                text: `${e.title}    ${e.page}`,
                indent: { left: (e.level - 1) * 180 },
              }),
          ),
      ];
    } else if (p.kind === "index") {
      children = [
        new Paragraph({ text: "Index", style: "AdventureHeading1" }),
        ...keywordIndex(doc).map(
          (e) => new Paragraph(`${e.term}    ${e.pages.join(", ")}`),
        ),
      ];
    } else
      children = (
        await Promise.all((p.content.content ?? []).map((c) => convert(c)))
      ).flat();
    if (design.background) {
      const background = await pngImage(
        design.background!,
        design.backgroundOpacity,
      );
      children.unshift(
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: background.data,
              transformation: { width: sz.width, height: sz.height },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  offset: 0,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: 0,
                },
                behindDocument: true,
                wrap: { type: TextWrappingType.NONE },
                allowOverlap: true,
              },
            }),
          ],
        }),
      );
    }
    sections.push({
      properties: {
        column: {
          count:
            p.kind === "title" || p.kind === "toc" || p.kind === "index"
              ? 1
              : design.columns,
          space: doc.settings.gutter * 15,
        },
        page: {
          size: { width: sz.width * 15, height: sz.height * 15 },
          margin: {
            top: design.margin * 15,
            bottom: design.margin * 15,
            left: design.left * 15,
            right: design.right * 15,
          },
          pageNumbers: i === 0 ? { start: doc.settings.pageStart } : undefined,
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              text: design.hideHeader ? "" : design.header,
              style: "RunningText",
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun(`${design.footer}   `),
                ...(!design.hideNumber && p.kind !== "title"
                  ? [new TextRun({ children: [PageNumber.CURRENT] })]
                  : []),
              ],
            }),
          ],
        }),
      },
      children,
    });
  }
  const file = new Document({
    title: doc.title,
    creator: doc.author,
    styles: {
      default: {
        document: {
          run: {
            font: theme.bodyFont,
            size: Math.round(doc.settings.fontSize * 1.5),
            color: ink,
          },
        },
      },
      paragraphStyles: [
        ...(doc.namedStyles ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          basedOn: "Normal",
          quickFormat: true,
          run: {
            font: s.fontFamily,
            size: s.fontSize * 1.5,
            color: color(s.color),
            bold: s.bold,
            italics: s.italic,
          },
          paragraph: {
            spacing: {
              before: s.spaceBefore * 15,
              after: s.spaceAfter * 15,
              line: s.lineHeight * 240,
            },
          },
        })),
        {
          id: "RunningText",
          name: "Running text",
          run: { size: 16, color: accent },
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `AdventureHeading${i + 1}`,
          name: `Heading ${i + 1}`,
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: theme.headingFont,
            color: accent,
            bold: true,
            size: [44, 32, 26, 24, 22, 20, 20, 18, 18][i],
          },
          paragraph: {
            outlineLevel: i,
            keepNext: true,
            spacing: { before: 180, after: 100 },
          },
        })),
      ],
    },
    numbering: {
      config: [
        {
          reference: "adventure-list",
          levels: Array.from({ length: 9 }, (_, i) => ({
            level: i,
            format: LevelFormat.DECIMAL,
            text: `%${i + 1}.`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 360 * (i + 1), hanging: 180 } },
            },
          })),
        },
      ],
    },
    sections,
  });
  download(await Packer.toBlob(file), `${filename(doc)}-editable.docx`);
}
