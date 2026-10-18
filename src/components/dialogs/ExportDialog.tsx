import { Download, Printer } from "lucide-react";
import { useDesk } from "../../state/context";
import { DialogActions } from "../Modal";
import { exportProject } from "../../lib/export";
import { requestPersistence } from "../../lib/storage";
import { sizes } from "../../lib/model";
export function ExportDialog() {
  const { doc, busy, publish, setDialog } = useDesk();
  return (
    <>
      <p>Choose an edition for your readers or your next editing pass.</p>
      <div className="export-descriptions">
        <section>
          <b>PDF · exact appearance</b>
          <p>
            High-resolution page images preserve fonts, artwork, backgrounds and
            columns. Text is flattened.
          </p>
        </section>
        <section>
          <b>DOCX · exact appearance</b>
          <p>
            One page image per Word page. Preserves the design. Page text is not
            editable.
          </p>
        </section>
        <section>
          <b>DOCX · editable text</b>
          <p>
            Editable headings, text, tables, stat blocks and images. Word may
            reflow pages. Custom fonts must be installed on the reader’s device.
          </p>
        </section>
        <section>
          <b>Project backup · JSON</b>
          <p>
            Your complete editable source, images and custom fonts. Reopen it
            here on another device.
          </p>
        </section>
        <section>
          <b>Browser print / searchable PDF</b>
          <p>
            For selectable text, choose Save as PDF in the browser print dialog.
            Enable background graphics and disable browser headers and footers.
          </p>
        </section>
      </div>
      <DialogActions>
        <button disabled={!!busy} onClick={() => publish("pdf")}>
          PDF · exact appearance
        </button>
        <button disabled={!!busy} onClick={() => publish("docx")}>
          DOCX · exact appearance
        </button>
        <button disabled={!!busy} onClick={() => publish("editable")}>
          DOCX · editable text
        </button>
        <button
          onClick={() => {
            exportProject(doc);
            requestPersistence();
          }}
        >
          <Download size={14} />
          Project backup · JSON
        </button>
        <button
          onClick={() => {
            const style = document.createElement("style");
            document.getElementById("print-size")?.remove();
            style.id = "print-size";
            style.textContent = `@page {size:${sizes[doc.settings.size].width / 96}in ${sizes[doc.settings.size].height / 96}in;margin:0}`;
            document.head.append(style);
            setDialog("");
            setTimeout(() => window.print(), 100);
          }}
        >
          <Printer size={14} />
          Browser print / searchable PDF
        </button>
      </DialogActions>
    </>
  );
}
