import type { ExportFormat } from "../../state/usePublishingActions";

export function ExportInformation({ format }: { format: ExportFormat }) {
  if (format === "docx")
    return (
      <>
        <p>
          Text and tables stay editable. Font names, sizes, colors, paper,
          graphical rules, column widths and merged cells follow the document.
          Install the chosen fonts on the device opening the file. Fonts are not
          embedded.
        </p>
        <p>
          Word lays out text differently. Line wrapping, table continuation,
          column and page breaks can shift. Wide blocks use Word sections.
          Continued tables remain separate editable fragments. Floating shapes,
          transparency and text wrapping around artwork may differ. Paper colors
          use native Word shapes. Background artwork stays separate from the
          editable text.
        </p>
        <p>
          Page numbers in headers and footers update in Word. Contents, index
          and cross-reference labels reflect the export and may need updating
          after edits.
        </p>
      </>
    );
  if (format === "pdf")
    return (
      <p>
        Preserves the on-screen fonts, sizes, colors, paper, graphical rules and
        table breaks at 300 DPI. Visible pages are flattened, with a searchable
        text layer.
      </p>
    );
  if (format === "markdown")
    return (
      <p>
        Markdown preserves content and rejoins continued tables. It cannot
        preserve paper colors, fonts, font sizes or exact page and column
        layouts. Merged tables use HTML and artwork is embedded. Display depends
        on your Markdown reader.
      </p>
    );
  return (
    <p>
      Preserves the selected physical page, including continued contents and
      index pages, at 300 DPI. Page images contain flattened pixels rather than
      editable text.
    </p>
  );
}
