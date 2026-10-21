import { useRef, useState } from "react";
import { useDesk } from "../../state/context";
import { pageDesign } from "../../lib/designs";
import { runningFields } from "../../lib/running-text";
import type { RunningText } from "../../lib/types";
import { MERGE_TAGS } from "../../lib/merge-tags";
import { DialogActions } from "../Modal";

export function RunningTextDialog() {
  const { doc, activePage, update, setDialog, report } = useDesk();
  const index = doc.pages.findIndex((p) => p.id === activePage.id);
  const inherited = pageDesign(
    doc,
    { ...activePage, runningText: undefined },
    index,
  ).templates;
  const [scope, setScope] = useState<"document" | "page">(
    activePage.runningText ? "page" : "document",
  );
  const [value, setValue] = useState<RunningText>(
    pageDesign(doc, activePage, index).templates,
  );
  const [inherit, setInherit] = useState(false);
  const [field, setField] = useState<keyof RunningText>("headerLeft");
  const inputs = useRef<
    Partial<Record<keyof RunningText, HTMLInputElement | null>>
  >({});
  const preview = pageDesign(
    doc,
    { ...activePage, runningText: inherit ? undefined : value },
    index,
  );
  const chooseScope = (next: "document" | "page") => {
    setScope(next);
    setInherit(next === "page" && !activePage.runningText);
    setValue(
      next === "page"
        ? pageDesign(doc, activePage, index).templates
        : inherited,
    );
  };
  const insert = (tag: string) => {
    const input = inputs.current[field];
    const start = input?.selectionStart ?? value[field].length;
    const end = input?.selectionEnd ?? start;
    const token = `{${tag}}`;
    setInherit(false);
    setValue((v) => ({
      ...v,
      [field]: v[field].slice(0, start) + token + v[field].slice(end),
    }));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <>
      <label>
        Apply to
        <select
          aria-label="Header and footer scope"
          value={scope}
          onChange={(e) => chooseScope(e.target.value as "document" | "page")}
        >
          <option value="document">Document defaults</option>
          <option value="page">This page only</option>
        </select>
      </label>
      <p className="help">
        Document defaults apply across page masters. Individual page overrides
        stay unchanged. Leave a field blank to remove its text.
      </p>
      {scope === "page" && (
        <label className="check">
          <input
            type="checkbox"
            checked={inherit}
            onChange={(e) => {
              setInherit(e.target.checked);
              if (e.target.checked) setValue(inherited);
            }}
          />
          Inherit header and footer
        </label>
      )}
      <div className="running-fields">
        {runningFields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              ref={(el) => {
                inputs.current[key] = el;
              }}
              aria-label={label}
              maxLength={500}
              value={value[key]}
              onFocus={() => setField(key)}
              onChange={(e) => {
                setInherit(false);
                setValue({ ...value, [key]: e.target.value });
              }}
            />
          </label>
        ))}
      </div>
      <div
        className="placeholder-buttons"
        role="group"
        aria-label="Insert placeholder"
      >
        {[...MERGE_TAGS, { name: "chapter", label: "Current chapter" }].map(
          (tag) => (
            <button
              key={tag.name}
              type="button"
              title={tag.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(tag.name)}
            >{`{${tag.name}}`}</button>
          ),
        )}
      </div>
      <div
        className="running-text-preview"
        aria-label="Header and footer preview"
        style={{ background: preview.paper }}
      >
        <div>
          <span>{preview.hideHeader ? "" : preview.header}</span>
          <span>{preview.hideHeader ? "" : preview.headerRight}</span>
        </div>
        <small>Page {preview.number} preview</small>
        <div>
          <span>{preview.footer}</span>
          <span>
            {preview.hideNumber || activePage.kind === "title"
              ? ""
              : preview.footerCenter}
          </span>
          <span>{activePage.kind === "title" ? "" : preview.footerRight}</span>
        </div>
      </div>
      {(preview.hideHeader ||
        preview.hideNumber ||
        activePage.kind === "title") && (
        <p className="help">
          This page's layout hides its header or page number. Text is still used
          on pages where those areas are shown.
        </p>
      )}
      <DialogActions>
        <button
          className="primary"
          onClick={() => {
            update((d) =>
              scope === "document"
                ? { ...d, settings: { ...d.settings, runningText: value } }
                : {
                    ...d,
                    pages: d.pages.map((p) =>
                      p.id === activePage.id
                        ? { ...p, runningText: inherit ? undefined : value }
                        : p,
                    ),
                  },
            );
            setDialog("");
            report("Header and footer updated.");
          }}
        >
          Apply changes
        </button>
      </DialogActions>
    </>
  );
}
