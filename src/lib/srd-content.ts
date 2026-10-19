import {
  generateJSON,
  generateHTML,
  type Editor,
  type JSONContent,
} from "@tiptap/core";
import { marked } from "marked";
import type { SelectionBookmark } from "@tiptap/pm/state";
import { extensions, cleanHtml } from "./editor";
import { heading, paragraph } from "./documents";
import { plainText } from "./anchors";
import { srdVersion, type SrdEntry } from "./srd-catalog";
const fields: Record<string, string> = {
  "armor class": "armor",
  "hit points": "hitPoints",
  speed: "speed",
  senses: "senses",
  languages: "languages",
  challenge: "challenge",
};
const sections: Record<string, string> = {
  traits: "traits",
  actions: "actions",
  "bonus actions": "bonusActions",
  reactions: "reactions",
  "legendary actions": "legendaryActions",
  description: "description",
};
export function makeSrdBlock(entry: SrdEntry): JSONContent {
  const body: JSONContent[] =
    generateJSON(
      cleanHtml(marked.parse(entry.markdown, { async: false }) as string),
      extensions(),
    ).content ?? [];
  let section = entry.kind === "items" ? "properties" : "srdContent";
  const content = body.map((node, index) => {
    const text = plainText(node).trim().toLowerCase();
    let field = "srdContent";
    if (index === 0) field = "classification";
    else if (entry.kind === "items") field = "properties";
    else if (node.type === "heading") section = sections[text] || "srdContent";
    else if (
      node.type === "table" &&
      entry.kind === "monsters" &&
      plainText(node).includes("STR")
    )
      field = "abilities";
    else
      field =
        Object.entries(fields).find(([prefix]) =>
          text.startsWith(prefix),
        )?.[1] || section;
    return {
      ...node,
      attrs: {
        ...node.attrs,
        templateField: field,
        ...(node.type === "heading" ? { level: 3 } : {}),
      },
    };
  });
  const name = heading(entry.name, 2);
  name.attrs = { ...name.attrs, templateField: "name" };
  const version = srdVersion(entry.edition, entry.kind);
  const source = generateJSON(
    cleanHtml(
      marked.parse(
        `This block includes material from the **System Reference Document ${version} (SRD ${version})** by Wizards of the Coast LLC, available at [dndbeyond.com/srd](https://www.dndbeyond.com/srd). Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/legalcode). Adapted for layout.`,
        { async: false },
      ) as string,
    ),
    extensions(),
  ).content![0];
  source.attrs = {
    ...source.attrs,
    templateField: "srdSource",
    textRole: "caption",
  };
  return {
    type: "statBlock",
    attrs: {
      kind: entry.kind === "monsters" ? "creature" : "magicItem",
      width: 100,
      flow: "block",
      srdId: entry.id,
      srdName: entry.name,
    },
    content: [name, ...content, source],
  };
}
export function srdPreview(block: JSONContent) {
  return cleanHtml(
    generateHTML({ type: "doc", content: [block] }, extensions()),
  );
}
export function insertSrdBlock(
  editor: Editor,
  block: JSONContent,
  bookmark: SelectionBookmark,
) {
  const selected = bookmark.resolve(editor.state.doc);
  for (let depth = 1; depth <= selected.$from.depth; depth++) {
    if (
      ["statBlock", "callout", "table"].includes(
        selected.$from.node(depth).type.name,
      )
    )
      return editor
        .chain()
        .insertContentAt(selected.$from.after(depth), [block, paragraph()])
        .focus()
        .run();
  }
  return editor
    .chain()
    .command(({ tr }) => {
      tr.setSelection(bookmark.resolve(tr.doc));
      return true;
    })
    .insertContent([block, paragraph()])
    .focus()
    .run();
}
