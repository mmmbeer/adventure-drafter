import { EditorContent, useEditor } from "@tiptap/react";
import { cleanHtml, extensions } from "../../lib/editor";
import { normalizeWordHtml } from "../../lib/word-html";
import { useRef } from "react";

export function WordPasteField({
  source,
  onChange,
}: {
  source: string;
  onChange: (html: string) => void;
}) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const editor = useEditor({
    extensions: extensions(),
    content: source,
    editorProps: {
      transformPastedHTML: (html) => cleanHtml(normalizeWordHtml(html)),
      attributes: {
        "aria-label": "Word document paste area",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) =>
      latest.current(editor.isEmpty ? "" : editor.getHTML()),
  });
  return <EditorContent editor={editor} className="word-paste-field" />;
}
