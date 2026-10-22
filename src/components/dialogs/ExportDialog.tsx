import { useState } from "react";
import { Download } from "lucide-react";
import { useDesk } from "../../state/context";
import { DialogActions } from "../Modal";
import { InfoCard } from "../InfoCard";
import { ExportInformation } from "./ExportInformation";
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
          <div
            key={item.id}
            className={`export-format-option ${format === item.id ? "selected" : ""}`}
          >
            <label>
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
            <InfoCard label={`${item.name} information`}>
              <ExportInformation format={item.id} />
            </InfoCard>
          </div>
        ))}
      </fieldset>
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
