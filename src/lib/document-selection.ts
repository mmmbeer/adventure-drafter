import type { Editor, JSONContent } from "@tiptap/core";
import { AllSelection, Selection } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { documentSelectionKey } from "./document-selection-decoration";
import type { Adventure } from "./model";

interface Options {
  document: () => Adventure;
  editors: Map<string, Editor>;
  commit: (doc: Adventure) => void;
  focus: (editor: Editor, id: string) => void;
  changed: () => void;
}
interface Edit {
  before: Adventure;
  after: Adventure;
}
const contents = (doc: Adventure) => JSON.stringify(doc.pages);

// Coordinates page editors without including application chrome or generated
// references in the editable selection. Clipboard order follows document order.
export class DocumentSelection {
  selected = false;
  private applying = false;
  private undoStack: Edit[] = [];
  private redoStack: Edit[] = [];
  private documentId: string;
  constructor(private options: Options) {
    this.documentId = options.document().id;
  }

  private pages() {
    return this.options
      .document()
      .pages.filter((p) => p.kind !== "toc" && p.kind !== "index")
      .flatMap((p) => {
        const editor = this.options.editors.get(p.id);
        return editor && !editor.isDestroyed ? [{ id: p.id, editor }] : [];
      });
  }

  private snapshot(): Adventure {
    const doc = this.options.document();
    return structuredClone({
      ...doc,
      pages: doc.pages.map((p) => {
        const editor = this.options.editors.get(p.id);
        return editor && p.kind !== "toc" && p.kind !== "index"
          ? { ...p, content: editor.getJSON() }
          : p;
      }),
    });
  }

  reset() {
    this.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.documentId = this.options.document().id;
  }

  selectAll() {
    if (this.documentId !== this.options.document().id) this.reset();
    this.applying = true;
    this.selected = true;
    for (const { editor } of this.pages()) {
      editor.view.dispatch(
        editor.state.tr
          .setSelection(new AllSelection(editor.state.doc))
          .setMeta(documentSelectionKey, true),
      );
    }
    this.applying = false;
    this.options.changed();
  }

  clear() {
    if (!this.selected) return;
    this.selected = false;
    this.applying = true;
    for (const { editor } of this.pages()) {
      const tr = editor.state.tr.setMeta(documentSelectionKey, false);
      if (tr.selection instanceof AllSelection)
        tr.setSelection(
          Selection.near(tr.doc.resolve(tr.doc.content.size), -1),
        );
      editor.view.dispatch(tr);
    }
    this.applying = false;
    this.options.changed();
  }

  selectionChanged(editor: Editor) {
    if (this.applying) return;
    if (editor.state.selection instanceof AllSelection && !this.selected)
      this.selectAll();
    else if (this.selected && !(editor.state.selection instanceof AllSelection))
      this.clear();
  }

  private edit(action: () => void) {
    const before = this.snapshot();
    this.applying = true;
    for (const { editor } of this.pages())
      editor.view.dispatch(closeHistory(editor.state.tr));
    action();
    for (const { editor } of this.pages())
      editor.view.dispatch(closeHistory(editor.state.tr));
    const after = this.snapshot();
    this.applying = false;
    if (contents(before) !== contents(after)) {
      this.undoStack.push({ before, after });
      if (this.undoStack.length > 20) this.undoStack.shift();
      this.redoStack = [];
      this.options.commit(after);
    }
    this.options.changed();
  }

  format(action: (editor: Editor) => unknown) {
    if (!this.selected) return false;
    const focused = this.pages().find(({ editor }) => editor.isFocused);
    this.edit(() => {
      for (const { editor } of this.pages()) action(editor);
      // Toolbar commands may focus each editor. Return without scrolling.
      focused?.editor.view.focus();
    });
    return true;
  }

  toggleMark(name: string, attrs?: Record<string, unknown>) {
    if (!this.selected) return false;
    const remove = this.pages().every(({ editor }) =>
      editor.isActive(name, attrs),
    );
    return this.format((editor) =>
      remove
        ? editor.commands.unsetMark(name)
        : editor.commands.setMark(name, attrs),
    );
  }

  replace(content: JSONContent[] = []) {
    if (!this.selected) return;
    const first = this.pages()[0];
    if (!first) return;
    this.edit(() => {
      this.clear();
      for (const { editor } of this.pages()) editor.commands.clearContent();
      first.editor.commands.setTextSelection(1);
      if (content.length) first.editor.commands.insertContent(content);
    });
    first.editor.commands.focus(undefined, { scrollIntoView: false });
    this.options.focus(first.editor, first.id);
  }

  clipboard(event: ClipboardEvent, cut = false) {
    if (!this.selected || !event.clipboardData) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    const pages = this.pages();
    event.clipboardData.setData(
      "text/html",
      pages.map(({ editor }) => editor.getHTML()).join("\n"),
    );
    event.clipboardData.setData(
      "text/plain",
      pages.map(({ editor }) => editor.getText()).join("\n\n"),
    );
    if (cut) this.replace();
    return true;
  }

  canUndo() {
    return this.canRestore(this.undoStack.at(-1)?.after);
  }
  canRedo() {
    return this.canRestore(this.redoStack.at(-1)?.before);
  }
  private canRestore(doc?: Adventure) {
    return (
      !!doc &&
      doc.id === this.options.document().id &&
      contents(this.snapshot()) === contents(doc)
    );
  }
  history(redo = false) {
    if (!(redo ? this.canRedo() : this.canUndo())) return false;
    const source = redo ? this.redoStack : this.undoStack;
    const destination = redo ? this.undoStack : this.redoStack;
    const entry = source.pop()!;
    destination.push(entry);
    const next = structuredClone(redo ? entry.after : entry.before);
    this.clear();
    this.applying = true;
    for (const p of next.pages) {
      this.options.editors
        .get(p.id)
        ?.chain()
        .setMeta("addToHistory", false)
        .setContent(p.content, { emitUpdate: false })
        .run();
    }
    this.applying = false;
    this.options.commit(next);
    this.options.changed();
    return true;
  }
}
