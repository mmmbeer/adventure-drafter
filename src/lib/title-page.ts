import type { JSONContent } from "@tiptap/core";

/** Theme fonts, paper, accent and ornament are resolved at render time. */
export function titlePageContent(): JSONContent[] {
  return [
    {
      type: "paragraph",
      content: [{ type: "text", text: "A TABLETOP ADVENTURE" }],
    },
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "mergeTag", attrs: { name: "title" } }],
    },
    {
      type: "paragraph",
      content: [{ type: "mergeTag", attrs: { name: "subtitle" } }],
    },
    { type: "horizontalRule", attrs: { divider: "theme", wide: true } },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Written by " },
        { type: "mergeTag", attrs: { name: "author" } },
      ],
    },
  ];
}

/** Never replace authored text, illustrations, fields or decorative blocks. */
export function isBlankTitle(content: JSONContent[]) {
  return content.every(
    (node) =>
      ["paragraph", "heading"].includes(node.type ?? "") &&
      (node.content ?? []).every(
        (child) =>
          child.type === "hardBreak" ||
          (child.type === "text" && !child.text?.trim()),
      ),
  );
}
