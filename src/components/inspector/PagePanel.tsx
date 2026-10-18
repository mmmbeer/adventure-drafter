import { ImagePlus } from "lucide-react";
import { useInspector } from "./context";

export function PagePanel() {
  const { doc, page, patchPage, onDialog } = useInspector();
  return (
    <>
      <section className="panel-section">
        <h3>Selected page</h3>
        <p className="help">These settings affect only this page.</p>
        <label>Page columns
          <select value={page.columns ?? ""} onChange={(e) =>
            patchPage("columns", e.target.value ? Number(e.target.value) : undefined)
          }>
            <option value="">Use document setting ({doc.settings.columns})</option>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={!!page.hideNumber}
            onChange={(e) => patchPage("hideNumber", e.target.checked)}/>
          Hide page number
        </label>
        {page.kind === "body" && <label className="check">
          <input type="checkbox" checked={!!page.breakBefore}
            onChange={(e) => patchPage("breakBefore", e.target.checked)}/>
          Keep a manual page break
        </label>}
      </section>
      <section className="panel-section">
        <h3>Page artwork</h3>
        <button className="wide-button" onClick={() => onDialog("background")}>
          <ImagePlus size={16}/> Background image
        </button>
        {page.background && <>
          <label>Background opacity
            <input type="range" min="0" max="1" step=".05"
              value={page.backgroundOpacity ?? .22}
              onChange={(e) => patchPage("backgroundOpacity", +e.target.value)}/>
          </label>
          <button className="subtle" onClick={() => patchPage("background", undefined)}>
            Remove background
          </button>
        </>}
      </section>
    </>
  );
}
