import {
  Document,
  Paragraph,
  Table,
  Packer,
  Bookmark,
  ColumnBreak,
  SectionType,
  VerticalAlignSection,
  LineRuleType,
  type ISectionOptions,
} from "docx";
import type { Adventure } from "./types";
import { sizes } from "./templates";
import { pageDesign } from "./designs";
import { cleanExportPage, renderedPapers } from "./export-layout";
import { wordPaper } from "./word-paper";
import { wordRunningText } from "./export-running-text";
import { wordContent, wordBookmark } from "./word-content";
import { wordColor } from "./word-format";
import { wordStyles } from "./word-styles";
import { download, filename } from "./export";

function pageAnchor(id: string) {
  return new Paragraph({
    children: [new Bookmark({ id: wordBookmark(id), children: [] })],
    spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
    keepNext: true,
  });
}

export async function editableWordDocument(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const size = sizes[doc.settings.size];
  const theme = doc.settings.theme;
  const stage = document.createElement("div");
  stage.className = "export-stage";
  stage.style.cssText =
    "position:fixed;left:-20000px;top:0;z-index:-1;zoom:1;pointer-events:none";
  const pages = renderedPapers().map(cleanExportPage);
  if (!pages.length) throw new Error("No pages are available to export.");
  stage.append(...pages);
  document.body.append(stage);
  const sections: ISectionOptions[] = [];
  const numbering = [];
  const bookmarks = new Set<string>();
  try {
    await document.fonts.ready;
    for (const [physical, paper] of pages.entries()) {
      progress(
        `Converting editable Word page ${physical + 1} of ${pages.length}…`,
      );
      const index = doc.pages.findIndex((p) => p.id === paper.dataset.pageId);
      const page = doc.pages[index];
      const design = pageDesign(
        doc,
        page,
        index,
        Number(paper.dataset.part || 0),
      );
      const width = size.width - design.left - design.right;
      const columns = page.kind === "body" ? design.columns : 1;
      const root = paper.querySelector<HTMLElement>(
        ".page-writing .tiptap,.generated",
      )!;
      const writing = root.getBoundingClientRect();
      const converter = wordContent(
        doc,
        design.paper,
        `page-${physical}-`,
        bookmarks,
      );
      const groups: { columns: number; children: (Paragraph | Table)[] }[] = [];
      let previousColumn = 0;
      for (const element of [...root.children] as HTMLElement[]) {
        const wide =
          element.dataset.wide === "true" ||
          getComputedStyle(element).columnSpan === "all";
        const count = wide ? 1 : columns;
        let group = groups.at(-1);
        if (!group || group.columns !== count) {
          group = { columns: count, children: [] };
          groups.push(group);
          previousColumn = 0;
        }
        const available = (width - doc.settings.gutter * (count - 1)) / count;
        const rects = [...element.getClientRects()];
        const columnAt = (left: number) =>
          Math.max(
            0,
            Math.min(
              count - 1,
              Math.round(
                (left - writing.left) / (available + doc.settings.gutter),
              ),
            ),
          );
        const firstColumn = columnAt(rects[0]?.left ?? writing.left);
        if (firstColumn > previousColumn && group.children.length)
          group.children.push(
            new Paragraph({
              children: [new ColumnBreak()],
              spacing: { before: 0, after: 0 },
            }),
          );
        group.children.push(...(await converter.convert(element, available)));
        previousColumn = columnAt(rects.at(-1)?.left ?? writing.left);
      }
      numbering.push(...converter.lists.config);
      const artwork = await wordPaper(doc, design);
      if (!groups.length)
        groups.push({ columns, children: [new Paragraph("")] });
      if (!Number(paper.dataset.part))
        groups[0].children.unshift(pageAnchor(`page-${page.id}`));
      for (const [groupIndex, group] of groups.entries()) {
        sections.push({
          properties: {
            type:
              groupIndex === 0 ? SectionType.NEXT_PAGE : SectionType.CONTINUOUS,
            column: { count: group.columns, space: doc.settings.gutter * 15 },
            verticalAlign:
              page.kind === "title"
                ? VerticalAlignSection.CENTER
                : VerticalAlignSection.TOP,
            page: {
              size: { width: size.width * 15, height: size.height * 15 },
              margin: {
                top: design.margin * 15,
                bottom: design.margin * 15,
                left: design.left * 15,
                right: design.right * 15,
                header: 23 * 15,
                footer: 24 * 15,
              },
              pageNumbers:
                sections.length === 0
                  ? { start: doc.settings.pageStart }
                  : undefined,
            },
          },
          ...wordRunningText(
            doc,
            design,
            page.kind === "title",
            width,
            artwork,
          ),
          children: group.children,
        });
      }
    }
    return new Document({
      title: doc.title,
      creator: doc.author,
      description:
        "Editable text and tables. Word may reflow line, column and page breaks. Install the document fonts for the closest match.",
      background: { color: wordColor(theme.paper) },
      features: { updateFields: true },
      styles: wordStyles(doc),
      numbering: { config: numbering },
      sections,
    });
  } finally {
    stage.remove();
  }
}
export async function exportEditable(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const file = await editableWordDocument(doc, progress);
  progress("Building Word document…");
  download(await Packer.toBlob(file), `${filename(doc)}.docx`);
}
