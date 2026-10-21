import { useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useDesk } from "../state/context";
import { mergeValue, validMergeTag } from "../lib/merge-tags";
import { pageNumber } from "../lib/references";
import { unlinkPlaceholder } from "../lib/placeholder-actions";

/** The value is rendered, never stored: edits to title/author/page order update all uses. */
export function MergeTagNode({ node, editor, getPos }: NodeViewProps) {
  const { doc, preview, focus, setTab, setRightOpen, setPlaceholderSource } =
    useDesk();
  // The editor is created before its writing page enters the DOM. Its own
  // stable page identifier is available on first render and after hydration.
  const id = editor.view.dom.getAttribute("data-page-id");
  const index = doc.pages.findIndex((p) => p.id === id);
  const number = index < 0 ? doc.settings.pageStart : pageNumber(doc, index);
  const name = String(node.attrs.name);
  const label = mergeValue(doc, name, number);
  const editable = !preview && editor.isEditable;
  const inspect = () => {
    if (!editable || !validMergeTag(name)) return;
    if (id) focus(editor, id);
    setTab("document");
    setRightOpen(true);
    setPlaceholderSource({ name });
  };
  useEffect(() => {
    editor.view.dom.dispatchEvent(new Event("authoring-layout"));
  }, [editor, label]);
  return (
    <NodeViewWrapper
      as="span"
      className="merge-tag"
      data-merge-tag={name}
      contentEditable={false}
      title={`{${name}} — ${editable ? "click to edit its source" : "dynamic field"}`}
    >
      {editable ? (
        <>
          <button
            type="button"
            className="merge-tag-value"
            aria-label={`Edit source for {${name}}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              inspect();
            }}
          >
            {label || <span className="no-print">{`{${name}}`}</span>}
          </button>
          <button
            type="button"
            className="merge-tag-remove no-print"
            aria-label={`Convert {${name}} to plain text`}
            title={`Convert to plain text: ${name}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              unlinkPlaceholder(editor, getPos());
            }}
          />
        </>
      ) : (
        label
      )}
    </NodeViewWrapper>
  );
}
