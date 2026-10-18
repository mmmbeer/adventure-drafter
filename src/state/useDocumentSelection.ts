import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { DOMParser } from "@tiptap/pm/model";
import { DocumentSelection } from "../lib/document-selection";
import { dataUrl } from "../lib/fonts";
import { cleanHtml } from "../lib/editor";
import type { WorkspaceState } from "./useWorkspaceState";

export function useDocumentSelection(state: WorkspaceState) {
  const latest = useRef(state);
  latest.current = state;
  const [, render] = useState(0);
  const [selection] = useState(
    () =>
      new DocumentSelection({
        document: () => latest.current.docRef.current,
        editors: state.editors.current,
        commit: (doc) => latest.current.update(() => doc),
        focus: (editor, id) => {
          latest.current.setEditor(editor);
          latest.current.setActive(id);
        },
        changed: () => render((n) => n + 1),
      }),
  );
  useEffect(() => {
    selection.reset();
  }, [state.doc.id]);
  useEffect(() => {
    const pageTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest(".page-writing .tiptap");
    const inputTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest("input,textarea,[role=dialog],.template-rich-body");
    const stop = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const keydown = (event: KeyboardEvent) => {
      if (inputTarget(event.target) || !pageTarget(event.target)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "a") {
        stop(event);
        selection.selectAll();
      } else if (latest.current.preview) {
        return;
      } else if (mod && (key === "z" || key === "y")) {
        if (selection.history(key === "y" || event.shiftKey)) stop(event);
      } else if (selection.selected) {
        if (mod && ["b", "i", "u"].includes(key)) {
          stop(event);
          const mark = { b: "bold", i: "italic", u: "underline" }[key]!;
          selection.toggleMark(mark);
        } else if (key === "backspace" || key === "delete" || key === "enter") {
          stop(event);
          selection.replace();
        } else if (
          key === "escape" ||
          key.startsWith("arrow") ||
          key === "home" ||
          key === "end"
        ) {
          selection.clear();
        }
      }
    };
    const beforeinput = (event: InputEvent) => {
      if (
        !selection.selected ||
        !pageTarget(event.target) ||
        latest.current.preview
      )
        return;
      if (event.inputType.startsWith("insert") && event.data !== null) {
        stop(event);
        selection.replace([{ type: "text", text: event.data }]);
      } else if (event.inputType.startsWith("delete")) {
        stop(event);
        selection.replace();
      }
    };
    const copy = (event: ClipboardEvent) => {
      if (pageTarget(event.target)) selection.clipboard(event);
    };
    const cut = (event: ClipboardEvent) => {
      if (pageTarget(event.target) && !latest.current.preview)
        selection.clipboard(event, true);
    };
    const paste = (event: ClipboardEvent) => {
      if (
        !selection.selected ||
        !pageTarget(event.target) ||
        latest.current.preview
      )
        return;
      const data = event.clipboardData;
      if (!data) return;
      const images = [...data.items].filter((item) =>
        /^image\/(png|jpe?g|webp|gif)$/.test(item.type),
      );
      if (images.length) {
        stop(event);
        Promise.all(
          images.map(async (item) => {
            const file = item.getAsFile();
            if (!file || file.size > 15 * 1024 * 1024)
              throw new Error("Images must be smaller than 15 MB.");
            return { type: "image", attrs: { src: await dataUrl(file) } };
          }),
        )
          .then((nodes) => selection.replace(nodes))
          .catch((error) => latest.current.report(error.message));
        return;
      }
      if (!data.getData("text/html") && !data.getData("text/plain")) return;
      stop(event);
      const editor = latest.current.editor;
      if (!editor) return;
      const html = data.getData("text/html");
      if (html) {
        const root = document.createElement("div");
        root.innerHTML = cleanHtml(html);
        selection.replace(
          DOMParser.fromSchema(editor.schema).parse(root).toJSON().content,
        );
      } else {
        selection.replace(
          data
            .getData("text/plain")
            .split(/\r?\n/)
            .map((text) => ({
              type: "paragraph",
              content: text ? [{ type: "text", text }] : [],
            })),
        );
      }
    };
    const pointerdown = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest(".format-bar,.inspector")) return;
      selection.clear();
    };
    const listeners = { keydown, beforeinput, copy, cut, paste, pointerdown };
    for (const [name, listener] of Object.entries(listeners))
      document.addEventListener(name, listener as EventListener, true);
    return () => {
      for (const [name, listener] of Object.entries(listeners))
        document.removeEventListener(name, listener as EventListener, true);
    };
  }, [selection]);
  const selectionChanged = (editor: Editor) =>
    selection.selectionChanged(editor);
  const replaceSelection = (text: string) => {
    if (!selection.selected || latest.current.preview) return false;
    selection.replace(text ? [{ type: "text", text }] : []);
    return true;
  };
  return { documentSelection: selection, selectionChanged, replaceSelection };
}
