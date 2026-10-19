import {
  applyStylePreset,
  applyFontPairing,
  fontPairings,
} from "../../lib/appearance";
import { ColorThemePanel } from "./ColorThemePanel";
import { themes } from "../../lib/model";
import { useInspector } from "./context";
export function StylePanel() {
  const { doc, onFont, setting, allFonts, onDialog } = useInspector();
  const pairing = fontPairings.find(
    (p) =>
      p.headingFont === doc.settings.theme.headingFont &&
      p.bodyFont === doc.settings.theme.bodyFont,
  );
  return (
    <>
      <div className="panel-heading">
        <span>DOCUMENT STYLE</span>
        <span className="small-tag">{themes.length} templates</span>
      </div>
      <section className="panel-section">
        <button className="wide-button" onClick={() => onDialog("designs")}>
          Manage styles and page masters
        </button>
      </section>
      <ColorThemePanel />
      <div className="panel-heading">
        <span>STYLE PRESETS</span>
      </div>
      <div className="templates">
        {[...themes, ...(doc.savedThemes ?? [])].map((t) => (
          <button
            className={`template ${doc.settings.theme.id === t.id ? "chosen" : ""}`}
            key={t.id}
            onClick={() =>
              setting("theme", applyStylePreset(doc.settings.theme, t))
            }
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
          Font pairing
          <select
            aria-label="Font pairing"
            value={pairing?.id ?? ""}
            onChange={(e) => {
              const next = fontPairings.find((p) => p.id === e.target.value);
              if (next)
                setting("theme", applyFontPairing(doc.settings.theme, next));
            }}
          >
            <option value="" disabled>
              Custom fonts
            </option>
            {fontPairings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Heading family
          <select
            aria-label="Heading family"
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
            aria-label="Body family"
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
        <div
          className="font-preview"
          style={{
            background: doc.settings.theme.paper,
            color: doc.settings.theme.ink,
          }}
        >
          <strong
            style={{
              fontFamily: doc.settings.theme.headingFont,
              color: doc.settings.theme.accent,
            }}
          >
            The next adventure
          </strong>
          <span style={{ fontFamily: doc.settings.theme.bodyFont }}>
            Beyond the old gate, a new story begins.
          </span>
        </div>
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
    </>
  );
}
