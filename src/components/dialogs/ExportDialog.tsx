import { useState } from "react";
import { Download } from "lucide-react";
import { useDesk } from "../../state/context";
import { DialogActions } from "../Modal";
import { exportPageChoices } from "../../lib/export-capture";
import type { ExportFormat } from "../../state/usePublishingActions";

const formats: { id: ExportFormat; name: string; detail: string }[] = [
  {
    id: "docx",
    name: "Word document (.docx)",
    detail: "Editable text, headings, tables and artwork.",
  },
  {
    id: "pdf",
    name: "PDF (.pdf)",
    detail: "Rendered pages with searchable text, links and bookmarks.",
  },
  {
    id: "markdown",
    name: "Markdown (.md)",
    detail: "Portable text, tables, links and embedded artwork.",
  },
  {
    id: "image",
    name: "Page image (.png)",
    detail: "One rendered page at 300 DPI.",
  },
];
export function ExportDialog() {
  const { doc, busy, publish, activePage } = useDesk();
  const [format, setFormat] = useState<ExportFormat>("docx");
  const pages = exportPageChoices(doc);
  const [pageKey, setPageKey] = useState(
    () =>
      pages.find((p) => p.pageId === activePage.id)?.key || pages[0]?.key || "",
  );
  const selectedPage = pages.find((p) => p.key === pageKey);
  return (
    <>
      <fieldset className="export-format-options" disabled={!!busy}>
        <legend>Export format</legend>
        {formats.map((item) => (
          <label key={item.id} className={format === item.id ? "selected" : ""}>
            <input
              type="radio"
              name="export-format"
              value={item.id}
              checked={format === item.id}
              onChange={() => setFormat(item.id)}
            />
            <span>
              <b>{item.name}</b>
              <small>{item.detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {format === "docx" && (
        <section className="export-limits" aria-label="Word export limitations">
          <b>Word export limitations</b>
          <p>
            Text and tables stay editable. Font names, sizes, colors, paper,
            graphical rules, column widths and merged cells follow the document.
            Install the chosen fonts on the device opening the file. Fonts are
            not embedded.
          </p>
          <p>
            Word lays out text differently. Line wrapping, table continuation,
            column and page breaks can shift. Wide blocks use Word sections.
            Continued tables remain separate editable fragments. Floating
            shapes, transparency and text wrapping around artwork may differ.
            Paper colors use native Word shapes. Background artwork stays
            separate from the editable text.
          </p>
          <p>
            Page numbers in headers and footers update in Word. Contents, index
            and cross-reference labels reflect the export and may need updating
            after edits.
          </p>
        </section>
      )}
      {format === "pdf" && (
        <p className="export-limits">
          Preserves the on-screen fonts, sizes, colors, paper, graphical rules
          and table breaks at 300 DPI. Visible pages are flattened, with a
          searchable text layer.
        </p>
      )}
      {format === "markdown" && (
        <p className="export-limits">
          Markdown preserves content and rejoins continued tables. It cannot
          preserve paper colors, fonts, font sizes or exact page and column
          layouts. Merged tables use HTML and artwork is embedded. Display
          depends on your Markdown reader.
        </p>
      )}
      {format === "image" && (
        <>
          <label>
            Page to export
            <select
              aria-label="Page to export"
              value={pageKey}
              onChange={(e) => setPageKey(e.target.value)}
            >
              {pages.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <p className="export-limits">
            Preserves the selected physical page, including continued contents
            and index pages, at 300 DPI.
          </p>
        </>
      )}
      <DialogActions>
        <button
          className="primary"
          disabled={!!busy || (format === "image" && !selectedPage)}
          onClick={() => publish(format, selectedPage)}
        >
          <Download size={14} /> Export{" "}
          {format === "docx"
            ? "Word document"
            : format === "pdf"
              ? "PDF"
              : format === "markdown"
                ? "Markdown"
                : "page image"}
        </button>
      </DialogActions>
    </>
  );
}
