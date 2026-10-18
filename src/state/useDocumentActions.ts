import { createAdventure, type Adventure } from "../lib/model";
import { saveDocument, saveVersion, requestPersistence } from "../lib/storage";
import { installFonts } from "../lib/fonts";
import type { WorkspaceState } from "./useWorkspaceState";
export function useDocumentActions(state: WorkspaceState) {
  const {
    setDoc,
    docRef,
    setActive,
    setEditor,
    setDialog,
    setWarnings,
    setBusy,
    importSource,
    homebrew,
    fileInput,
    report,
  } = state;
  const newDoc = async (blank: boolean) => {
    try {
      await saveDocument(docRef.current);
      const next = createAdventure(blank);
      setEditor(null);
      setDoc(next);
      setActive(next.pages[0].id);
      setDialog("");
      await requestPersistence();
    } catch (e) {
      report((e as Error).message);
    }
  };
  const activate = async (next: Adventure) => {
    await saveDocument(docRef.current);
    await installFonts(next.fonts);
    setEditor(null);
    setDoc(next);
    setActive(next.pages[0].id);
    setDialog("");
  };
  const importAdventure = async (file?: File) => {
    setBusy("Importing adventure…");
    try {
      const { importFile, importText } = await import("../lib/import");
      const result = file
        ? await importFile(file)
        : await importText(importSource, "Imported adventure", homebrew);
      await saveVersion(docRef.current, "Before import");
      await activate(result.document);
      setWarnings(result.warnings);
      if (result.warnings.length) setDialog("import-report");
      report("Adventure imported. Review page flow before exporting.");
    } catch (e) {
      report((e as Error).message);
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  return { newDoc, activate, importAdventure };
}
