import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useDesk } from "../state/context";
import { mergeValue } from "../lib/merge-tags";
import { pageNumber } from "../lib/references";

/** The value is rendered, never stored: edits to title/author/page order update all uses. */
export function MergeTagNode({ node, editor }: NodeViewProps) {
  const { doc } = useDesk();
  const id = editor.view.dom.closest(".paper")?.getAttribute("data-page-id");
  const index = doc.pages.findIndex((p) => p.id === id);
  const number = index < 0 ? doc.settings.pageStart : pageNumber(doc, index);
  const name = String(node.attrs.name);
  return (
    <NodeViewWrapper
      as="span"
      className="merge-tag"
      data-merge-tag={name}
      contentEditable={false}
      title={`{${name}} — dynamic field`}
    >
      {mergeValue(doc, name, number)}
    </NodeViewWrapper>
  );
}
