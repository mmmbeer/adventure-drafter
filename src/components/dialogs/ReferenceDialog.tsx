import { useState } from "react";
import { useDesk } from "../../state/context";
import { referenceTargets } from "../../lib/cross-references";
import { DialogActions } from "../Modal";
export function ReferenceDialog() {
  const { doc, editor, setDialog } = useDesk();
  const existing = editor?.isActive("crossReference")
    ? editor.getAttributes("crossReference")
    : {};
  const [query, setQuery] = useState("");
  const [targetId, setTarget] = useState(existing.targetId || "");
  const [format, setFormat] = useState(existing.format || "title-page");
  const targets = referenceTargets(doc);
  const target = targets.find((t) => t.id === targetId);
  return (
    <>
      <label>
        Find a destination
        <input
          aria-label="Find reference target"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="search-results reference-results">
        {targets
          .filter((t) =>
            `${t.title} ${t.kind}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((t) => (
            <button
              key={t.id}
              aria-pressed={targetId === t.id}
              onClick={() => setTarget(t.id)}
            >
              <b>{t.title}</b>
              <small>
                {t.kind} · page {t.page}
              </small>
            </button>
          ))}
      </div>
      <label>
        Display
        <select
          aria-label="Reference format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="title-page">Title and page number</option>
          <option value="title">Title only</option>
          <option value="page">Page number only</option>
        </select>
      </label>
      <p className="help">
        References follow their destination when it moves or is renamed. Deleted
        destinations are marked in the document and outline.
      </p>
      <DialogActions>
        <button
          className="primary"
          disabled={!editor || !target}
          onClick={() => {
            if (!editor || !target) return;
            const attrs = { targetId, format, fallback: target.title };
            if (editor.isActive("crossReference"))
              editor
                .chain()
                .focus()
                .updateAttributes("crossReference", attrs)
                .run();
            else
              editor
                .chain()
                .focus()
                .insertContent({ type: "crossReference", attrs })
                .run();
            setDialog("");
          }}
        >
          {existing.targetId ? "Update reference" : "Insert reference"}
        </button>
      </DialogActions>
    </>
  );
}
