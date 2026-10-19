import type { Editor } from "@tiptap/core";
import {
  applyBlockStyle,
  blockStyles,
  currentBlockStyle,
} from "../lib/block-formatting";
export function BlockStyleSelect({
  editor,
  format,
  label = "Paragraph style",
}: {
  editor: Editor | null;
  format: (fn: (editor: Editor) => unknown) => void;
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      disabled={!editor}
      value={currentBlockStyle(editor)}
      onChange={(event) => {
        const value = event.target.value;
        format((ed) => applyBlockStyle(ed, value));
      }}
    >
      {blockStyles.map(([value, name]) => (
        <option key={value} value={value}>
          {name}
        </option>
      ))}
    </select>
  );
}
