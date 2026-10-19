import { useState } from "react";
import { DialogActions, Modal } from "../Modal";
import {
  abilities, modifier, templateFields, templateLabels, templateRichFields,
  type TemplateFields, type RichTemplateFields,
} from "../../lib/template-blocks";
import type { JSONContent } from "@tiptap/core";
import { TemplateRichField } from "./TemplateRichField";

export function TemplateFieldsDialog({
  node, onClose, onSave,
}: {
  node: JSONContent;
  onClose: () => void;
  onSave: (fields: TemplateFields, layout: { width: number; flow: string; wide: boolean }, rich: RichTemplateFields) => void;
}) {
  const [fields, setFields] = useState<TemplateFields>(() => templateFields(node));
  const [rich, setRich] = useState<RichTemplateFields>(() => templateRichFields(node));
  const [width, setWidth] = useState(Number(node.attrs?.width ?? 100));
  const [flow, setFlow] = useState(String(node.attrs?.flow ?? "block"));
  const [wide, setWide] = useState(!!node.attrs?.wide);
  const kind = node.attrs?.kind ?? "creature";
  const labels = templateLabels(kind).filter(({ key }) =>
    !node.attrs?.srdContinuation || fields[key] !== undefined);
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
            <div className={multiline ? "template-field-full" : "template-single-field"} key={key}>
              {!multiline && <label htmlFor={`template-${key}`}>{label}{ability && <small> {modifier(fields[key] || "10")}</small>}</label>}
              {multiline ? (
                <TemplateRichField
                  label={label}
                  initial={rich[key] ?? [{ type: "paragraph", content: fields[key] ? [{ type: "text", text: fields[key] }] : [] }]}
                  onChange={(blocks) => setRich((current) => ({ ...current, [key]: blocks }))}
                />
              ) : (
                <input
                  id={`template-${key}`}
                  value={fields[key] || ""}
                  type={ability ? "number" : "text"}
                  min={ability ? 1 : undefined}
                  max={ability ? 30 : undefined}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="template-layout-controls">
        <label>Box width · {width}%
          <input type="range" min="20" max="100" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </label>
        <label>Text flow
          <select value={wide ? "block" : flow} disabled={wide} onChange={(e) => setFlow(e.target.value)}>
            <option value="block">Separate block</option>
            <option value="left">Wrap text on right</option>
            <option value="right">Wrap text on left</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={wide} onChange={(e) => setWide(e.target.checked)} /> Span all columns</label>
      </div>
      <DialogActions>
        <button className="primary" onClick={() => onSave(fields, { width, flow: wide ? "block" : flow, wide }, rich)}>Apply changes</button>
      </DialogActions>
    </Modal>
  );
}
