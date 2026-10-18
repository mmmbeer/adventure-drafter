import { useState } from "react";
import { createPortal } from "react-dom";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Columns2, Pencil, Grip } from "lucide-react";
import { TemplateFieldsDialog } from "./dialogs/TemplateFieldsDialog";
import { patchTemplate, type RichTemplateFields } from "../lib/template-blocks";
import { useNodeResize } from "./nodeResize";

export function TemplateNode(props: NodeViewProps) {
  const { node, editor, getPos, updateAttributes, selected } = props;
  const [editing, setEditing] = useState(false);
  const resize = useNodeResize(props);
  const kind = String(node.attrs.kind ?? "creature");
  const width = Number(node.attrs.width ?? 100);
  const flow = node.attrs.wide ? "block" : String(node.attrs.flow ?? "block");
  const save = (fields: Record<string, string>, layout: { width: number; flow: string; wide: boolean }, rich: RichTemplateFields) => {
    const position = getPos();
    if (typeof position !== "number") return;
    const current = editor.state.doc.nodeAt(position);
    if (!current) return;
    const updated = patchTemplate(current.toJSON(), fields, rich);
    updated.attrs = { ...updated.attrs, ...layout };
    editor.chain().command(({ tr }) => {
      tr.replaceWith(position, position + current.nodeSize, editor.schema.nodeFromJSON(updated));
      return true;
    }).run();
    setEditing(false);
  };
  return (
      <NodeViewWrapper
        as={node.type.name === "callout" ? "aside" : "section"}
        className={`layout-node template-node ${selected ? "is-selected" : ""}`}
        data-statblock={node.type.name === "statBlock" ? "" : undefined}
        data-callout={node.type.name === "callout" ? "" : undefined}
        data-kind={kind}
        data-flow={flow}
        data-wide={String(!!node.attrs.wide)}
        data-width={width}
        style={{ width: `${width}%` }}
      >
        {!editor.isEditable ? null : (
          <div className="node-tools no-print" contentEditable={false}>
            <button type="button" title="Edit standard fields" aria-label="Edit template fields" onMouseDown={(e) => e.preventDefault()} onClick={() => setEditing(true)}><Pencil size={14} /></button>
            <button type="button" title={node.attrs.wide ? "Use one column" : "Span all columns"} aria-label="Toggle column span" onMouseDown={(e) => e.preventDefault()} onClick={() => updateAttributes({ wide: !node.attrs.wide, width: 100, flow: "block" })}><Columns2 size={14} /></button>
          </div>
        )}
        <NodeViewContent className="template-content" />
        {editor.isEditable && <button className="node-resize no-print" aria-label="Resize layout box" title="Drag to resize. Drag beyond the column to span both columns." contentEditable={false} onPointerDown={resize}><Grip size={16} /></button>}
        {editing && createPortal(
          <TemplateFieldsDialog node={node.toJSON()} onClose={() => setEditing(false)} onSave={save} />,
          document.body,
        )}
      </NodeViewWrapper>
  );
}
