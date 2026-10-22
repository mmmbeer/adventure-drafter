import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
import { entries, keywordIndex, pageNumber } from "./model";
import { dividerSource, validDivider } from "./dividers";
import { joinTables } from "./table-flow";
import {
  markdownInline,
  markdownEscape,
  markdownUrl,
  htmlEscape,
} from "./markdown-inline";
import { download, filename } from "./export";
import { exportAsset } from "./export-assets";

interface Block {
  node: JSONContent;
  number: number;
}
/** Rejoin paginated row groups so Markdown readers see each table and header once. */
export function markdownBlocks(doc: Adventure): Block[] {
  const blocks: Block[] = [];
  doc.pages.forEach((page, index) => {
    const number = pageNumber(doc, index);
    const nodes =
      page.kind === "toc"
        ? [{ type: "generatedContents" }]
        : page.kind === "index"
          ? [{ type: "generatedIndex" }]
          : (page.content.content ?? []);
    for (const node of nodes) {
      const previous = blocks.at(-1);
      const joined = previous && joinTables(previous.node, node);
      if (joined) previous.node = joined;
      else blocks.push({ node, number });
    }
  });
  return blocks;
}

export async function markdownDocument(
  doc: Adventure,
  asset: (url: string) => Promise<string> = exportAsset,
) {
  const inline = (node: JSONContent, number: number) =>
    markdownInline(node.content, doc, number);
  async function table(node: JSONContent, number: number) {
    const rows = node.content ?? [];
    const simple =
      rows.length > 0 &&
      rows[0].content?.every((c) => c.type === "tableHeader") &&
      rows.every(
        (row, index) =>
          row.content?.length === rows[0].content?.length &&
          row.content?.every(
            (cell) =>
              Number(cell.attrs?.colspan || 1) === 1 &&
              Number(cell.attrs?.rowspan || 1) === 1 &&
              cell.content?.every((p) => p.type === "paragraph") &&
              (index === 0
                ? cell.type === "tableHeader"
                : cell.type === "tableCell"),
          ),
      );
    if (simple) {
      const lines = rows.map(
        (row) =>
          `| ${(row.content ?? [])
            .map((cell) =>
              (cell.content ?? [])
                .map((p) => inline(p, number))
                .join("<br>")
                .replace(/\n/g, "<br>"),
            )
            .join(" | ")} |`,
      );
      lines.splice(
        1,
        0,
        `| ${rows[0].content!.map(() => "---").join(" | ")} |`,
      );
      return lines.join("\n");
    }
    // HTML is needed for merged cells and tables without a header row.
    const { marked } = await import("marked");
    const lines: string[] = [];
    for (const row of rows) {
      const cells: string[] = [];
      for (const cell of row.content ?? []) {
        const tag = cell.type === "tableHeader" ? "th" : "td";
        const body = await children(cell, number);
        cells.push(
          `<${tag} colspan="${Math.max(1, Number(cell.attrs?.colspan) || 1)}" rowspan="${Math.max(1, Number(cell.attrs?.rowspan) || 1)}">${(await marked.parse(body)).trim()}</${tag}>`,
        );
      }
      lines.push(`<tr>${cells.join("")}</tr>`);
    }
    return `<table>\n${lines.join("\n")}\n</table>`;
  }
  async function children(node: JSONContent, number: number): Promise<string> {
    return (
      await Promise.all((node.content ?? []).map((n) => block(n, number)))
    ).join("\n\n");
  }
  async function block(node: JSONContent, number: number): Promise<string> {
    const anchor = node.attrs?.refId
      ? `<a id="ref-${htmlEscape(node.attrs.refId)}"></a>\n\n`
      : "";
    switch (node.type) {
      case "paragraph":
        return inline(node, number);
      case "heading": {
        const level = Number(node.attrs?.level || 1);
        return (
          anchor +
          (level <= 6
            ? `${"#".repeat(level)} ${inline(node, number)}`
            : `<h6 data-level="${level}">${htmlEscape((node.content ?? []).map((c) => c.text || "").join(""))}</h6>`)
        );
      }
      case "image": {
        const source = markdownUrl(node.attrs?.src || "");
        if (!source) return "";
        return `![${markdownEscape(node.attrs?.alt || "Adventure illustration")}](${await asset(source)})`;
      }
      case "horizontalRule": {
        const id = node.attrs?.divider;
        const source = validDivider(id)
          ? dividerSource(id, doc.settings.theme)
          : undefined;
        return source
          ? `![Decorative horizontal rule](${await asset(source)})`
          : "---";
      }
      case "table":
        return anchor + (await table(node, number));
      case "columnBreak":
        return "<!-- columnbreak -->";
      case "bulletList":
      case "orderedList": {
        const start = Number(node.attrs?.start) || 1;
        const items: string[] = [];
        for (const [index, item] of (node.content ?? []).entries()) {
          const marker =
            node.type === "orderedList" ? `${start + index}. ` : "- ";
          const body = await children(item, number);
          items.push(
            marker + body.replace(/\n/g, `\n${" ".repeat(marker.length)}`),
          );
        }
        return items.join("\n");
      }
      case "blockquote":
      case "callout":
      case "statBlock":
        return (
          anchor +
          (await children(node, number))
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        );
      case "codeBlock": {
        const code = (node.content ?? []).map((n) => n.text || "").join("");
        const fence = "`".repeat(
          Math.max(3, ...[...code.matchAll(/`+/g)].map((m) => m[0].length + 1)),
        );
        return `${fence}${String(node.attrs?.language || "").replace(/[^\w+-]/g, "")}\n${code}\n${fence}`;
      }
      case "generatedContents":
        return (
          "# Contents\n\n" +
          entries(doc)
            .filter((e) => e.level <= doc.settings.tocDepth)
            .map(
              (e) =>
                `${"  ".repeat(e.level - 1)}- [${markdownEscape(e.title)}](#${e.target}) · ${e.page}`,
            )
            .join("\n")
        );
      case "generatedIndex":
        return (
          "# Index\n\n" +
          keywordIndex(doc)
            .map(
              (e) => `- **${markdownEscape(e.term)}** · ${e.pages.join(", ")}`,
            )
            .join("\n")
        );
      default:
        return anchor + (await children(node, number));
    }
  }
  const rendered: string[] = [];
  let number: number | undefined;
  for (const item of markdownBlocks(doc)) {
    if (number !== undefined && number !== item.number)
      rendered.push("<!-- pagebreak -->");
    rendered.push(await block(item.node, item.number));
    number = item.number;
  }
  const metadata = JSON.stringify({
    title: doc.title,
    author: doc.author,
    subtitle: doc.subtitle,
    bodyFont: doc.settings.theme.bodyFont,
    headingFont: doc.settings.theme.headingFont,
    fontSizePx: doc.settings.fontSize,
    paper: doc.settings.theme.paper,
  }).replace(/--/g, "\\u002d\\u002d");
  return `<!-- Adventure Drafter ${metadata}\nMarkdown preserves content. Use PDF, Word or PNG for exact typography, colors and page layout. -->\n\n${rendered.join("\n\n")}\n`;
}

export async function exportMarkdown(
  doc: Adventure,
  progress: (s: string) => void,
) {
  progress("Preparing Markdown and embedding artwork…");
  const content = await markdownDocument(doc);
  download(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
    `${filename(doc)}.md`,
  );
}
