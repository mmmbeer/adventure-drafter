import { ImagePlus } from "lucide-react";
import { useInspector } from "./context";
export function PagePanel() {
  const {
    doc,
    page,
    editor,
    onDialog,
    setting,
    patchPage,
    image,
    block,
    blockSetting,
  } = useInspector();
  return (
    <>
      <section className="panel-section">
        <h3>Page setup</h3>
        <label>
          Paper size
          <select
            value={doc.settings.size}
            onChange={(e) => setting("size", e.target.value)}
          >
            <option value="letter">US Letter · 8.5 × 11 in</option>
            <option value="a4">A4 · 210 × 297 mm</option>
            <option value="a5">A5 · 148 × 210 mm</option>
          </select>
        </label>
        <label>
          Document columns
          <select
            value={doc.settings.columns}
            onChange={(e) => setting("columns", +e.target.value)}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} column{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="field-pair">
          <label>
            Margins (px)
            <input
              type="number"
              min="25"
              max="100"
              value={doc.settings.margin}
              onChange={(e) =>
                setting("margin", Math.min(100, Math.max(25, +e.target.value)))
              }
            />
          </label>
          <label>
            Gutter (px)
            <input
              type="number"
              min="10"
              max="60"
              value={doc.settings.gutter}
              onChange={(e) =>
                setting("gutter", Math.min(60, Math.max(10, +e.target.value)))
              }
            />
          </label>
        </div>
      </section>
      <section className="panel-section">
        <h3>This page</h3>
        <label>
          Page columns
          <select
            value={page.columns ?? ""}
            onChange={(e) =>
              patchPage("columns", e.target.value ? +e.target.value : undefined)
            }
          >
            <option value="">Use document setting</option>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button className="wide-button" onClick={() => onDialog("background")}>
          <ImagePlus size={16} /> Background image
        </button>
        {page.background && (
          <>
            <label>
              Background opacity
              <input
                type="range"
                min="0"
                max="1"
                step=".05"
                value={page.backgroundOpacity ?? 0.22}
                onChange={(e) =>
                  patchPage("backgroundOpacity", +e.target.value)
                }
              />
            </label>
            <button
              className="subtle"
              onClick={() => patchPage("background", undefined)}
            >
              Remove background
            </button>
          </>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={!!page.hideNumber}
            onChange={(e) => patchPage("hideNumber", e.target.checked)}
          />{" "}
          Hide page number
        </label>
      </section>
      {editor && !image && (
        <section className="panel-section">
          <h3>Selected paragraph</h3>
          <div className="field-pair">
            <label>
              Indent (px)
              <input
                type="number"
                min="0"
                max="120"
                step="12"
                value={block.indent || 0}
                onChange={(e) =>
                  blockSetting(
                    "indent",
                    Math.min(120, Math.max(0, +e.target.value)),
                  )
                }
              />
            </label>
            <label>
              Line height
              <select
                value={block.lineHeight || ""}
                onChange={(e) =>
                  blockSetting("lineHeight", e.target.value || null)
                }
              >
                <option value="">Document</option>
                {[1.1, 1.2, 1.4, 1.5, 1.75, 2].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="field-pair">
            <label>
              Space before (px)
              <input
                type="number"
                min="0"
                max="100"
                value={parseFloat(block.spaceBefore) || 0}
                onChange={(e) =>
                  blockSetting(
                    "spaceBefore",
                    `${Math.min(100, Math.max(0, +e.target.value))}px`,
                  )
                }
              />
            </label>
            <label>
              Space after (px)
              <input
                type="number"
                min="0"
                max="100"
                value={parseFloat(block.spaceAfter) || 0}
                onChange={(e) =>
                  blockSetting(
                    "spaceAfter",
                    `${Math.min(100, Math.max(0, +e.target.value))}px`,
                  )
                }
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={!!block.keep}
              onChange={(e) => blockSetting("keep", e.target.checked)}
            />{" "}
            Keep with next block
          </label>
        </section>
      )}
      {image && (
        <section className="panel-section">
          <h3>Selected image</h3>
          <label>
            Width · {image.width}%
            <input
              aria-label="Image width"
              type="range"
              min="10"
              max="100"
              value={image.width}
              onChange={(e) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes("image", { width: +e.target.value })
                  .run()
              }
            />
          </label>
          <label>
            Text flow
            <select
              aria-label="Text flow"
              value={image.flow}
              onChange={(e) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes("image", { flow: e.target.value })
                  .run()
              }
            >
              <option value="block">Separate block</option>
              <option value="left">Wrap on right</option>
              <option value="right">Wrap on left</option>
            </select>
          </label>
          <label>
            Image blending
            <select
              value={image.blend}
              onChange={(e) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes("image", { blend: e.target.value })
                  .run()
              }
            >
              <option value="normal">Normal</option>
              <option value="multiply">Multiply into paper</option>
            </select>
          </label>
          <label>
            Alternative text
            <input
              value={image.alt || ""}
              onChange={(e) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes("image", { alt: e.target.value })
                  .run()
              }
            />
          </label>
          <button
            className="subtle"
            onClick={() => editor?.chain().focus().deleteSelection().run()}
          >
            Delete image
          </button>
        </section>
      )}
      {editor?.isActive("table") && (
        <section className="panel-section">
          <h3>Selected table</h3>
          <div className="button-grid">
            <button onClick={() => editor.chain().focus().addRowAfter().run()}>
              + Row
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              + Column
            </button>
            <button onClick={() => editor.chain().focus().deleteRow().run()}>
              − Row
            </button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()}>
              − Column
            </button>
            <button onClick={() => editor.chain().focus().mergeCells().run()}>
              Merge cells
            </button>
            <button onClick={() => editor.chain().focus().splitCell().run()}>
              Split cell
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Header row
            </button>
            <button onClick={() => editor.chain().focus().deleteTable().run()}>
              Delete table
            </button>
          </div>
        </section>
      )}
    </>
  );
}
