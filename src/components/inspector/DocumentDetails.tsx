import { useEffect, useRef } from "react";
import { useInspector } from "./context";
import { useDesk } from "../../state/context";
import { physicalPageCount } from "../../lib/references";

/** Shared source fields for document placeholders, reached directly from the page. */
export function DocumentDetails() {
  const { doc, update, setting, onDialog } = useInspector();
  const { placeholderSource, setPlaceholderSource } = useDesk();
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!placeholderSource) return;
    const input = section.current?.querySelector<HTMLInputElement>(
      `[data-placeholder-source="${placeholderSource.name}"]`,
    );
    if (!input) return;
    input.scrollIntoView({ block: "nearest" });
    input.focus({ preventScroll: true });
    if (input.type === "text" && !input.readOnly) input.select();
    setPlaceholderSource(null);
  }, [placeholderSource, setPlaceholderSource]);
  return (
    <section className="panel-section" ref={section}>
      <h3>Adventure details</h3>
      {(["title", "author", "subtitle"] as const).map((name) => (
        <label key={name}>
          {name[0].toUpperCase() + name.slice(1)}
          <input
            aria-label={`Document ${name}`}
            data-placeholder-source={name}
            value={doc[name]}
            onChange={(e) => update((d) => ({ ...d, [name]: e.target.value }))}
          />
        </label>
      ))}
      <label>
        First page number
        <input
          aria-label="First page number"
          data-placeholder-source="page"
          type="number"
          min="1"
          value={doc.settings.pageStart}
          onChange={(e) => setting("pageStart", Math.max(1, +e.target.value))}
        />
      </label>
      <label>
        Total pages
        <input
          aria-label="Total pages"
          data-placeholder-source="pages"
          value={physicalPageCount(doc)}
          readOnly
          aria-describedby="total-pages-help"
        />
      </label>
      <p className="help" id="total-pages-help">
        Calculated from the document, including continued contents and index
        pages.
      </p>
      <label>
        Footer text
        <input
          aria-label="Document footer text"
          data-placeholder-source="footer"
          maxLength={500}
          value={
            doc.settings.runningText?.footerLeft ??
            (doc.settings.footer || "{author}")
          }
          onChange={(e) =>
            update((d) => ({
              ...d,
              settings: {
                ...d.settings,
                runningText: {
                  ...d.settings.runningText,
                  footerLeft: e.target.value,
                },
              },
            }))
          }
        />
      </label>
      <button className="wide-button" onClick={() => onDialog("running-text")}>
        Edit header &amp; footer
      </button>
      <p className="help">
        Click a placeholder on the page to edit its source here. Its × converts
        it to ordinary text.
      </p>
    </section>
  );
}
