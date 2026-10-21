import { DocumentDetails } from "./DocumentDetails";
import { allMasters } from "../../lib/designs";
import { BookOpen, Download } from "lucide-react";
import { useInspector } from "./context";
import { page as createPage, entries, keywordIndex } from "../../lib/model";

export function DocumentPanel() {
  const { doc, update, setting, onDialog } = useInspector();
  const hasToc = doc.pages.some((p) => p.kind === "toc");
  const hasIndex = doc.pages.some((p) => p.kind === "index");
  const insertGenerated = (kind: "toc" | "index") =>
    update((d) => {
      if (d.pages.some((p) => p.kind === kind)) return d;
      const pages = [...d.pages];
      if (kind === "toc") {
        const firstBody = pages.findIndex((p) => p.kind === "body");
        pages.splice(
          firstBody < 0 ? pages.length : firstBody,
          0,
          createPage(kind),
        );
      } else pages.push(createPage(kind));
      return { ...d, pages };
    });
  const headings = entries(doc).filter(
    (entry) => entry.level <= doc.settings.tocDepth,
  );
  const index = keywordIndex(doc);
  return (
    <>
      <DocumentDetails />
      <section className="panel-section">
        <h3>Document layout</h3>
        <label>
          Default body page master
          <select
            aria-label="Default page master"
            value={doc.settings.defaultMasterId || ""}
            onChange={(e) =>
              setting("defaultMasterId", e.target.value || undefined)
            }
          >
            <option value="">Document settings</option>
            {allMasters(doc).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
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
          Default columns
          <select
            value={doc.settings.columns}
            onChange={(e) => setting("columns", +e.target.value)}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} column{n === 1 ? "" : "s"}
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
        <h3>Automatic table of contents</h3>
        <label>
          Include headings through
          <select
            aria-label="Contents heading depth"
            value={doc.settings.tocDepth}
            onChange={(e) => setting("tocDepth", Number(e.target.value))}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Heading {i + 1}
              </option>
            ))}
          </select>
        </label>
        <p className="help">
          {headings.length} headings included. Contents and page references
          update as headings change, move or flow.
        </p>
        {!hasToc && (
          <button
            className="wide-button"
            onClick={() => insertGenerated("toc")}
          >
            <BookOpen size={15} /> Add automatic contents page
          </button>
        )}
      </section>
      <section className="panel-section">
        <h3>Automatic keyword index</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={doc.settings.autoIndexHeadings !== false}
            onChange={(e) => setting("autoIndexHeadings", e.target.checked)}
          />
          Include section headings
        </label>
        {doc.settings.autoIndexHeadings !== false && (
          <label>
            Index headings through
            <select
              aria-label="Index heading depth"
              value={doc.settings.indexDepth ?? 3}
              onChange={(e) => setting("indexDepth", Number(e.target.value))}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Heading {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Additional index terms (one per line)
          <textarea
            aria-label="Index keywords"
            rows={6}
            value={doc.indexTerms.join("\n")}
            onChange={(e) =>
              update((d) => ({ ...d, indexTerms: e.target.value.split("\n") }))
            }
          />
        </label>
        <p className="help">
          {index.length} index entries. References update from the matching text
          on body pages.
        </p>
        {!hasIndex && (
          <button
            className="wide-button"
            onClick={() => insertGenerated("index")}
          >
            <BookOpen size={15} /> Add automatic index page
          </button>
        )}
      </section>
      <section className="panel-section">
        <h3>Publish</h3>
        <button
          className="primary wide-button"
          onClick={() => onDialog("export")}
        >
          <Download size={15} /> Export PDF / DOCX
        </button>
      </section>
    </>
  );
}
