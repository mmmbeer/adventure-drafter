import { DialogActions } from "../Modal";
import { Upload } from "lucide-react";
import { useDesk } from "../../state/context";
import { WordPasteField } from "./WordPasteField";
import { isWordHtml, normalizeWordHtml } from "../../lib/word-html";
import { cleanHtml } from "../../lib/editor";
export function ImportDialog() {
  const {
    busy,
    importSource,
    setImportSource,
    importFormat,
    setImportFormat,
    fileInput,
    importAdventure,
  } = useDesk();
  return (
    <>
      <p>Import into a new project. Your current adventure stays saved.</p>
      <button
        className="wide-button import-file"
        disabled={!!busy}
        onClick={() => fileInput.current?.click()}
      >
        <Upload size={23} />
        <span>
          <b>Choose a file</b>
          <small>
            Word (.docx) · Homebrewery · Markdown · Adventure Drafter
          </small>
        </span>
      </button>
      <div className="or">
        <span />
        or paste source
        <span />
      </div>
      <label>
        Source format
        <select
          aria-label="Source format"
          value={importFormat}
          onChange={(e) => {
            setImportFormat(e.target.value);
            if (e.target.value === "word" || importFormat === "word")
              setImportSource("");
          }}
        >
          <option value="word">Word document</option>
          <option value="homebrew">Homebrewery</option>
          <option value="markdown">Markdown</option>
        </select>
      </label>
      {importFormat === "word" ? (
        <>
          <p>
            Copy in Word, then paste below. You can also paste directly onto an
            adventure page.
          </p>
          <WordPasteField source={importSource} onChange={setImportSource} />
        </>
      ) : (
        <textarea
          aria-label="Import source"
          rows={9}
          placeholder="# Your adventure…"
          value={importSource}
          onChange={(e) => setImportSource(e.target.value)}
          onPaste={(e) => {
            const html = e.clipboardData.getData("text/html");
            if (!isWordHtml(html)) return;
            e.preventDefault();
            setImportFormat("word");
            setImportSource(cleanHtml(normalizeWordHtml(html)));
          }}
        />
      )}

      <p className="help">
        Word Title, Subtitle and Heading 1–9 use matching adventure styles.
        Normal and Body Text use the adventure's body style. Lists, quotes,
        tables, bold and italic stay editable. Paste as plain text cannot retain
        Word styles. Upload .docx to include embedded images. Homebrewery page
        and column breaks, common note/monster blocks and Markdown are
        converted. Custom CSS is reported for review. Legacy .doc files must be
        saved as .docx first.
      </p>
      <DialogActions>
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
