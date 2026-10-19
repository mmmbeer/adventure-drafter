import { useState } from "react";
import {
  borderEdges,
  borderStyles,
  cleanBoxFormat,
  updateBoxFormat,
  type BoxFormat,
} from "../../lib/box-formatting";
import { useInspector } from "./context";
export function BorderPanel() {
  const { editor, format, image } = useInspector();
  const [preferred, setPreferred] = useState("");
  if (!editor || image) return null;
  const targets: [string, string][] = [];
  if (editor.isActive("table"))
    targets.push(["cells", "Selected table cells"], ["table", "Table outline"]);
  for (const [type, label] of [
    ["callout", "Callout box"],
    ["statBlock", "Stat block"],
    ["bulletList", "Bullet list"],
    ["orderedList", "Numbered list"],
    ["blockquote", "Quote"],
  ])
    if (editor.isActive(type)) targets.push([type, label]);
  targets.push(["text", "Selected paragraphs / headings"]);
  const target = targets.some(([type]) => type === preferred)
    ? preferred
    : targets[0][0];
  const name =
    target === "cells"
      ? editor.isActive("tableHeader")
        ? "tableHeader"
        : "tableCell"
      : target === "text"
        ? editor.isActive("heading")
          ? "heading"
          : editor.isActive("codeBlock")
            ? "codeBlock"
            : "paragraph"
        : target;
  const box = cleanBoxFormat(editor.getAttributes(name).boxFormat);
  const apply = (patch: Partial<BoxFormat> | null) =>
    format((ed) => updateBoxFormat(ed, target, patch));
  return (
    <section className="panel-section">
      <h3>Borders and shading</h3>
      <label>
        Apply to
        <select
          aria-label="Border target"
          value={target}
          onChange={(e) => setPreferred(e.target.value)}
        >
          {targets.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Borders
        <select
          aria-label="Border edges"
          value={box.edges || ""}
          onChange={(e) =>
            apply({ edges: e.target.value as BoxFormat["edges"] })
          }
        >
          <option value="" disabled>
            Style default
          </option>
          {borderEdges.map((edge) => (
            <option key={edge} value={edge}>
              {
                {
                  all: "All sides",
                  top: "Top",
                  bottom: "Bottom",
                  left: "Left",
                  right: "Right",
                  "top-bottom": "Top and bottom",
                  none: "No borders",
                }[edge]
              }
            </option>
          ))}
        </select>
      </label>
      <div className="field-pair">
        <label>
          Line style
          <select
            aria-label="Border line style"
            value={box.style || "solid"}
            onChange={(e) =>
              apply({
                style: e.target.value as BoxFormat["style"],
                edges: box.edges || "all",
              })
            }
          >
            {borderStyles.map((style) => (
              <option key={style} value={style}>
                {style[0].toUpperCase() + style.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Width (px)
          <input
            aria-label="Border width"
            type="number"
            min="0"
            max="12"
            step="0.5"
            value={box.width ?? 1}
            onChange={(e) =>
              apply({
                width: Number(e.target.value),
                edges: box.edges || "all",
              })
            }
          />
        </label>
      </div>
      <div className="field-pair">
        <label>
          Border color
          <input
            aria-label="Border color"
            type="color"
            value={box.color || "#823a32"}
            onChange={(e) =>
              apply({ color: e.target.value, edges: box.edges || "all" })
            }
          />
        </label>
        <label>
          Background color
          <input
            aria-label="Block background color"
            type="color"
            value={box.background?.startsWith("#") ? box.background : "#ffffff"}
            onChange={(e) => apply({ background: e.target.value })}
          />
        </label>
      </div>
      {target !== "table" && (
        <label>
          Inner padding (px)
          <input
            aria-label="Block padding"
            type="number"
            min="0"
            max="60"
            placeholder="Style default"
            value={box.padding ?? ""}
            onChange={(e) =>
              apply({
                padding:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
      )}
      <div className="button-grid">
        <button onClick={() => apply({ background: "transparent" })}>
          Clear shading
        </button>
        <button onClick={() => apply(null)}>Reset borders and shading</button>
      </div>
      <p className="help">
        Select text or table cells to format several at once. Reset restores the
        document style.
      </p>
    </section>
  );
}
