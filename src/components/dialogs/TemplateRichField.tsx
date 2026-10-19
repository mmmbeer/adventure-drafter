import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Highlighter } from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import { Tool } from "../Toolbar";

/** A compact instance of the same TipTap editing engine used on document pages. */
export function TemplateRichField({
  label, initial, onChange,
}: {
  label: string;
  initial: JSONContent[];
  onChange: (blocks: JSONContent[]) => void;
}) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const [, redraw] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false }, underline: {} }),
      Highlight,
      Table, TableRow, TableCell, TableHeader,
    ],
    content: { type: "doc", content: initial.length ? initial : [{ type: "paragraph" }] },
    editorProps: { attributes: { "aria-label": label, spellcheck: "true" } },
    onUpdate: ({ editor }) => latest.current(editor.getJSON().content ?? []),
    onSelectionUpdate: () => redraw((value) => value + 1),
    onTransaction: () => redraw((value) => value + 1),
  });
  return (
    <section className="template-rich-field template-field-full">
      <div className="template-rich-label">{label}</div>
      <div role="toolbar" aria-label={`${label} formatting`} className="template-rich-toolbar">
        <Tool label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={14}/></Tool>
        <Tool label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={14}/></Tool>
        <Tool label="Underline" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline size={14}/></Tool>
        <Tool label="Strikethrough" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={14}/></Tool>
        <Tool label="Highlight" active={editor?.isActive("highlight")} onClick={() => editor?.chain().focus().toggleHighlight().run()}><Highlighter size={14}/></Tool>
        <span className="template-rich-divider" />
        <Tool label="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={14}/></Tool>
        <Tool label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={14}/></Tool>
      </div>
      <EditorContent editor={editor} className="template-rich-body" />
    </section>
  );
}
