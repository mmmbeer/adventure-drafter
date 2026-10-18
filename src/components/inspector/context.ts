import { createContext, useContext, useEffect, useState } from "react";
import type { Adventure, Page } from "../../lib/model";
import type { DocumentSelection } from "../../lib/document-selection";
import type { Editor } from "@tiptap/react";
import { fonts } from "../../lib/fonts";
export interface InspectorProps {
  doc: Adventure;
  page: Page;
  editor: Editor | null;
  selection: DocumentSelection;
  tab: string;
  setTab: (t: string) => void;
  update: (fn: (d: Adventure) => Adventure) => void;
  onDialog: (s: string) => void;
  onFont: () => void;
  onClose: () => void;
}
export function useInspectorState({
  doc,
  page,
  editor,
  selection,
  tab,
  setTab,
  update,
  onDialog,
  onFont,
  onClose,
}: InspectorProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const fn = () => tick((i) => i + 1);
    editor.on("transaction", fn);
    return () => {
      editor.off("transaction", fn);
    };
  }, [editor]);
  const setting = (key: string, value: unknown) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
  const patchPage = (key: string, value: unknown) =>
    update((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === page.id ? { ...p, [key]: value } : p,
      ),
    }));
  const image = editor?.isActive("image")
    ? editor.getAttributes("image")
    : null;
  const blockName = editor?.isActive("heading") ? "heading" : "paragraph";
  const block = editor?.getAttributes(blockName) ?? {};
  const format = (action: (editor: Editor) => unknown) => {
    if (!selection.format(action) && editor) action(editor);
  };
  const blockSetting = (key: string, value: unknown) =>
    format((ed) => ed.chain().focus().updateAttributes(blockName, { [key]: value }).run());
  const allFonts = [...fonts, ...doc.fonts.map((f) => f.name)];
  return {
    doc,
    page,
    editor,
    tab,
    setTab,
    update,
    onDialog,
    onFont,
    onClose,
    setting,
    patchPage,
    image,
    blockName,
    block,
    blockSetting,
    format,
    selection,
    allFonts,
  };
}
export const InspectorContext = createContext<ReturnType<
  typeof useInspectorState
> | null>(null);
export function useInspector() {
  const state = useContext(InspectorContext);
  if (!state) throw new Error("Inspector context missing");
  return state;
}
