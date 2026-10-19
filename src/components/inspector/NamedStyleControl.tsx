import { useInspector } from "./context";
export function NamedStyleControl() {
  const { doc, editor, onDialog, selection } = useInspector();
  const name =
    [
      "reusableBlock",
      "statBlock",
      "callout",
      "table",
      "heading",
      "paragraph",
    ].find((t) => editor?.isActive(t)) || "paragraph";
  return (
    <section className="panel-section">
      <h3>Named style</h3>
      <label>
        Paragraph or block style
        <select
          aria-label="Named style"
          disabled={!editor}
          value={editor?.getAttributes(name).styleId || ""}
          onChange={(e) => {
            const apply = (ed: NonNullable<typeof editor>) =>
              ed
                .chain()
                .focus()
                .updateAttributes(name, { styleId: e.target.value || null })
                .run();
            if (!selection.format(apply) && editor) apply(editor);
          }}
        >
          <option value="">Document defaults</option>
          {doc.namedStyles?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {editor?.getAttributes(name).refId && (
        <label>
          Reference name (optional)
          <input
            aria-label="Reference target name"
            value={editor.getAttributes(name).referenceLabel || ""}
            placeholder="Use content title"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .updateAttributes(name, {
                  referenceLabel: e.target.value || null,
                })
                .run()
            }
          />
        </label>
      )}
      <button className="subtle" onClick={() => onDialog("designs")}>
        Manage styles and page masters
      </button>
    </section>
  );
}
