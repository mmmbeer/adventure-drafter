import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";
import { useDesk } from "../state/context";
import { outlineEntries, moveSection, rearrangeSection } from "../lib/outline";
import { goToReference, missingReferences } from "../lib/cross-references";
import { saveVersion } from "../lib/storage";
import type { Adventure } from "../lib/types";
export function OutlinePanel() {
  const { doc, docRef, update, goPage, report } = useDesk();
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [drag, setDrag] = useState("");
  const entries = outlineEntries(doc),
    hidden = new Set<string>();
  const act = async (operation: (d: Adventure) => Adventure) => {
    try {
      const before = docRef.current;
      await saveVersion(before, "Before outline change");
      update(operation);
      report("Section updated. A restore point was saved.");
    } catch (error) {
      report((error as Error).message);
    }
  };
  const missing = missingReferences(doc);
  return (
    <div className="outline-panel">
      <p className="help">
        Drag a section before another. Its subheadings and content move with it.
      </p>
      {!entries.length && (
        <p className="help">Add headings to create your outline.</p>
      )}
      {entries.map((entry) => {
        if (
          entry.parent &&
          (hidden.has(entry.parent) || collapsed.has(entry.parent))
        ) {
          hidden.add(entry.id);
          return null;
        }
        const children = entries.some((e) => e.parent === entry.id);
        const siblings = entries.filter(
          (e) => e.parent === entry.parent && e.level === entry.level,
        );
        return (
          <div
            className="outline-entry"
            key={entry.id}
            draggable
            style={{ paddingLeft: Math.min(5, entry.level - 1) * 10 }}
            onDragStart={() => setDrag(entry.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (drag) void act((d) => rearrangeSection(d, drag, entry.id));
              setDrag("");
            }}
          >
            <div className="outline-title">
              <button
                aria-label={`${collapsed.has(entry.id) ? "Expand" : "Collapse"} ${entry.title}`}
                disabled={!children}
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(entry.id)) next.add(entry.id);
                    return next;
                  })
                }
              >
                {collapsed.has(entry.id) ? (
                  <ChevronRight size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
              <button
                className="outline-jump"
                onClick={() => {
                  goPage(entry.pageId);
                  goToReference(entry.id);
                }}
              >
                {entry.title || "Untitled section"}
              </button>
              <small>{entry.page}</small>
            </div>
            <div className="outline-actions">
              <button
                aria-label={`Move ${entry.title} up`}
                disabled={siblings[0]?.id === entry.id}
                onClick={() => void act((d) => moveSection(d, entry.id, -1))}
              >
                <ArrowUp size={13} />
              </button>
              <button
                aria-label={`Move ${entry.title} down`}
                disabled={siblings.at(-1)?.id === entry.id}
                onClick={() => void act((d) => moveSection(d, entry.id, 1))}
              >
                <ArrowDown size={13} />
              </button>
              <button
                aria-label={`Duplicate section ${entry.title}`}
                onClick={() =>
                  void act((d) =>
                    rearrangeSection(d, entry.id, undefined, true),
                  )
                }
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        );
      })}
      {!!missing.length && (
        <div role="status" className="reference-warnings">
          <b>{missing.length} missing references</b>
          {missing.map((m, i) => (
            <button key={i} onClick={() => goPage(m.pageId)}>
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
