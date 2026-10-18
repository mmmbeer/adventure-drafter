import { ChevronDown } from "lucide-react";
import { useInspector } from "./context";
export function PublishingPanel() {
  const { doc, update, onDialog, setting } = useInspector();
  return (
    <>
      <section className="panel-section">
        <h3>Adventure details</h3>
        <label>
          Title
          <input
            value={doc.title}
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
          />
        </label>
        <label>
          Author
          <input
            value={doc.author}
            onChange={(e) => update((d) => ({ ...d, author: e.target.value }))}
          />
        </label>
        <label>
          Footer text
          <input
            placeholder="Author name by default"
            value={doc.settings.footer}
            onChange={(e) => setting("footer", e.target.value)}
          />
        </label>
        <label>
          First page number
          <input
            type="number"
            min="1"
            value={doc.settings.pageStart}
            onChange={(e) => setting("pageStart", Math.max(1, +e.target.value))}
          />
        </label>
      </section>
      <section className="panel-section">
        <h3>Table of contents</h3>
        <label>
          Include headings through
          <select
            value={doc.settings.tocDepth}
            onChange={(e) => setting("tocDepth", +e.target.value)}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <option key={i} value={i + 1}>
                Heading {i + 1}
              </option>
            ))}
          </select>
        </label>
        <p className="help">
          Contents and index pages update as you write and move pages.
        </p>
      </section>
      <section className="panel-section">
        <h3>Keyword index</h3>
        <p className="help">
          One name, place or keyword per line. References are found across
          adventure pages, ignoring case.
        </p>
        <textarea
          aria-label="Index keywords"
          rows={8}
          value={doc.indexTerms.join("\n")}
          onChange={(e) =>
            update((d) => ({
              ...d,
              indexTerms: e.target.value.split("\n"),
            }))
          }
        />
      </section>
      <section className="panel-section">
        <h3>Publish your adventure</h3>
        <button
          className="primary wide-button"
          onClick={() => onDialog("export")}
        >
          Export PDF / DOCX <ChevronDown size={14} />
        </button>
        <p className="help">
          Preview all pages before exporting. Appearance-preserving exports
          match the page canvas.
        </p>
      </section>
    </>
  );
}
