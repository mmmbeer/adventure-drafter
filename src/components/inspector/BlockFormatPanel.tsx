import { BlockStyleSelect } from "../BlockStyleSelect";
import { bulletMarkers, numberMarkers } from "../../lib/block-formatting";
import { useInspector } from "./context";
export function BlockFormatPanel() {
  const { editor, format } = useInspector();
  if (!editor) return null;
  const list = editor.isActive("orderedList")
    ? "orderedList"
    : editor.isActive("bulletList")
      ? "bulletList"
      : null;
  return (
    <section className="panel-section">
      <h3>Text style</h3>
      <BlockStyleSelect
        editor={editor}
        format={format}
        label="Selected text style"
      />
      {list && (
        <>
          <label>
            List markers
            <select
              aria-label="List markers"
              value={
                editor.getAttributes(list).listStyleType ||
                (list === "bulletList" ? "disc" : "decimal")
              }
              onChange={(e) => {
                const value = e.target.value;
                format((ed) =>
                  ed
                    .chain()
                    .updateAttributes(list, { listStyleType: value })
                    .run(),
                );
              }}
            >
              {(list === "bulletList" ? bulletMarkers : numberMarkers).map(
                (marker) => (
                  <option key={marker} value={marker}>
                    {
                      {
                        disc: "• Filled circle",
                        circle: "○ Open circle",
                        square: "▪ Square",
                        decimal: "1, 2, 3",
                        "lower-alpha": "a, b, c",
                        "upper-alpha": "A, B, C",
                        "lower-roman": "i, ii, iii",
                        "upper-roman": "I, II, III",
                      }[marker]
                    }
                  </option>
                ),
              )}
            </select>
          </label>
          {list === "orderedList" && (
            <label>
              Start at
              <input
                aria-label="List start number"
                type="number"
                min="1"
                max="9999"
                value={editor.getAttributes(list).start || 1}
                onChange={(e) => {
                  const start = Math.min(
                    9999,
                    Math.max(1, Number(e.target.value) || 1),
                  );
                  format((ed) =>
                    ed.chain().updateAttributes(list, { start }).run(),
                  );
                }}
              />
            </label>
          )}
          <div className="button-grid">
            <button
              disabled={!editor.can().sinkListItem("listItem")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                format((ed) =>
                  ed.chain().focus().sinkListItem("listItem").run(),
                )
              }
            >
              Indent list
            </button>
            <button
              disabled={!editor.can().liftListItem("listItem")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                format((ed) =>
                  ed.chain().focus().liftListItem("listItem").run(),
                )
              }
            >
              Outdent list
            </button>
          </div>
        </>
      )}
    </section>
  );
}
