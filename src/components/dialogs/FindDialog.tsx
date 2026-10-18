import { DialogActions } from "../Modal";
import { useDesk } from "../../state/context";
export function FindDialog() {
  const {
    doc,
    setDialog,
    query,
    setQuery,
    replacement,
    setReplacement,
    editors,
    report,
    matches,
    goPage,
  } = useDesk();
  return (
    <>
      <label>
        Find
        <input
          autoFocus
          aria-label="Find text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label>
        Replace with
        <input
          aria-label="Replace text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
        />
      </label>
      <div className="button-row">
        <span>
          {matches.length}
          {matches.length === 200 ? "+" : ""} matches
        </span>
      </div>
      <div className="search-results">
        {matches.map((m, i) => (
          <button
            key={i}
            onClick={() => {
              setDialog("");
              goPage(m.pageId);
              const ed = editors.current.get(m.pageId);
              ed?.chain()
                .focus()
                .setTextSelection({ from: m.from, to: m.to })
                .run();
            }}
          >
            <small>
              Page {doc.pages.findIndex((p) => p.id === m.pageId) + 1}
            </small>
            <span>{m.text}</span>
          </button>
        ))}
      </div>
      <p className="help">
        Searches text runs on writing pages. Matches spanning separately
        formatted runs are not combined.
      </p>
      <DialogActions>
        <button
          disabled={!matches.length}
          onClick={() => {
            for (const m of [...matches].reverse()) {
              const ed = editors.current.get(m.pageId);
              ed?.chain()
                .insertContentAt(
                  { from: m.from, to: m.to },
                  replacement ? { type: "text", text: replacement } : [],
                )
                .run();
            }
            report("Matches replaced.");
            setDialog("");
          }}
        >
          Replace all displayed matches
        </button>
      </DialogActions>
    </>
  );
}
