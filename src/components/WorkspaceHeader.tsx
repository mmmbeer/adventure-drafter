import {
  FolderOpen,
  Download,
  Upload,
  ChevronDown,
  History,
  Check,
  Eye,
  PenLine,
} from "lucide-react";
import { useDesk } from "../state/context";
export function WorkspaceHeader() {
  const { doc, status, preview, setPreview, update, openDialog } = useDesk();
  return (
    <header className="app-header">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          openDialog("documents");
        }}
      >
        <span className="brand-icon">
          <img src="/brand-mark.svg" width="72" height="46" alt="" aria-hidden="true" />
        </span>
        <span>
          Adventure<span className="brand-light">Drafter</span>
          <small>THE TABLETOP WRITING DESK</small>
        </span>
      </a>
      <div className="document-title">
        <input
          aria-label="Adventure title"
          value={doc.title}
          onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
        />
        <span
          className={
            status === "Save failed" ? "save-status error" : "save-status"
          }
        >
          {status.startsWith("Saved") ? (
            <Check size={12} />
          ) : (
            <span className="status-dot" />
          )}
          {status}
        </span>
      </div>
      <nav className="header-actions">
        <button aria-label="Projects" onClick={() => openDialog("documents")}>
          <FolderOpen size={16} />
          <span>Projects</span>
        </button>
        <button aria-label="Import" onClick={() => openDialog("import")}>
          <Upload size={16} />
          <span>Import</span>
        </button>
        <button
          title="Saved versions"
          aria-label="Saved versions"
          onClick={() => openDialog("versions")}
        >
          <History size={17} />
        </button>
        <button
          aria-label={preview ? "Edit" : "Preview"}
          className={preview ? "active-preview" : ""}
          onClick={() => setPreview(!preview)}
        >
          {preview ? <PenLine size={16} /> : <Eye size={16} />}
          <span>{preview ? "Edit" : "Preview"}</span>
        </button>
        <button
          aria-label="Export"
          className="primary"
          onClick={() => openDialog("export")}
        >
          <Download size={16} />
          <span>Export</span>
          <ChevronDown size={13} />
        </button>
      </nav>
    </header>
  );
}
