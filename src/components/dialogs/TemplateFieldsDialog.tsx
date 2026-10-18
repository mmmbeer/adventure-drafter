import { useState } from "react";
import { DialogActions, Modal } from "../Modal";
import {
  abilities, modifier, templateFields, templateLabels, type TemplateFields,
} from "../../lib/template-blocks";
import type { JSONContent } from "@tiptap/core";

export function TemplateFieldsDialog({
  node, onClose, onSave,
}: {
  node: JSONContent;
  onClose: () => void;
  onSave: (fields: TemplateFields) => void;
}) {
  const [fields, setFields] = useState<TemplateFields>(() => templateFields(node));
  const kind = node.attrs?.kind ?? "creature";
  const labels = templateLabels(kind);
  const set = (key: string, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      title={kind === "creature" ? "Edit creature stat block" : kind === "magicItem" ? "Edit magic item" : "Edit layout template"}
      onClose={onClose}
      size={kind === "creature" ? "wide" : "normal"}
    >
      <p>Edit the standard fields below. Additional paragraphs, tables, formatting and custom sections remain in the document. You can also edit the content directly on the page.</p>
      <div className="template-field-grid">
        {labels.map(({ key, label, multiline }) => {
          const ability = abilities.some((name) => name.toLowerCase() === key);
          return (
            <label className={multiline ? "template-field-full" : ""} key={key}>
              {label}{ability && <small> {modifier(fields[key] || "10")}</small>}
              {multiline ? (
                <textarea rows={3} value={fields[key] || ""} onChange={(e) => set(key, e.target.value)} />
              ) : (
                <input
                  value={fields[key] || ""}
                  type={ability ? "number" : "text"}
                  min={ability ? 1 : undefined}
                  max={ability ? 30 : undefined}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
            </label>
          );
        })}
      </div>
      <DialogActions>
        <button className="primary" onClick={() => onSave(fields)}>Apply changes</button>
      </DialogActions>
    </Modal>
  );
}
