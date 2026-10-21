import { DividerDialog } from "./dialogs/DividerDialog";
import { RunningTextDialog } from "./dialogs/RunningTextDialog";
import { lazy, Suspense } from "react";
const SrdDialog = lazy(() => import("./dialogs/SrdDialog"));
import { DesignsDialog } from "./dialogs/DesignsDialog";
import { LibraryDialog } from "./dialogs/LibraryDialog";
import { ReferenceDialog } from "./dialogs/ReferenceDialog";
import { DocumentsDialog } from "./dialogs/DocumentsDialog";
import { ImportDialog } from "./dialogs/ImportDialog";
import { ImportReportDialog } from "./dialogs/ImportReportDialog";
import { ExportDialog } from "./dialogs/ExportDialog";
import { ImageDialog } from "./dialogs/ImageDialog";
import { LinkDialog } from "./dialogs/LinkDialog";
import { VersionsDialog } from "./dialogs/VersionsDialog";
import { FindDialog } from "./dialogs/FindDialog";
import { DeleteDialog } from "./dialogs/DeleteDialog";
import { HelpDialog } from "./dialogs/HelpDialog";
import { Modal } from "./Modal";
import { useDesk } from "../state/context";
export function WorkspaceDialogs() {
  const { dialog, setDialog } = useDesk();
  return (
    <Modal
      title={
        (
          {
            divider: "Horizontal rules",
            "running-text": "Header & footer",
            reference: "Cross-reference",
            srd: "SRD monsters and magic items",
            library: "Reusable content library",
            designs: "Styles and page masters",
            documents: "Your adventures",
            import: "Import an adventure",
            "import-report": "Import review",
            export: "Publish your adventure",
            image: "Add an illustration",
            background: "Page background",
            link: "Edit link",
            versions: "Saved versions",
            find: "Find & replace",
            delete: "Delete item",
            help: "Your writing desk",
          } as Record<string, string>
        )[dialog] || dialog
      }
      onClose={() => setDialog("")}
      size={
        ["documents", "help", "library", "designs", "srd"].includes(dialog)
          ? "wide"
          : dialog === "delete" || dialog === "link"
            ? "small"
            : "normal"
      }
    >
      {dialog === "srd" ? (
        <Suspense fallback={<p role="status">Loading references…</p>}>
          <SrdDialog />
        </Suspense>
      ) : null}
      {dialog === "divider" ? <DividerDialog /> : null}
      {dialog === "running-text" ? <RunningTextDialog /> : null}
      {dialog === "designs" ? <DesignsDialog /> : null}
      {dialog === "library" ? <LibraryDialog /> : null}
      {dialog === "reference" ? <ReferenceDialog /> : null}
      {dialog === "documents" ? <DocumentsDialog /> : null}
      {dialog === "import" ? <ImportDialog /> : null}
      {dialog === "import-report" ? <ImportReportDialog /> : null}
      {dialog === "export" ? <ExportDialog /> : null}
      {dialog === "image" || dialog === "background" ? <ImageDialog /> : null}
      {dialog === "link" ? <LinkDialog /> : null}
      {dialog === "versions" ? <VersionsDialog /> : null}
      {dialog === "find" ? <FindDialog /> : null}
      {dialog === "delete" ? <DeleteDialog /> : null}
      {dialog === "help" ? <HelpDialog /> : null}
    </Modal>
  );
}
