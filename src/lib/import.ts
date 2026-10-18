import { marked } from "marked";
import { generateJSON, generateHTML } from "@tiptap/core";
import { cleanHtml, extensions } from "./editor";
import {
  createAdventure,
  page,
  validateAdventure,
  type Adventure,
} from "./model";
export interface ImportResult {
  document: Adventure;
  warnings: string[];
}
function homebrew(source: string, warnings: string[]) {
  if (
    /<style|\{\{[^\n]*(?:position|width|height|top|left|color|font)|\{[^\n]*\}/i.test(
      source,
    )
  )
    warnings.push(
      "Custom Homebrewery CSS and absolute positioning need to be recreated with the layout controls.",
    );
  let md = source
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[^]*?-->/g, "");
  md = md.replace(
    /\{\{(monster[^\n]*|note[^\n]*|descriptive[^\n]*|readaloud[^\n]*)\n([^]*?)\}\}/g,
    (_, kind, body) =>
      kind.startsWith("monster")
        ? `<section data-statblock>\n\n${body}\n\n</section>`
        : `<aside data-callout data-kind="${kind.startsWith("descriptive") ? "readaloud" : "aside"}">\n\n${body}\n\n</aside>`,
  );
  md = md
    .replace(/\{\{(?:pageNumber|footnote)[^]*?\}\}/g, "")
    .replace(/^\s*\\column\s*$/gm, "\n<div data-column-break></div>\n")
    .replace(/^\s*:\s*$/gm, "")
    .replace(/\{\{[^\n]*\n/g, "")
    .replace(/\}\}/g, "")
    .replace(/\{[^{}\n]*\}/g, "");
  return md;
}
export async function importText(
  source: string,
  title: string,
  homebrewery = false,
): Promise<ImportResult> {
  const warnings: string[] = [];
  const md = homebrewery ? homebrew(source, warnings) : source;
  const d = createAdventure(true);
  d.title = title || "Imported adventure";
  d.pages = [];
  for (const part of md.split(/^\s*(?:\\page|<!--\s*pagebreak\s*-->)\s*$/gm)) {
    const html = cleanHtml(
      await marked.parse(part, { breaks: false, gfm: true }),
    );
    d.pages.push(page("body", generateJSON(html, extensions()).content));
  }
  if (/!\[.*?\]\(https?:/i.test(source))
    warnings.push(
      "Remote images must allow cross-origin access for PDF and DOCX export. Upload an image if its host blocks access.",
    );
  if (homebrewery)
    warnings.push(
      "Homebrewery page/column breaks, common note/monster blocks and Markdown were converted. Review fonts and page flow before publishing.",
    );
  return { document: d, warnings };
}
export async function importFile(file: File): Promise<ImportResult> {
  if (file.size > 80 * 1024 * 1024)
    throw new Error("Choose a file smaller than 80 MB.");
  if (/\.json$|\.adventure$/i.test(file.name)) {
    const d = validateAdventure(JSON.parse(await file.text()));
    for (const p of d.pages)
      p.content = generateJSON(
        cleanHtml(generateHTML(p.content, extensions())),
        extensions(),
      );
    d.id = crypto.randomUUID();
    return { document: d, warnings: [] };
  }
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml(
      { arrayBuffer: await file.arrayBuffer() },
      {
        styleMap: Array.from(
          { length: 9 },
          (_, i) =>
            `p[style-name='Heading ${i + 1}'] => ${i < 6 ? `h${i + 1}` : `div.heading-level-${i + 1}:fresh`}`,
        ),
      },
    );
    const d = createAdventure(true);
    d.title = file.name.replace(/\.docx$/i, "");
    d.pages = [
      page(
        "body",
        generateJSON(
          cleanHtml(
            result.value.replace(
              /<div class="heading-level-([789])">/g,
              '<div data-level="$1">',
            ),
          ),
          extensions(),
        ).content,
      ),
    ];
    return {
      document: d,
      warnings: [
        "Word content, tables, headings and embedded images were imported. Word-specific page geometry, floating objects and background art require review.",
        ...result.messages.map((m) => m.message),
      ],
    };
  }
  if (/\.doc$/i.test(file.name))
    throw new Error("Save this Word document as .docx before importing.");
  return importText(
    await file.text(),
    file.name.replace(/\.[^.]+$/, ""),
    /\.brew$|\.homebrewery$/i.test(file.name),
  );
}
