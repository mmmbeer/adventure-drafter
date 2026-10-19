import { Extension, type Editor, type Command } from "@tiptap/core";

export const textRoles = ["title", "subtitle", "caption"] as const;
export const bulletMarkers = ["disc", "circle", "square"] as const;
export const numberMarkers = [
  "decimal",
  "lower-alpha",
  "upper-alpha",
  "lower-roman",
  "upper-roman",
] as const;
const markers = [...bulletMarkers, ...numberMarkers];
export const blockStyles = [
  ["p", "Paragraph"],
  ["title", "Title"],
  ["subtitle", "Subtitle"],
  ...Array.from({ length: 9 }, (_, i) => [String(i + 1), `Heading ${i + 1}`]),
  ["bulletList", "Bullet list"],
  ["orderedList", "Numbered list"],
  ["blockquote", "Quote"],
  ["caption", "Caption"],
  ["codeBlock", "Code block"],
];
export function currentBlockStyle(editor: Editor | null) {
  if (!editor) return "p";
  for (const name of ["bulletList", "orderedList", "blockquote", "codeBlock"])
    if (editor.isActive(name)) return name;
  if (editor.isActive("heading"))
    return String(editor.getAttributes("heading").level);
  return editor.getAttributes("paragraph").textRole || "p";
}
// Preserve direct formatting when changing a text block's semantic role.
function textType(name: string, attrs = {}): Command {
  return ({ tr }) => {
    const snapshot = tr.doc;
    const mappingStart = tr.steps.length;
    for (const { $from, $to } of tr.selection.ranges)
      snapshot.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (!node.isTextblock) return;
        const mapped = tr.mapping.slice(mappingStart).map(pos);
        tr.setBlockType(
          mapped,
          mapped + node.nodeSize,
          tr.doc.type.schema.nodes[name],
          { ...node.attrs, ...attrs },
        );
      });
    return true;
  };
}
export function applyBlockStyle(editor: Editor, value: string) {
  if (!blockStyles.some(([key]) => key === value)) return false;
  const chain = editor.chain().focus();
  const selectedStructures = new Set<string>();
  for (const { $from, $to } of editor.state.selection.ranges)
    editor.state.doc.nodesBetween($from.pos, $to.pos, (node) => {
      if (["listItem", "blockquote"].includes(node.type.name))
        selectedStructures.add(node.type.name);
    });
  if (value === "bulletList" || value === "orderedList") {
    if (editor.isActive(value)) return true;
    if (selectedStructures.has("blockquote")) chain.clearNodes();
    return chain
      .command(textType("paragraph"))
      .updateAttributes("paragraph", { textRole: null })
      .toggleList(value, "listItem")
      .run();
  }
  if (value === "blockquote") {
    if (editor.isActive(value) && !selectedStructures.has("listItem"))
      return true;
    if (selectedStructures.has("listItem")) chain.clearNodes();
    return chain
      .command(textType("paragraph"))
      .updateAttributes("paragraph", { textRole: null })
      .setBlockquote()
      .run();
  }
  // Unwrap selected list/quote structure, including mixed selections.
  if (selectedStructures.size) chain.clearNodes();
  const type =
    value === "codeBlock"
      ? "codeBlock"
      : /^[1-9]$/.test(value)
        ? "heading"
        : "paragraph";
  const attrs = type === "heading" ? { level: Number(value) } : undefined;
  chain.command(textType(type, attrs));
  if (type === "paragraph")
    chain.updateAttributes("paragraph", {
      textRole: textRoles.includes(value as (typeof textRoles)[number])
        ? value
        : null,
    });
  return chain.run();
}
export const BlockFormatting = Extension.create({
  name: "blockFormatting",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          textRole: {
            default: null,
            keepOnSplit: false,
            parseHTML: (e) =>
              textRoles.includes(
                e.dataset.textRole as (typeof textRoles)[number],
              )
                ? e.dataset.textRole
                : null,
            renderHTML: (a) =>
              textRoles.includes(a.textRole)
                ? { "data-text-role": a.textRole }
                : {},
          },
        },
      },
      {
        types: ["bulletList", "orderedList"],
        attributes: {
          listStyleType: {
            default: null,
            parseHTML: (e) =>
              markers.includes(
                e.style.listStyleType as (typeof markers)[number],
              )
                ? e.style.listStyleType
                : null,
            renderHTML: (a) =>
              markers.includes(a.listStyleType)
                ? { style: `list-style-type:${a.listStyleType}` }
                : {},
          },
        },
      },
    ];
  },
});
