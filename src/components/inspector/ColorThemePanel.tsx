import { applyColorTheme, colorThemes } from "../../lib/appearance";
import { BackgroundColor } from "./BackgroundColor";
import { useInspector } from "./context";

export function ColorThemePanel() {
  const { doc, setting } = useInspector();
  const theme = doc.settings.theme;
  const palette = colorThemes.find(
    (p) => p.ink === theme.ink && p.accent === theme.accent,
  );
  return (
    <section className="panel-section">
      <h3>Colors</h3>
      <label>
        Color theme
        <select
          aria-label="Color theme"
          value={palette?.id ?? ""}
          onChange={(e) => {
            const next = colorThemes.find((p) => p.id === e.target.value);
            if (next) setting("theme", applyColorTheme(theme, next));
          }}
        >
          <option value="" disabled>
            Custom colors
          </option>
          {colorThemes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <BackgroundColor />
      <button
        className="wide-button"
        disabled={!palette || palette.paper === theme.paper}
        onClick={() =>
          palette && setting("theme", { ...theme, paper: palette.paper })
        }
      >
        Use theme's suggested background
      </button>
      <p className="help">
        Changing themes or fonts keeps your background color.
      </p>
      <div className="palette">
        {(["ink", "accent"] as const).map((key) => (
          <label key={key}>
            <input
              aria-label={`${key} color`}
              type="color"
              value={theme[key]}
              onChange={(e) =>
                setting("theme", { ...theme, [key]: e.target.value })
              }
            />
            <span>{key === "ink" ? "Text" : "Accent"}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
