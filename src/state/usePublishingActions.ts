import { saveDocument } from "../lib/storage";
import type { WorkspaceState } from "./useWorkspaceState";
export function usePublishingActions(state: WorkspaceState) {
  const { docRef, setBusy, report } = state;
  const publish = async (type: string) => {
    setBusy("Preparing pages…");
    try {
      await saveDocument(docRef.current);
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 800));
      const generatedOverflow = [
        ...document.querySelectorAll<HTMLElement>(".canvas .generated"),
      ].some((el) => {
        const paper = el.closest(".paper")!;
        const footer = paper.querySelector(".page-footer")!;
        return (
          el.getBoundingClientRect().bottom >
          footer.getBoundingClientRect().top - 10
        );
      });
      if (generatedOverflow)
        throw new Error(
          "A contents or index page is too tall. Reduce its type size or shorten unusually long headings/keywords before exporting.",
        );
      const overflowNodes = [
        ...document.querySelectorAll<HTMLElement>(
          ".canvas .page-writing .tiptap",
        ),
      ].filter(
        (e) =>
          e.scrollWidth > e.clientWidth + 4 ||
          e.scrollHeight > e.clientHeight + 4,
      );
      if (overflowNodes.length)
        throw new Error(
          "Some content still overflows a page. Wait for page flow or reduce the size of the oversized block before exporting.",
        );
      if (type === "pdf") {
        const { exportPdf } = await import("../lib/export");
        await exportPdf(docRef.current, setBusy);
      } else if (type === "docx") {
        const { exportFidelityDocx } = await import("../lib/export");
        await exportFidelityDocx(docRef.current, setBusy);
      } else {
        const { exportEditable } = await import("../lib/export-editable");
        await exportEditable(docRef.current, setBusy);
      }
      report("Your export is ready.");
    } catch (e) {
      report((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return { publish };
}
