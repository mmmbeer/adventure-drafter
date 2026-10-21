import { BlockStyleSelect } from "./BlockStyleSelect";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Highlighter,
  Link,
  Subscript,
  Superscript,
  RemoveFormatting,
  Columns2,
} from "lucide-react";
import type { DocumentSelection } from "../lib/document-selection";
import { fonts } from "../lib/fonts";
import { makeTemplate, type TemplateKind } from "../lib/template-blocks";
import type { ReactNode } from "react";
import { MERGE_TAGS, mergeNode, type MergeTagName } from "../lib/merge-tags";
export function Tool({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`tool ${active ? "selected" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function Toolbar({
  editor,
  selection,
  onDialog,
  onInsertPage,
  onIndex,
  customFonts,
}: {
  editor: Editor | null;
  selection: DocumentSelection;
  onDialog: (name: string) => void;
  onInsertPage: () => void;
  onIndex: () => void;
  customFonts: string[];
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => tick((n) => n + 1);
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);
  const command = (fn: (e: Editor) => void) => {
    if (!selection.format(fn) && editor) fn(editor);
  };
  const toggleMark = (name: string, attrs?: Record<string, unknown>) => {
    if (!selection.toggleMark(name, attrs))
      editor?.chain().focus().toggleMark(name, attrs).run();
  };
  const block = (type: string) => {
    if (!editor) return;
    const c = editor.chain().focus();
    if (type === "table")
      c.insertTable({ rows: 4, cols: 3, withHeaderRow: true }).run();
    else if (type === "statBlock" || type === "magicItem")
      c.insertContent(
        makeTemplate(type === "statBlock" ? "creature" : "magicItem"),
      ).run();
    else if (type === "columnBreak")
      c.insertContent({ type: "columnBreak" }).run();
    else if (type === "reference" || type === "library" || type === "srd")
      onDialog(type);
    else if (type === "image") onDialog("image");
    else if (type === "page") onInsertPage();
    else if (type === "rule") onDialog("divider");
    else if (type) c.insertContent(makeTemplate(type as TemplateKind)).run();
  };
  return (
    <div
      className={`format-bar ${!editor ? "inactive" : ""}`}
      role="toolbar"
      aria-label="Text formatting"
    >
      <div className="format-group">
        <Tool
          label="Undo (Ctrl+Z)"
          disabled={!selection.canUndo() && !editor?.can().undo()}
          onClick={() => {
            if (!selection.history()) editor?.chain().focus().undo().run();
          }}
        >
          <Undo2 size={16} />
        </Tool>
        <Tool
          label="Redo (Ctrl+Shift+Z)"
          disabled={!selection.canRedo() && !editor?.can().redo()}
          onClick={() => {
            if (!selection.history(true)) editor?.chain().focus().redo().run();
          }}
        >
          <Redo2 size={16} />
        </Tool>
      </div>
      <div className="format-group">
        <BlockStyleSelect editor={editor} format={command} />
        <select
          aria-label="Text font"
          disabled={!editor}
          value={editor?.getAttributes("textStyle").fontFamily || ""}
          onChange={(e) =>
            command((ed) =>
              ed.chain().focus().setFontFamily(e.target.value).run(),
            )
          }
        >
          <option value="">Document font</option>
          {[...fonts, ...customFonts].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          aria-label="Text size"
          disabled={!editor}
          value={editor?.getAttributes("textStyle").fontSize || ""}
          onChange={(e) =>
            command((ed) =>
              ed.chain().focus().setFontSize(e.target.value).run(),
            )
          }
        >
          <option value="">Auto</option>
          {[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 60, 72].map(
            (n) => (
              <option key={n} value={`${n}px`}>
                {n}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="format-group">
        {[
          [Bold, "Bold", "bold"],
          [Italic, "Italic", "italic"],
          [Underline, "Underline", "underline"],
          [Strikethrough, "Strikethrough", "strike"],
        ].map(([Icon, label, mark]) => {
          const I = Icon as typeof Bold;
          return (
            <Tool
              key={String(mark)}
              label={String(label)}
              active={editor?.isActive(String(mark))}
              onClick={() => toggleMark(String(mark))}
            >
              <I size={16} />
            </Tool>
          );
        })}
        <Tool
          label="Highlight"
          active={editor?.isActive("highlight")}
          onClick={() => toggleMark("highlight", { color: "#f5d681" })}
        >
          <Highlighter size={16} />
        </Tool>
        <label className="color-tool" title="Text color">
          A
          <input
            aria-label="Text color"
            type="color"
            defaultValue="#823a32"
            onInput={(e) =>
              command((ed) =>
                ed.chain().focus().setColor(e.currentTarget.value).run(),
              )
            }
          />
        </label>
      </div>
      <div className="format-group">
        {[
          [AlignLeft, "left"],
          [AlignCenter, "center"],
          [AlignRight, "right"],
          [AlignJustify, "justify"],
        ].map(([Icon, align]) => {
          const I = Icon as typeof AlignLeft;
          return (
            <Tool
              key={String(align)}
              label={`Align ${align}`}
              active={editor?.isActive({ textAlign: align })}
              onClick={() =>
                command((ed) =>
                  ed.chain().focus().setTextAlign(String(align)).run(),
                )
              }
            >
              <I size={16} />
            </Tool>
          );
        })}
        <Tool
          label="Bullet list"
          active={editor?.isActive("bulletList")}
          onClick={() =>
            command((ed) => ed.chain().focus().toggleBulletList().run())
          }
        >
          <List size={16} />
        </Tool>
        <Tool
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() =>
            command((ed) => ed.chain().focus().toggleOrderedList().run())
          }
        >
          <ListOrdered size={16} />
        </Tool>
      </div>
      <div className="format-group">
        <Tool
          label="Link"
          active={editor?.isActive("link")}
          onClick={() => onDialog("link")}
        >
          <Link size={16} />
        </Tool>
        <Tool
          label="Superscript"
          onClick={() =>
            command((ed) => ed.chain().focus().toggleSuperscript().run())
          }
        >
          <Superscript size={16} />
        </Tool>
        <Tool
          label="Subscript"
          onClick={() =>
            command((ed) => ed.chain().focus().toggleSubscript().run())
          }
        >
          <Subscript size={16} />
        </Tool>
        <Tool
          label="Clear formatting"
          onClick={() =>
            command((ed) =>
              ed.chain().focus().unsetAllMarks().clearNodes().run(),
            )
          }
        >
          <RemoveFormatting size={16} />
        </Tool>
        <Tool
          label="Span all columns"
          active={
            editor?.isActive("paragraph", { wide: true }) ||
            editor?.isActive("heading", { wide: true }) ||
            editor?.isActive("table", { wide: true })
          }
          onClick={() => {
            if (editor) {
              const name = editor.isActive("table")
                ? "table"
                : editor.isActive("heading")
                  ? "heading"
                  : editor.isActive("statBlock")
                    ? "statBlock"
                    : "paragraph";
              editor
                .chain()
                .focus()
                .updateAttributes(name, {
                  wide: !editor.getAttributes(name).wide,
                })
                .run();
            }
          }}
        >
          <Columns2 size={16} />
        </Tool>
      </div>
      <button
        className="index-selection"
        disabled={!editor}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onDialog("srd")}
      >
        SRD references
      </button>
      <select
        aria-label="Insert block"
        disabled={!editor}
        value=""
        className="insert-select"
        onChange={(e) => block(e.target.value)}
      >
        <option value="">+ Insert</option>
        <option value="srd">SRD monster / magic item</option>
        <option value="reference">Cross-reference</option>
        <option value="library">Reusable content</option>
        <option value="readaloud">Read-aloud box</option>
        <option value="aside">Aside / GM notes</option>
        <option value="encounter">Encounter</option>
        <option value="treasure">Treasure</option>
        <option value="statBlock">Creature stat block</option>
        <option value="magicItem">Magic item</option>
        <option value="table">Table</option>
        <option value="image">Image</option>
        <option value="rule">Horizontal rule</option>
        <option value="columnBreak">Column break</option>
        <option value="page">Page break</option>
      </select>
      <select
        aria-label="Insert merge tag"
        disabled={!editor}
        className="insert-select"
        value=""
        onChange={(event) => {
          const name = event.target.value as MergeTagName;
          if (name)
            editor?.chain().focus().insertContent(mergeNode(name)).run();
        }}
      >
        <option value="">{"{ } Fields"}</option>
        {MERGE_TAGS.map((tag) => (
          <option value={tag.name} key={tag.name}>
            {`{${tag.name}}`} · {tag.label}
          </option>
        ))}
      </select>
      <button
        className="index-selection"
        disabled={!editor || editor.state.selection.empty}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onIndex}
      >
        Index selection
      </button>
    </div>
  );
}
