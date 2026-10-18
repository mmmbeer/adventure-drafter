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
import { fonts } from "../lib/fonts";
import { heading, paragraph } from "../lib/model";
import type { ReactNode } from "react";
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
  onDialog,
  onInsertPage,
  onIndex,
  customFonts,
}: {
  editor: Editor | null;
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
    if (editor) fn(editor);
  };
  const block = (type: string) => {
    if (!editor) return;
    const c = editor.chain().focus();
    if (type === "table")
      c.insertTable({ rows: 4, cols: 3, withHeaderRow: true }).run();
    else if (type === "statBlock")
      c.insertContent({
        type: "statBlock",
        content: [
          heading("Creature name", 2),
          paragraph("Medium creature, alignment"),
          paragraph("Armor Class 12 • Hit Points 22 • Speed 30 ft."),
          paragraph("STR 12  DEX 14  CON 12  INT 10  WIS 12  CHA 10"),
          heading("Traits", 3),
          paragraph("Trait name. Describe the creature’s signature ability."),
          heading("Actions", 3),
          paragraph(
            "Attack. +4 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) damage.",
          ),
        ],
      }).run();
    else if (type === "columnBreak")
      c.insertContent({ type: "columnBreak" }).run();
    else if (type === "image") onDialog("image");
    else if (type === "page") onInsertPage();
    else if (type === "rule") c.setHorizontalRule().run();
    else if (type)
      c.insertContent({
        type: "callout",
        attrs: { kind: type },
        content: [
          heading(
            type === "readaloud"
              ? "Read aloud"
              : type === "aside"
                ? "Game Master’s notes"
                : type === "encounter"
                  ? "Encounter"
                  : "Treasure",
            3,
          ),
          paragraph("Write here…"),
        ],
      }).run();
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
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </Tool>
        <Tool
          label="Redo (Ctrl+Shift+Z)"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </Tool>
      </div>
      <div className="format-group">
        <select
          aria-label="Paragraph style"
          disabled={!editor}
          value={
            editor?.isActive("heading")
              ? editor.getAttributes("heading").level
              : "p"
          }
          onChange={(e) =>
            command((ed) =>
              e.target.value === "p"
                ? ed.chain().focus().setParagraph().run()
                : ed
                    .chain()
                    .focus()
                    .setNode("heading", { level: Number(e.target.value) })
                    .run(),
            )
          }
        >
          <option value="p">Paragraph</option>
          {Array.from({ length: 9 }, (_, i) => (
            <option key={i} value={i + 1}>
              Heading {i + 1}
            </option>
          ))}
        </select>
        <select
          aria-label="Text font"
          disabled={!editor}
          value={editor?.getAttributes("textStyle").fontFamily || ""}
          onChange={(e) =>
            editor?.chain().focus().setFontFamily(e.target.value).run()
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
            editor?.chain().focus().setFontSize(e.target.value).run()
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
              onClick={() =>
                editor?.chain().focus().toggleMark(String(mark)).run()
              }
            >
              <I size={16} />
            </Tool>
          );
        })}
        <Tool
          label="Highlight"
          active={editor?.isActive("highlight")}
          onClick={() =>
            editor?.chain().focus().toggleHighlight({ color: "#f5d681" }).run()
          }
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
              editor?.chain().focus().setColor(e.currentTarget.value).run()
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
                editor?.chain().focus().setTextAlign(String(align)).run()
              }
            >
              <I size={16} />
            </Tool>
          );
        })}
        <Tool
          label="Bullet list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </Tool>
        <Tool
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
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
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
        >
          <Superscript size={16} />
        </Tool>
        <Tool
          label="Subscript"
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
        >
          <Subscript size={16} />
        </Tool>
        <Tool
          label="Clear formatting"
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <RemoveFormatting size={16} />
        </Tool>
        <Tool
          label="Span all columns"
          active={
            editor?.isActive("paragraph", { wide: true }) ||
            editor?.isActive("heading", { wide: true })
          }
          onClick={() => {
            if (editor) {
              const name = editor.isActive("heading")
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
      <select
        aria-label="Insert block"
        disabled={!editor}
        value=""
        className="insert-select"
        onChange={(e) => block(e.target.value)}
      >
        <option value="">+ Insert</option>
        <option value="readaloud">Read-aloud box</option>
        <option value="aside">Aside / GM notes</option>
        <option value="encounter">Encounter</option>
        <option value="treasure">Treasure</option>
        <option value="statBlock">Creature stat block</option>
        <option value="table">Table</option>
        <option value="image">Image</option>
        <option value="rule">Horizontal rule</option>
        <option value="columnBreak">Column break</option>
        <option value="page">Page break</option>
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
