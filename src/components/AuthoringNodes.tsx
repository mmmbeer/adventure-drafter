import { useEffect } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useDesk } from "../state/context";
import {
  referenceTargets,
  referenceValue,
  goToReference,
} from "../lib/cross-references";
export function ReferenceNode({ node, editor }: NodeViewProps) {
  const { doc } = useDesk();
  const label = referenceValue(doc, node.attrs);
  useEffect(() => {
    editor.view.dom.dispatchEvent(new Event("authoring-layout"));
  }, [editor, label]);
  const target = referenceTargets(doc).find(
    (t) => t.id === node.attrs.targetId,
  );
  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      data-cross-reference=""
      data-target-id={node.attrs.targetId}
      className={`cross-reference ${target ? "" : "missing"}`}
    >
      <a
        href={target ? `#ref-${target.id}` : undefined}
        onClick={(e) => {
          e.preventDefault();
          if (target) goToReference(target.id);
        }}
        title={
          target ? "Jump to reference" : "Reference destination was deleted"
        }
      >
        {label}
      </a>
    </NodeViewWrapper>
  );
}
export function ReusableNode({ node, editor, getPos }: NodeViewProps) {
  const { openDialog } = useDesk();
  return (
    <NodeViewWrapper
      as="section"
      data-reusable=""
      data-library-id={node.attrs.libraryId}
      data-style-id={node.attrs.styleId}
      data-ref-id={node.attrs.refId}
      id={`ref-${node.attrs.refId}`}
    >
      {editor.isEditable && (
        <div className="reusable-label no-print" contentEditable={false}>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const pos = getPos();
              if (typeof pos === "number")
                editor.commands.setNodeSelection(pos);
              openDialog("library");
            }}
          >
            Linked: {node.attrs.name || "Library content"} · v
            {node.attrs.revision}
          </button>
        </div>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
