import { useState } from "react";
import { useDesk } from "../../state/context";
import { dividers, dividerSource } from "../../lib/dividers";
import { DialogActions } from "../Modal";
export function DividerDialog() {
  const { doc, editor, setDialog } = useDesk();
  const [selected, setSelected] = useState("theme");
  const [wide, setWide] = useState(false);
  return (
    <>
      <p className="help">
        Theme divider follows the document's colors. Choose a specific design to
        keep it when the theme changes.
      </p>
      <div
        className="divider-options"
        role="group"
        aria-label="Horizontal rule designs"
      >
        {[
          {
            id: "theme",
            name: "Theme divider",
            src: dividerSource("theme", doc.settings.theme),
          },
          ...dividers,
          { id: "plain", name: "Plain line", src: undefined },
        ].map((d) => (
          <button
            type="button"
            key={d.id}
            aria-pressed={selected === d.id}
            onClick={() => setSelected(d.id)}
          >
            <span>{d.name}</span>
            {d.src ? (
              <i
                className="divider-preview"
                style={{ backgroundImage: `url('${d.src}')` }}
                aria-hidden="true"
              />
            ) : (
              <hr />
            )}
          </button>
        ))}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={wide}
          onChange={(e) => setWide(e.target.checked)}
        />
        Span all columns
      </label>
      <DialogActions>
        <button
          className="primary"
          disabled={!editor}
          onClick={() => {
            editor
              ?.chain()
              .focus()
              .insertContent({
                type: "horizontalRule",
                attrs: {
                  divider: selected === "plain" ? null : selected,
                  wide,
                },
              })
              .run();
            setDialog("");
          }}
        >
          Insert horizontal rule
        </button>
      </DialogActions>
    </>
  );
}
