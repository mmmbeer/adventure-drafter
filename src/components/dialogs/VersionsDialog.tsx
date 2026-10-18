import { DialogActions } from "../Modal";
import { Save } from "lucide-react";
import { saveVersion, listVersions } from "../../lib/storage";
import { useDesk } from "../../state/context";
export function VersionsDialog() {
  const {
    doc,
    docRef,
    versions,
    setVersions,
    versionName,
    setVersionName,
    report,
    activate,
  } = useDesk();
  return (
    <>
      <p>
        Keep named checkpoints before a major revision. Autosave keeps your
        latest draft separately.
      </p>
      <label>
        Version name
        <input
          value={versionName}
          placeholder="Before the final encounter rewrite"
          onChange={(e) => setVersionName(e.target.value)}
        />
      </label>

      <div className="version-list">
        {versions.map((v) => (
          <div key={v.key}>
            <span>
              <b>{v.label}</b>
              <small>{new Date(v.date).toLocaleString()}</small>
            </span>
            <button
              onClick={async () => {
                await saveVersion(docRef.current, "Before restoring a version");
                const next = {
                  ...v.document,
                  id: doc.id,
                  updatedAt: new Date().toISOString(),
                };
                await activate(next);
                report(
                  "Version restored. The previous draft was kept as a checkpoint.",
                );
              }}
            >
              Restore
            </button>
          </div>
        ))}
        {!versions.length && <p className="help">No named versions yet.</p>}
      </div>
      <DialogActions>
        <button
          className="primary"
          onClick={async () => {
            try {
              await saveVersion(doc, versionName || "Saved version");
              setVersionName("");
              setVersions(await listVersions(doc.id));
              report("Version saved.");
            } catch (e) {
              report((e as Error).message);
            }
          }}
        >
          <Save size={15} /> Save version
        </button>
      </DialogActions>
    </>
  );
}
