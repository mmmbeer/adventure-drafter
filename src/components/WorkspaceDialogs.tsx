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
        dialog === "documents" || dialog === "help"
          ? "wide"
          : dialog === "delete" || dialog === "link"
            ? "small"
            : "normal"
      }
    >
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
