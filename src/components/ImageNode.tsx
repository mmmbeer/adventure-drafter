import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Columns2, ChevronDown } from "lucide-react";
import { useNodeResize } from "./nodeResize";

export function ImageNode(props: NodeViewProps) {
  const { node, selected, editor, updateAttributes } = props;
  const resize = useNodeResize(props);
  const wide = !!node.attrs.wide;
  const flow = wide ? "block" : String(node.attrs.flow ?? "block");
  const src = String(node.attrs.src ?? "");
  const width = Number(node.attrs.width ?? 100);
  return (
    <NodeViewWrapper
      id={`ref-${node.attrs.refId}`}
      data-ref-id={node.attrs.refId}
      data-style-id={node.attrs.styleId}
      as="figure"
      className={`layout-node image-node ${selected ? "is-selected" : ""}`}
      data-flow={flow}
      data-wide={String(wide)}
      data-width={width}
      style={{
        width: `${width}%`,
        shapeOutside:
          flow === "block" ? undefined : `url("${src.replaceAll('"', "%22")}")`,
        shapeImageThreshold: 0.1,
        shapeMargin: "5px",
      }}
    >
      <img
        src={src}
        alt={node.attrs.alt ?? ""}
        draggable={false}
        data-width={width}
        data-flow={flow}
        data-blend={node.attrs.blend ?? "normal"}
      />
      {editor.isEditable && (
        <>
          <div className="node-tools no-print" contentEditable={false}>
            <button
              title={wide ? "Use one column" : "Span all columns"}
              aria-label="Toggle image column span"
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                updateAttributes({ wide: !wide, width: 100, flow: "block" })
              }
            >
              <Columns2 size={14} />
            </button>
          </div>
          <button
            className="node-resize no-print"
            aria-label="Resize image"
            title="Drag to resize. Drag beyond the column to span both columns."
            contentEditable={false}
            onPointerDown={resize}
          >
            <ChevronDown size={16} />
          </button>
        </>
      )}
    </NodeViewWrapper>
  );
}
