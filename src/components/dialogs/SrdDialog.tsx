import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useDesk } from "../../state/context";
import { DialogActions } from "../Modal";
import {
  filterSrd,
  loadSrdCatalog,
  srdVersion,
  type SrdEntry,
  type SrdEdition,
  type SrdKind,
} from "../../lib/srd-catalog";
import {
  makeSrdBlock,
  srdPreview,
  insertSrdBlock,
} from "../../lib/srd-content";
export default function SrdDialog() {
  const { editor, doc, report, setDialog } = useDesk();
  const [target] = useState(editor);
  const bookmark = useRef(target?.state.selection.getBookmark());
  const [edition, setEdition] = useState<SrdEdition>("2024");
  const [kind, setKind] = useState<SrdKind>("monsters");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SrdEntry[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(60);
  useEffect(() => {
    if (!target) return;
    const map: Parameters<typeof target.on<"transaction">>[1] = ({
      transaction,
    }) => {
      bookmark.current = bookmark.current?.map(transaction.mapping);
    };
    target.on("transaction", map);
    return () => {
      target.off("transaction", map);
    };
  }, [target]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setEntries([]);
    setSelected("");
    setLimit(60);
    loadSrdCatalog(edition, kind)
      .then((data) => {
        if (current) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (current) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [edition, kind, retry]);
  const matches = useMemo(() => filterSrd(entries, query), [entries, query]);
  const entry = matches.find((e) => e.id === selected);
  const block = useMemo(() => (entry ? makeSrdBlock(entry) : null), [entry]);
  const preview = useMemo(() => (block ? srdPreview(block) : ""), [block]);
  const insert = () => {
    if (!entry || !block || !target || target.isDestroyed || !bookmark.current)
      return;
    try {
      if (!insertSrdBlock(target, block, bookmark.current))
        throw new Error(
          "Click in a writing page and try inserting this reference again.",
        );
      setDialog("");
      report(`${entry.name} · ${edition} inserted as an editable block.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <div className="field-pair">
        <label>
          Rules edition
          <select
            aria-label="SRD edition"
            value={edition}
            onChange={(e) => setEdition(e.target.value as SrdEdition)}
          >
            <option value="2014">5e 2014 · SRD 5.1</option>
            <option value="2024">
              5e 2024 · SRD {srdVersion("2024", kind)}
            </option>
          </select>
        </label>
        <label>
          Reference type
          <select
            aria-label="SRD reference type"
            value={kind}
            onChange={(e) => setKind(e.target.value as SrdKind)}
          >
            <option value="monsters">Monsters</option>
            <option value="items">Magic items</option>
          </select>
        </label>
      </div>
      <label>
        Search by name, type, challenge rating, or rarity
        <input
          autoFocus
          aria-label="Search SRD references"
          placeholder={
            kind === "monsters"
              ? "Goblin, dragon, CR 1…"
              : "Bag of Holding, wand, rare…"
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(60);
          }}
        />
      </label>
      <p className="help">
        Choose a reference to preview it, then insert an editable copy at your
        cursor. Long blocks continue across pages.
      </p>
      {loading && (
        <p role="status">Loading SRD {srdVersion(edition, kind)} references…</p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((n) => n + 1)}>Retry catalog</button>
        </div>
      )}
      {!loading && !error && (
        <>
          <p className="help" aria-live="polite">
            {matches.length} matching{" "}
            {kind === "monsters" ? "monsters" : "magic items"} · {edition}
          </p>
          <div className="srd-browser">
            <div
              className="search-results reference-results srd-results"
              aria-label="SRD results"
            >
              {matches.slice(0, limit).map((e) => (
                <button
                  key={e.id}
                  aria-pressed={e.id === selected}
                  onClick={() => setSelected(e.id)}
                >
                  <b>{e.name}</b>
                  <small>{e.summary}</small>
                </button>
              ))}
              {!matches.length && (
                <p>No references match this search in the {edition} SRD.</p>
              )}
              {matches.length > limit && (
                <button onClick={() => setLimit((n) => n + 60)}>
                  Show more results ({matches.length - limit} remaining)
                </button>
              )}
            </div>
            <div
              className="srd-preview"
              aria-label="SRD block preview"
              style={
                {
                  "--accent": doc.settings.theme.accent,
                  "--paper": doc.settings.theme.paper,
                  "--heading-font": doc.settings.theme.headingFont,
                  fontFamily: doc.settings.theme.bodyFont,
                } as CSSProperties
              }
            >
              {block ? (
                <div
                  className="tiptap"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              ) : (
                <p>Select a reference to see its complete block.</p>
              )}
            </div>
          </div>
        </>
      )}
      <p className="help">
        SRD content by Wizards of the Coast LLC ·{" "}
        <a
          href="https://www.dndbeyond.com/srd"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        . Source attribution is included with each block.
      </p>
      <DialogActions>
        <button
          className="primary"
          disabled={loading || !block || !target || target.isDestroyed}
          onClick={insert}
        >
          Insert {kind === "monsters" ? "stat block" : "magic item"}
        </button>
      </DialogActions>
    </>
  );
}
