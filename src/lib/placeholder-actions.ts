import type { Editor } from "@tiptap/core";
import { validMergeTag } from "./merge-tags";

/** Unlink one field without substituting its value or changing surrounding text. */
export function unlinkPlaceholder(
  editor: Editor,
  position: number | undefined,
) {
  if (!editor.isEditable || position === undefined) return false;
  const node = editor.state.doc.nodeAt(position);
  if (node?.type.name !== "mergeTag" || !validMergeTag(node.attrs.name))
    return false;
  return editor
    .chain()
    .focus()
    .insertContentAt(
      { from: position, to: position + node.nodeSize },
      {
        type: "text",
        text: node.attrs.name,
        marks: node.marks.map((mark) => mark.toJSON()),
      },
    )
    .run();
}
