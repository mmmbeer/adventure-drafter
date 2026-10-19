import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useRef } from "react";
import { extensions } from "../../lib/editor";
export function LibraryEditor({
  initial,
  onChange,
}: {
  initial: JSONContent[];
  onChange: (nodes: JSONContent[]) => void;
}) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const editor = useEditor({
    extensions: extensions(),
    content: { type: "doc", content: initial },
    editorProps: {
      attributes: {
        "aria-label": "Library content editor",
        class: "library-writing",
      },
    },
    onUpdate: ({ editor }) => callback.current(editor.getJSON().content ?? []),
  });
  return (
    <div className="template-rich-field">
      <div
        className="template-rich-toolbar"
        role="toolbar"
        aria-label="Library formatting"
      >
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button
          onClick={() =>
            editor?.chain().focus().setNode("heading", { level: 2 }).run()
          }
        >
          Heading
        </button>
        <button onClick={() => editor?.chain().focus().setParagraph().run()}>
          Paragraph
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          List
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="template-rich-body library-editor"
      />
    </div>
  );
}
