import { useDesk } from "../../state/context";
export function HelpDialog() {
  const {} = useDesk();
  return (
    <div className="guide">
      <section>
        <h3>Write on the paper</h3>
        <p>
          Click a page and write. Select text to format it in the top bar. All
          nine heading levels are supported. Use + Insert for boxed text,
          creature stat blocks, tables, illustrations and column breaks.
        </p>
      </section>
      <section>
        <h3>Shape your adventure</h3>
        <p>
          Choose a template in Style. Set page geometry and image wrapping in
          Page. Drag page cards to reorder them. Text spills onto the next
          adventure page automatically. Use Reflow body pages after major
          deletions or template changes to close gaps. Oversized blocks must be
          shortened or resized.
        </p>
      </section>
      <section>
        <h3>Contents and indexes</h3>
        <p>
          Add a Table of contents or Keyword index using Add page. Contents
          follows your headings. Select a name and choose Index selection, or
          add keywords in Publish. Both update automatically. Keywords match
          text anywhere inside a name or phrase.
        </p>
      </section>
      <section>
        <h3>Save and publish</h3>
        <p>
          Changes autosave in this browser using IndexedDB. Named checkpoints
          live in Saved versions. Download JSON backups for portable editing.
          Clearing browser data removes local manuscripts. Export editable Word,
          searchable PDF, Markdown or one page as a PNG. PDF and PNG preserve
          the rendered pages at 300 DPI. Word retains editable text and tables
          with Word-dependent reflow. Markdown preserves content rather than
          page design.
        </p>
      </section>
      <section>
        <h3>Images and fonts</h3>
        <p>
          Paste an image or drop one on the writing page. Images added from URLs
          are downloaded and embedded. Select an image to change width, wrapping
          or blending in Page. Twenty open-source font families are bundled. Add
          your own font files in Style.
        </p>
      </section>
      <section>
        <h3>Keyboard shortcuts</h3>
        <p>
          Ctrl/⌘ + S: save · Ctrl/⌘ + F: find · Ctrl/⌘ + B/I/U: bold, italic,
          underline · Ctrl/⌘ + Z: undo · Ctrl/⌘ + Shift + Z: redo. Undo applies
          within a writing page. Use named versions to restore document-wide
          edits.
        </p>
      </section>
    </div>
  );
}
