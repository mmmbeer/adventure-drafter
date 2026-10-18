import { useInspector } from "./context";
import { MERGE_TAGS, mergeNode } from "../../lib/merge-tags";
import type { MergeTagName } from "../../lib/merge-tags";
export function SelectionPanel() {
  const { editor, image, block, blockSetting } = useInspector();
  return (
    <>
      <section className="panel-section">
        <h3>Current selection</h3>
        <p className="help">{!editor ? "Click in a writing page to inspect its contents."
          : image ? "Illustration"
          : editor.isActive("table") ? "Table cell"
          : editor.isActive("statBlock") ? "Stat block"
          : editor.isActive("callout") ? "Callout"
          : editor.isActive("heading") ? "Heading"
          : editor.isActive("bulletList") || editor.isActive("orderedList") ? "List"
          : "Paragraph"}</p>
        {editor && <label>Insert dynamic field
          <select aria-label="Inspector merge tag" value="" onChange={(e) =>
            editor.chain().focus().insertContent(mergeNode(e.target.value as MergeTagName)).run()
          }>
            <option value="">Choose a merge tag…</option>
            {MERGE_TAGS.map((tag) => <option key={tag.name} value={tag.name}>{`{${tag.name}}`} · {tag.label}</option>)}
          </select>
        </label>}
      </section>
      {editor?.isActive("heading") && <section className="panel-section">
        <h3>Heading</h3>
        <label>Level
          <select aria-label="Selected heading level"
            value={editor.getAttributes("heading").level ?? 1}
            onChange={(e) => editor.chain().focus().updateAttributes("heading",
              { level: Number(e.target.value) }).run()}>
            {Array.from({ length: 9 }, (_, i) => <option key={i + 1} value={i + 1}>
              Heading {i + 1}
            </option>)}
          </select>
        </label>
      </section>}
      {editor && <section className="panel-section">
        <h3>Character formatting</h3>
        <div className="button-grid">
          {(["bold", "italic", "underline", "strike"] as const).map((mark) =>
            <button key={mark} aria-label={`Toggle ${mark}`}
              aria-pressed={editor.isActive(mark)}
              onMouseDown={(e) => e.preventDefault()}
              className={editor.isActive(mark) ? "active" : ""}
              onClick={() => editor.chain().focus().toggleMark(mark).run()}>
              {mark[0].toUpperCase() + mark.slice(1)}
            </button>)}
        </div>
      </section>}
      {editor && (editor.isActive("statBlock") || editor.isActive("callout")) && (
        <section className="panel-section">
          <h3>Selected layout box</h3>
          {(() => {
            const type = editor.isActive("statBlock") ? "statBlock" : "callout";
            const attrs = editor.getAttributes(type);
            return <>
              <label>Box width · {attrs.width ?? 100}%
                <input type="range" min="20" max="100" value={attrs.width ?? 100}
                  onChange={(e) => editor.chain().focus().updateAttributes(type,
                    { width: Number(e.target.value) }).run()}/>
              </label>
              <label>Flow around box
                <select value={attrs.flow ?? "block"} onChange={(e) =>
                  editor.chain().focus().updateAttributes(type, { flow: e.target.value }).run()}>
                  <option value="block">Block</option>
                  <option value="left">Wrap on right</option>
                  <option value="right">Wrap on left</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={!!attrs.wide}
                  onChange={(e) => editor.chain().focus().updateAttributes(type,
                    { wide: e.target.checked }).run()}/>
                Span columns
              </label>
            </>;
          })()}
        </section>
      )}
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
          <label className="check">
            <input type="checkbox" checked={!!editor.getAttributes("table").wide}
              onChange={(e) => editor.chain().focus().updateAttributes("table",
                { wide: e.target.checked }).run()}/>
            Full page width
          </label>
          <p className="help">Span all page columns. Drag a column edge to resize it.</p>
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

