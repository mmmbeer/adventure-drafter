import { themes } from "../../lib/model";
import { useInspector } from "./context";
export function StylePanel() {
  const { doc, onFont, setting, allFonts } = useInspector();
  return (
    <>
      <div className="panel-heading">
        <span>DOCUMENT STYLE</span>
        <span className="small-tag">{themes.length} templates</span>
      </div>
      <div className="templates">
        {themes.map((t) => (
          <button
            className={`template ${doc.settings.theme.id === t.id ? "chosen" : ""}`}
            key={t.id}
            onClick={() => setting("theme", { ...t })}
          >
            <span
              className="template-sample"
              style={{
                background: t.paper,
                color: t.accent,
                fontFamily: t.headingFont,
              }}
            >
              Aa
              <span style={{ background: t.accent }} />
            </span>
            <span>
              <b>{t.name}</b>
              <small>{t.description}</small>
            </span>
            <i className="radio" />
          </button>
        ))}
      </div>
      <section className="panel-section">
        <h3>Typography</h3>
        <label>
          Heading family
          <select
            value={doc.settings.theme.headingFont}
            onChange={(e) =>
              setting("theme", {
                ...doc.settings.theme,
                headingFont: e.target.value,
              })
            }
          >
            {allFonts.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          Body family
          <select
            value={doc.settings.theme.bodyFont}
            onChange={(e) =>
              setting("theme", {
                ...doc.settings.theme,
                bodyFont: e.target.value,
              })
            }
          >
            {allFonts.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <div className="field-pair">
          <label>
            Body size
            <input
              aria-label="Body size"
              type="number"
              min="10"
              max="24"
              value={doc.settings.fontSize}
              onChange={(e) =>
                setting("fontSize", Math.min(24, Math.max(10, +e.target.value)))
              }
            />
          </label>
          <label>
            Line height
            <input
              type="number"
              min="1.1"
              max="2"
              step=".05"
              value={doc.settings.lineHeight}
              onChange={(e) =>
                setting(
                  "lineHeight",
                  Math.min(2, Math.max(1.1, +e.target.value)),
                )
              }
            />
          </label>
        </div>
        <button className="subtle" onClick={onFont}>
          + Add a font file
        </button>
        <p className="help">
          20 font families are bundled. Custom fonts travel with your project.
        </p>
      </section>
      <section className="panel-section">
        <h3>Palette</h3>
        <div className="palette">
          {(["paper", "ink", "accent"] as const).map((k) => (
            <label key={k}>
              <input
                aria-label={`${k} color`}
                type="color"
                value={doc.settings.theme[k]}
                onChange={(e) =>
                  setting("theme", {
                    ...doc.settings.theme,
                    [k]: e.target.value,
                  })
                }
              />
              <span>{k}</span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
