import { useRef } from "react";
import { saveDocument } from "../lib/storage";
import { settledExportDocument } from "../lib/export-layout";
import type { ExportPageChoice } from "../lib/export-capture";
import type { WorkspaceState } from "./useWorkspaceState";

export type ExportFormat = "docx" | "pdf" | "markdown" | "image";
export function usePublishingActions(state: WorkspaceState) {
  const { docRef, setBusy, report } = state;
  const publishing = useRef(false);
  const publish = async (
    type: ExportFormat,
    page?: Pick<ExportPageChoice, "pageId" | "part">,
  ) => {
    if (publishing.current) return;
    publishing.current = true;
    setBusy("Waiting for fonts and page flow…");
    try {
      const doc = await settledExportDocument(() => docRef.current);
      await saveDocument(doc);
      if (type === "pdf") {
        const { exportSearchablePdf } =
          await import("../lib/export-searchable");
        await exportSearchablePdf(doc, setBusy);
      } else if (type === "docx") {
        const { exportEditable } = await import("../lib/export-editable");
        await exportEditable(doc, setBusy);
      } else if (type === "markdown") {
        const { exportMarkdown } = await import("../lib/export-markdown");
        await exportMarkdown(doc, setBusy);
      } else {
        if (!page) throw new Error("Choose a page to export.");
        const { exportPageImage } = await import("../lib/export-page-image");
        await exportPageImage(doc, setBusy, page);
      }
      report("Your export is ready.");
    } catch (e) {
      console.error("Adventure export failed", e);
      report(
        e instanceof Error
          ? e.message
          : "Page rendering failed. Check the artwork and fonts, then try exporting again.",
      );
    } finally {
      publishing.current = false;
      setBusy("");
    }
  };
  return { publish };
}
