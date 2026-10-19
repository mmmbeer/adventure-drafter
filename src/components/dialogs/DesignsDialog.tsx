import { useEffect, useState } from "react";
import { useDesk } from "../../state/context";
import type {
  DesignLibrary,
  NamedStyle,
  PageMaster,
} from "../../lib/authoring-types";
import type { Theme } from "../../lib/types";
import { allMasters, newMaster, newStyle } from "../../lib/designs";
import { loadDesigns, saveDesigns } from "../../lib/catalog-storage";
import { fonts } from "../../lib/fonts";
import { DialogActions } from "../Modal";
import { MasterFields, StyleFields } from "./DesignFields";
const merge = <T extends { id: string }>(a: T[], b: T[]) => [
  ...a.filter((x) => !b.some((y) => y.id === x.id)),
  ...b,
];
export function DesignsDialog() {
  const { doc, activePage, update, report, setDialog } = useDesk();
  const [tab, setTab] = useState<"styles" | "masters" | "themes">("styles");
  const [catalog, setCatalog] = useState<DesignLibrary>({
    styles: [],
    masters: [],
    themes: [],
  });
  const [style, setStyle] = useState<NamedStyle>(newStyle);
  const [master, setMaster] = useState<PageMaster>(newMaster);
  const [theme, setTheme] = useState<Theme>({
    ...doc.settings.theme,
    id: crypto.randomUUID(),
    name: "My theme",
    description: "Saved custom theme",
  });
  useEffect(() => {
    loadDesigns()
      .then(setCatalog)
      .catch((e) => report(e.message));
  }, [report]);
  const designs: DesignLibrary = {
    styles: merge(catalog.styles, doc.namedStyles ?? []),
    masters: merge(catalog.masters, allMasters(doc)),
    themes: merge(catalog.themes, doc.savedThemes ?? []),
  };
  const current = tab === "styles" ? style : tab === "masters" ? master : theme;
  const save = async () => {
    try {
      const next = { ...designs };
      if (tab === "styles")
        next.styles = merge(designs.styles, [
          { ...style, name: style.name.trim() },
        ]);
      if (tab === "masters")
        next.masters = merge(designs.masters, [
          { ...master, name: master.name.trim() },
        ]);
      if (tab === "themes")
        next.themes = merge(designs.themes, [
          { ...theme, name: theme.name.trim() },
        ]);
      await saveDesigns(next);
      update((d) => ({
        ...d,
        namedStyles: next.styles,
        pageMasters: next.masters,
        savedThemes: next.themes,
      }));
      report(
        "Design saved to this project and available for other adventures.",
      );
      setDialog("");
    } catch (e) {
      report((e as Error).message);
    }
  };
  return (
    <>
      <div className="navigator-tabs" role="tablist" aria-label="Design types">
        {(["styles", "masters", "themes"] as const).map((t) => (
          <button
            role="tab"
            key={t}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "styles"
              ? "Named styles"
              : t === "masters"
                ? "Page masters"
                : "Saved themes"}
          </button>
        ))}
      </div>
      <label>
        Edit saved design
        <select
          aria-label="Saved design"
          value={
            designs[tab].some((d) => d.id === current.id) ? current.id : ""
          }
          onChange={(e) => {
            if (tab === "styles")
              setStyle(
                structuredClone(
                  designs.styles.find((s) => s.id === e.target.value) ??
                    newStyle(),
                ),
              );
            if (tab === "masters")
              setMaster(
                structuredClone(
                  designs.masters.find((s) => s.id === e.target.value) ??
                    newMaster(),
                ),
              );
            if (tab === "themes")
              setTheme(
                structuredClone(
                  designs.themes.find((s) => s.id === e.target.value) ?? {
                    ...doc.settings.theme,
                    id: crypto.randomUUID(),
                    name: "My theme",
                  },
                ),
              );
          }}
        >
          <option value="">New design…</option>
          {designs[tab].map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Name
        <input
          aria-label="Design name"
          value={current.name}
          onChange={(e) => {
            if (tab === "styles") setStyle({ ...style, name: e.target.value });
            if (tab === "masters")
              setMaster({ ...master, name: e.target.value });
            if (tab === "themes") setTheme({ ...theme, name: e.target.value });
          }}
        />
      </label>
      {tab === "styles" && (
        <StyleFields
          value={style}
          onChange={setStyle}
          fonts={[...fonts, ...doc.fonts.map((f) => f.name)]}
        />
      )}
      {tab === "masters" && (
        <>
          <MasterFields value={master} onChange={setMaster} />
          <button
            disabled={!activePage.background}
            onClick={() =>
              setMaster({
                ...master,
                background: activePage.background,
                backgroundOpacity: activePage.backgroundOpacity ?? 0.22,
              })
            }
          >
            Use selected page’s artwork
          </button>
        </>
      )}
      {tab === "themes" && (
        <>
          <div className="field-pair">
            {(["paper", "ink", "accent"] as const).map((k) => (
              <label key={k}>
                {k}
                <input
                  type="color"
                  value={theme[k]}
                  onChange={(e) => setTheme({ ...theme, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
          {(["headingFont", "bodyFont"] as const).map((k) => (
            <label key={k}>
              {k === "headingFont" ? "Heading family" : "Body family"}
              <select
                value={theme[k]}
                onChange={(e) => setTheme({ ...theme, [k]: e.target.value })}
              >
                {[...fonts, ...doc.fonts.map((f) => f.name)].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          ))}
        </>
      )}
      <p className="help">
        Saving an existing style or master updates its uses in this adventure.
        Designs are included in project backups.
      </p>
      <DialogActions>
        <button
          className="primary"
          disabled={!current.name.trim()}
          onClick={() => void save()}
        >
          Save design
        </button>
      </DialogActions>
    </>
  );
}
