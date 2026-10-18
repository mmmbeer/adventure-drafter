import { DialogActions } from "../Modal";
import { Download, Plus, Trash2, BookOpen } from "lucide-react";
import { requestPersistence } from "../../lib/storage";
import { exportProject } from "../../lib/export";
import { useDesk } from "../../state/context";
export function DocumentsDialog() {
  const { doc, setDialog, documents, setDeleteTarget, newDoc, activate } =
    useDesk();
  return (
    <>
      <div className="modal-intro">
        <p>
          Your manuscripts stay in this browser on this device. Download a
          project file to move an adventure or keep a backup.
        </p>
      </div>
      <div className="document-list">
        {documents.map((d) => (
          <div key={d.id}>
            <BookOpen size={21} />
            <button onClick={() => activate(d)}>
              <b>{d.title}</b>
              <small>
                {d.pages.length} pages ·{" "}
                {new Date(d.updatedAt).toLocaleString()}
              </small>
            </button>
            {d.id === doc.id && <span className="small-tag">Open</span>}
            <button
              aria-label={`Delete ${d.title}`}
              onClick={() => {
                setDeleteTarget({ type: "document", id: d.id });
                setDialog("delete");
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <DialogActions>
        <button className="primary" onClick={() => newDoc(true)}>
          <Plus size={16} /> Blank adventure
        </button>
        <button onClick={() => newDoc(false)}>Example adventure</button>
        <button
          className="wide-button"
          onClick={() => {
            exportProject(doc);
            requestPersistence();
          }}
        >
          <Download size={16} /> Download current project (.json)
        </button>
      </DialogActions>
    </>
  );
}
