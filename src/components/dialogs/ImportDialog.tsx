import { DialogActions } from "../Modal";
import { Upload } from "lucide-react";
import { useDesk } from "../../state/context";
export function ImportDialog() {
  const {
    busy,
    importSource,
    setImportSource,
    homebrew,
    setHomebrew,
    fileInput,
    importAdventure,
  } = useDesk();
  return (
    <>
      <p>Import into a new project. Your current adventure stays saved.</p>

      <div className="or">
        <span />
        or paste source
        <span />
      </div>
      <label>
        Source format
        <select
          value={homebrew ? "homebrew" : "markdown"}
          onChange={(e) => setHomebrew(e.target.value === "homebrew")}
        >
          <option value="homebrew">Homebrewery</option>
          <option value="markdown">Markdown</option>
        </select>
      </label>
      <textarea
        aria-label="Import source"
        rows={9}
        placeholder="# Your adventure…"
        value={importSource}
        onChange={(e) => setImportSource(e.target.value)}
      />

      <p className="help">
        Homebrewery page and column breaks, common note/monster blocks and
        Markdown are converted. Custom CSS is reported for review. Legacy .doc
        files must be saved as .docx first.
      </p>
      <DialogActions>
        <button
          className="wide-button import-file"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={23} />
          <span>
            <b>Choose a file</b>
            <small>
              Homebrewery · Markdown · Word (.docx) · Adventure Drafter
            </small>
          </span>
        </button>
        <button
          className="primary"
          disabled={!importSource.trim() || !!busy}
          onClick={() => importAdventure()}
        >
          Import pasted text
        </button>
      </DialogActions>
    </>
  );
}
