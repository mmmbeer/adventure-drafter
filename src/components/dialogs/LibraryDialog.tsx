import { useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { useDesk } from "../../state/context";
import { DialogActions } from "../Modal";
import type { LibraryEntry } from "../../lib/authoring-types";
import {
  libraryCategories,
  linkedBlock,
  linkedInstances,
  publishLibraryEntry,
} from "../../lib/content-library";
import { cloneBlocks, plainText } from "../../lib/anchors";
import { loadLibrary, saveLibraryEntry } from "../../lib/catalog-storage";
import { saveVersion } from "../../lib/storage";
import { LibraryEditor } from "./LibraryEditor";
function editableSource(nodes: JSONContent[]): JSONContent[] {
  return nodes.flatMap((n) =>
    n.type === "reusableBlock"
      ? editableSource(n.content ?? [])
      : [
          {
            ...n,
            ...(n.content ? { content: editableSource(n.content) } : {}),
          },
        ],
  );
}
export function LibraryDialog() {
  const { doc, docRef, editor, update, report, setDialog } = useDesk();
  const [catalog, setCatalog] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  const [draft, setDraft] = useState<LibraryEntry | null>(null);
  const [review, setReview] = useState(false),
    [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    loadLibrary()
      .then(setCatalog)
      .catch((e) => report(e.message));
  }, [report]);
  const entries = new Map(catalog.map((e) => [e.id, e]));
  for (const entry of doc.contentLibrary ?? []) {
    const stored = entries.get(entry.id);
    if (!stored || stored.revision <= entry.revision)
      entries.set(entry.id, entry);
  }
  const all = [...entries.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const entry = entries.get(selected);
  const selectedBlock = () => {
    if (!editor) return null;
    const { $from, from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth--)
      if ($from.node(depth).type.name === "reusableBlock")
        return $from.node(depth).toJSON();
    return editor.state.doc.nodeAt(from)?.type.name === "reusableBlock"
      ? editor.state.doc.nodeAt(from)!.toJSON()
      : null;
  };
  const fromSelection = () => {
    if (!editor) return;
    const linked = selectedBlock();
    const nodes = linked
      ? (linked.content ?? [])
      : editor.state.selection.empty
        ? [
            editor.state.doc
              .child(
                Math.min(
                  editor.state.doc.childCount - 1,
                  editor.state.selection.$from.index(0),
                ),
              )
              .toJSON(),
          ]
        : editor.state.selection.content().content.toJSON();
    const content = editableSource(nodes);
    if (!content.length) return;
    const original = linked ? entries.get(linked.attrs?.libraryId) : undefined;
    setDraft({
      id: original?.id ?? crypto.randomUUID(),
      name:
        original?.name ?? (plainText(content[0]).slice(0, 70) || "New content"),
      category: original?.category ?? "Other",
      tags: original?.tags ?? [],
      revision: original?.revision ?? 0,
      content,
      updatedAt: new Date().toISOString(),
    });
    setReview(false);
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const next = {
        ...draft,
        name: draft.name.trim(),
        content: editableSource(draft.content),
        revision: draft.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      await saveVersion(
        docRef.current,
        `Before updating library: ${next.name}`,
      );
      await saveLibraryEntry(next);
      update((d) => publishLibraryEntry(d, next));
      setCatalog(await loadLibrary());
      setDraft(null);
      setReview(false);
      setSelected(next.id);
      report("Library saved. Linked instances in this adventure were updated.");
    } catch (e) {
      report((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const insert = (linked: boolean) => {
    if (!entry || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent(linked ? linkedBlock(entry) : cloneBlocks(entry.content))
      .run();
    if (linked)
      update((d) => ({
        ...d,
        contentLibrary: [
          ...(d.contentLibrary ?? []).filter((e) => e.id !== entry.id),
          entry,
        ],
      }));
    setDialog("");
  };
  if (draft) {
    const affected = linkedInstances(doc, draft.id);
    return (
      <>
        <label>
          Name
          <input
            aria-label="Library entry name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <div className="field-pair">
          <label>
            Category
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  category: e.target.value as LibraryEntry["category"],
                })
              }
            >
              {libraryCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Tags
            <input
              value={draft.tags.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tags: e.target.value.split(",").map((s) => s.trim()),
                })
              }
            />
          </label>
        </div>
        {!review ? (
          <LibraryEditor
            initial={draft.content}
            onChange={(content) => setDraft((d) => (d ? { ...d, content } : d))}
          />
        ) : (
          <section className="library-review">
            <h3>Review linked replacements</h3>
            <p>
              {affected.length} linked instance(s) in this adventure will be
              replaced, including any local edits. Independent copies stay as
              they are. Other projects receive no automatic changes.
            </p>
            <b>New content</b>
            <pre>{draft.content.map(plainText).join("\n")}</pre>
            {affected.map((a) => (
              <div key={a.refId}>
                <b>
                  Current instance · page{" "}
                  {doc.pages.findIndex((p) => p.id === a.pageId) + 1} · v
                  {a.revision}
                </b>
                <pre>{a.text}</pre>
              </div>
            ))}
          </section>
        )}
        <DialogActions>
          <button
            onClick={() => {
              setDraft(null);
              setReview(false);
            }}
          >
            Back to library
          </button>
          {review ? (
            <>
              <button onClick={() => setReview(false)}>Continue editing</button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => void save()}
              >
                Save and update {affected.length} instances
              </button>
            </>
          ) : (
            <button
              className="primary"
              disabled={!draft.name.trim() || !draft.content.length}
              onClick={() => setReview(true)}
            >
              Review changes
            </button>
          )}
        </DialogActions>
      </>
    );
  }
  return (
    <>
      <p className="help">
        Save selected content or the current block. Linked instances can be
        edited on the page, then published back here after reviewing
        replacements.
      </p>
      <div className="field-pair">
        <label>
          Search
          <input
            aria-label="Search content library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {libraryCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="search-results reference-results">
        {all
          .filter(
            (e) =>
              (!category || e.category === category) &&
              `${e.name} ${e.tags.join(" ")}`
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((e) => (
            <button
              key={e.id}
              aria-pressed={selected === e.id}
              onClick={() => setSelected(e.id)}
            >
              <b>{e.name}</b>
              <small>
                {e.category} · v{e.revision}
              </small>
            </button>
          ))}
        {!all.length && (
          <p>
            No reusable content yet. Select a block in your adventure to save it
            here.
          </p>
        )}
      </div>
      {entry && (
        <pre className="library-summary">
          {entry.content.map(plainText).join("\n")}
        </pre>
      )}
      <DialogActions>
        <button disabled={!editor} onClick={fromSelection}>
          Save current content
        </button>
        <button
          disabled={!entry}
          onClick={() => {
            if (entry) {
              setDraft(structuredClone(entry));
              setReview(false);
            }
          }}
        >
          Edit entry
        </button>
        <button disabled={!entry || !editor} onClick={() => insert(false)}>
          Insert copy
        </button>
        <button
          className="primary"
          disabled={!entry || !editor}
          onClick={() => insert(true)}
        >
          Insert linked
        </button>
        <button
          disabled={!editor?.isActive("reusableBlock")}
          onClick={() => {
            if (!editor) return;
            editor.chain().focus().lift("reusableBlock").run();
            setDialog("");
          }}
        >
          Detach current instance
        </button>
      </DialogActions>
    </>
  );
}
