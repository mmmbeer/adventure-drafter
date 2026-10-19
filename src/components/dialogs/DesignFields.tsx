import type { NamedStyle, PageMaster } from "../../lib/authoring-types";
export function StyleFields({
  value,
  onChange,
  fonts,
}: {
  value: NamedStyle;
  onChange: (v: NamedStyle) => void;
  fonts: string[];
}) {
  const patch = (key: keyof NamedStyle, val: unknown) =>
    onChange({ ...value, [key]: val });
  return (
    <>
      <label>
        Font family
        <select
          value={value.fontFamily}
          onChange={(e) => patch("fontFamily", e.target.value)}
        >
          {fonts.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <div className="field-pair">
        <label>
          Size (px)
          <input
            aria-label="Style font size"
            type="number"
            min="8"
            max="72"
            value={value.fontSize}
            onChange={(e) =>
              patch("fontSize", Math.max(8, Math.min(72, +e.target.value)))
            }
          />
        </label>
        <label>
          Line height
          <input
            type="number"
            min="1"
            max="3"
            step=".05"
            value={value.lineHeight}
            onChange={(e) =>
              patch("lineHeight", Math.max(1, Math.min(3, +e.target.value)))
            }
          />
        </label>
      </div>
      <div className="field-pair">
        <label>
          Space before
          <input
            type="number"
            min="0"
            max="100"
            value={value.spaceBefore}
            onChange={(e) =>
              patch("spaceBefore", Math.max(0, Math.min(100, +e.target.value)))
            }
          />
        </label>
        <label>
          Space after
          <input
            type="number"
            min="0"
            max="100"
            value={value.spaceAfter}
            onChange={(e) =>
              patch("spaceAfter", Math.max(0, Math.min(100, +e.target.value)))
            }
          />
        </label>
      </div>
      <div className="field-pair">
        <label>
          Text color
          <input
            type="color"
            value={value.color}
            onChange={(e) => patch("color", e.target.value)}
          />
        </label>
        <label>
          Box fill
          <input
            type="color"
            value={value.background}
            onChange={(e) => patch("background", e.target.value)}
          />
        </label>
      </div>
      {(["bold", "italic", "border"] as const).map((key) => (
        <label className="check" key={key}>
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(e) => patch(key, e.target.checked)}
          />
          {key === "border" ? "Box border and fill" : key}
        </label>
      ))}
      <div
        className="style-preview"
        style={{
          fontFamily: value.fontFamily,
          fontSize: value.fontSize,
          lineHeight: value.lineHeight,
          color: value.color,
          fontWeight: value.bold ? 700 : 400,
          fontStyle: value.italic ? "italic" : "normal",
          background: value.border ? value.background : undefined,
          border: value.border ? `1px solid ${value.color}` : undefined,
        }}
      >
        Beyond the lantern light, the adventure begins.
      </div>
    </>
  );
}
export function MasterFields({
  value,
  onChange,
}: {
  value: PageMaster;
  onChange: (v: PageMaster) => void;
}) {
  const patch = (key: keyof PageMaster, val: unknown) =>
    onChange({ ...value, [key]: val });
  return (
    <>
      <div className="field-pair">
        <label>
          Columns
          <select
            value={value.columns}
            onChange={(e) => patch("columns", +e.target.value)}
          >
            {[1, 2, 3].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Margins (px)
          <input
            type="number"
            min="25"
            max="150"
            value={value.margin}
            onChange={(e) =>
              patch("margin", Math.max(25, Math.min(150, +e.target.value)))
            }
          />
        </label>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={value.mirror}
          onChange={(e) => patch("mirror", e.target.checked)}
        />
        Mirror binding margins
      </label>
      {value.mirror && (
        <label>
          Inside margin (px)
          <input
            type="number"
            min="25"
            max="150"
            value={value.innerMargin}
            onChange={(e) =>
              patch("innerMargin", Math.max(25, Math.min(150, +e.target.value)))
            }
          />
        </label>
      )}
      <label>
        Odd-page header
        <input
          aria-label="Odd-page header"
          value={value.headerOdd}
          onChange={(e) => patch("headerOdd", e.target.value)}
        />
      </label>
      <label>
        Even-page header
        <input
          aria-label="Even-page header"
          value={value.headerEven}
          onChange={(e) => patch("headerEven", e.target.value)}
        />
      </label>
      <label>
        Footer
        <input
          aria-label="Master footer"
          value={value.footer}
          onChange={(e) => patch("footer", e.target.value)}
        />
      </label>
      <p className="help">
        Use {"{chapter}"}, {"{title}"}, {"{author}"}, {"{page}"}, and{" "}
        {"{pages}"} in running text. Page artwork overrides master artwork.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={value.hideHeader}
          onChange={(e) => patch("hideHeader", e.target.checked)}
        />
        Hide running header
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={value.hideNumber}
          onChange={(e) => patch("hideNumber", e.target.checked)}
        />
        Hide page number
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={!!value.paper}
          onChange={(e) =>
            patch("paper", e.target.checked ? "#ffffff" : undefined)
          }
        />
        Override paper color
      </label>
      {value.paper && (
        <label>
          Paper color
          <input
            type="color"
            value={value.paper}
            onChange={(e) => patch("paper", e.target.value)}
          />
        </label>
      )}
      {value.background && (
        <>
          <label>
            Artwork opacity
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={value.backgroundOpacity}
              onChange={(e) => patch("backgroundOpacity", +e.target.value)}
            />
          </label>
          <button onClick={() => patch("background", undefined)}>
            Remove master artwork
          </button>
        </>
      )}
    </>
  );
}
