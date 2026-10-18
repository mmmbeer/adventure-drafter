import { DialogActions } from "../Modal";
import { createAdventure } from "../../lib/model";
import { listDocuments, removeDocument } from "../../lib/storage";
import { useDesk } from "../../state/context";
export function DeleteDialog() {
  const {
    doc,
    setDoc,
    setActive,
    setEditor,
    setDialog,
    setDocuments,
    deleteTarget,
    update,
  } = useDesk();
  return (
    <>
      <p>
        {deleteTarget?.type === "page"
          ? "Delete this page and its contents?"
          : "Delete this adventure and its saved versions from this device?"}
      </p>
      <DialogActions>
        <button
          className="danger"
          onClick={async () => {
            if (!deleteTarget) return;
            if (deleteTarget.type === "page") {
              update((d) => ({
                ...d,
                pages: d.pages.filter((p) => p.id !== deleteTarget.id),
              }));
              setEditor(null);
              setDialog("");
            } else {
              await removeDocument(deleteTarget.id);
              if (deleteTarget.id === doc.id) {
                const next = createAdventure(true);
                setDoc(next);
                setActive(next.pages[0].id);
                setEditor(null);
              }
              setDocuments(await listDocuments());
              setDialog("documents");
            }
          }}
        >
          Delete
        </button>
      </DialogActions>
    </>
  );
}
