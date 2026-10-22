# Adventure Drafter

A local-first, page-first adventure publishing desk for D&D and other tabletop RPGs. Write directly on styled paper with a structured rich-text editor. Markdown is an import format rather than the editing surface.

![Adventure Drafter page-first writing workspace](docs/editor.png)

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For a local-only development server use `npm run dev -- --host 127.0.0.1`.

```sh
npm run build
npm test
npm run check:architecture
npx playwright install chromium
npm run test:e2e
npm run check:worker
```

## Deploy on Cloudflare Workers

Connect `mmmbeer/adventure-drafter` in Cloudflare **Workers & Pages → Create → Import a repository**. Use:

- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

Cloudflare installs dependencies from `package-lock.json`. The build emits `dist/`. `wrangler.jsonc` serves these assets from a Worker with SPA fallback. There is no D1 database, account system, backend document service, or required secret. Local development and exports work without a server API.

For a manual deployment after authenticating with Cloudflare:

```sh
npm run deploy
```

## Writing and layout

- Direct-on-page Tiptap/ProseMirror editing, headings 1–9, inline typography, alignment, links, lists, highlights, sub/superscript, paragraph spacing/indentation and keep-with-next.
- Two columns by default, with one/two/three columns per document or page, column breaks and full-width paragraphs/headings.
- Letter, A4 and A5 paper with configurable margins, gutter, type size, line height, colors, running headers, footers and page numbering.
- Six content-preserving style presets, ten independent color themes, and ten font pairings with individual heading/body family controls. Twenty bundled open-source families plus system fonts and user-provided WOFF/WOFF2/TTF/OTF files.
- Read-aloud boxes, asides, encounter/treasure callouts, editable creature stat blocks, and resizable tables with row/column insertion/removal, headers, cell merging and splitting.
- Uploaded, pasted, dropped or URL-imported images. Percentage sizing, left/right text wrapping, alt text, optional captions and multiply blending. Per-page background art and opacity.
- Title pages, live heading-based contents, and a keyword index. Add keywords directly or index a text selection. Generated references account for continued contents/index sheets. The index uses case-insensitive substring matching.
- Page cards can be selected, dragged, moved, duplicated and deleted. Body overflow moves forward automatically. **Reflow body pages** closes gaps in automatic continuations after deletions or style changes. Explicit page breaks and pages with background art form boundaries. An individual unbreakable block that exceeds a column must be shortened/resized.
- Find and replace across text runs, print preview, browser printing and per-page undo/redo. Find does not join matches across differently formatted text runs. Named versions are the document-wide restore mechanism.

## Outline, references, and reusable content

Use **Outline** beside the page thumbnails to collapse headings, jump to a section, move it up/down or drag it before another section, and duplicate it. A section includes its subheadings and content across body pages, ending at the next heading of the same/higher level or a non-body page. Structural changes create a named restore point. Existing manual pages and their artwork remain in place while moved content reflows.

**Insert → Cross-reference** links to headings, creatures, encounters, tables, images, and reusable blocks. Choose title, page number, or both. Targets retain stable identities when moved or renamed. The inspector can give a target an optional reference name. Missing destinations are marked inline and listed in the outline. Duplicating sections remaps references inside the duplicate to its copied targets.

**Content library** stores searchable, categorized entries on this device and embeds used entries in project backups. Save the selected content or current block, then insert an independent copy or a linked instance. Edit an entry in the library, or edit an instance on the page and choose **Save current content**. **Review changes** shows the new text and every current linked instance before replacement. Updating an entry replaces linked instances in the current adventure, including local edits, and retains a restore point. Other projects are never silently rewritten; the latest device-library entry can be reviewed and applied there. Linked blocks stay together on a page; insert an independent copy for content that needs to flow across pages.

## Saved styles and page masters

**Style** offers independent color themes and font pairings with a live type preview. The **Default background color** control is always available in both **Page** and **Style**. Changing color themes, font pairings, or style presets preserves that background. Use **Use theme's suggested background** to explicitly adopt a palette's paper color. Choices are saved with the adventure, included in project backups, and carried into exports. Editable Word exports retain the document background, text/accent colors, and font choices. A page master's paper color overrides the document background on pages using that master.

**Style → Manage styles and page masters** creates or edits named paragraph/block styles, page masters, and custom color/font themes. Designs are saved locally for reuse and included in project backups. Apply a named style in the contextual inspector. Changes to its definition update its uses in the document.

Choose a default body master in **Document**, or override it for a selected page in **Page**. Masters support one to three columns, mirrored binding margins, alternating running headers, configurable footers, page-number visibility, paper color, and reusable background artwork. Built-ins include a mirrored book body, a chapter opener, and a cover. Use the selected page's uploaded artwork to create a master background. Page-specific columns and artwork override the master. Running text supports `{chapter}` as well as the existing document merge fields. Custom fonts must be included in a project to travel with its design.

## Local saves and portable projects

IndexedDB stores manuscripts and named versions asynchronously. The current draft autosaves after a short debounce. Projects are listed in the Projects dialog. Named versions are explicit checkpoints and restoring one first retains the outgoing draft.

**Download project backup** creates an `.adventure.json` file containing the complete structured document, embedded images and custom fonts. Import it on another device to continue editing. Browser storage is local to the current origin/profile and can be cleared or evicted. Keep downloaded backups for important work. The app requests persistent browser storage when a project is created or backed up, where supported.

Image inputs support PNG, JPEG, WebP and GIF up to 15 MB each. URL images are fetched and embedded in the browser. Hosts must permit cross-origin requests. No server-side image proxy is used. Custom fonts are limited to 8 MB and imports to 80 MB.

## Imports

- **Markdown:** CommonMark/GFM paragraphs, headings, emphasis, lists, tables, links and images, through Marked and an HTML sanitizer.
- **Homebrewery:** Markdown, `\page`, `\column`, common v3 `{{note}}`, `{{descriptive}}`, `{{readaloud}}` and `{{monster}}` blocks. Arbitrary custom CSS, exact Homebrewery themes, absolute positioning and unsupported directives are not reproduced. The import report makes review requirements explicit.
- **Word:** `.docx` via Mammoth, preserving semantic text, heading levels, lists, tables and embedded images. Word-specific floating shapes, geometry and background art require review. Convert legacy `.doc` files to `.docx` first.
- **Adventure Drafter JSON:** validated, sanitized structured projects. Import creates a distinct local project rather than overwriting the source.

Imports keep the outgoing project and make a named checkpoint. Imported HTML is sanitized and arbitrary scripts, frames and forms are removed. There are no remote font requests or runtime CDN dependencies.

## Publishing exports

Use the small info icon beside an export format to read its capabilities and limitations. Cards open on hover or keyboard focus. Click or tap to keep one open, and click again, click outside, move keyboard focus away, or press Escape to dismiss it. Escape closes the card before the export dialog.

| Format                | What is preserved                                                                                                                                                                                                                                                                            | Limits                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Word document (.docx) | Native editable text, headings, lists, links and tables. Reads resolved screen formatting, including font families, exact CSS pixel-to-point sizes, colors, cell widths and merged cells. Paper colors use native Word shapes. Graphical rules and backdrop artwork are embedded separately. | Word can reflow lines, columns, table continuations and pages. Chosen fonts must be installed. Some CSS artwork wrapping, transparency and floating layouts differ. |
| PDF (.pdf)            | On-screen appearance at 300 DPI with all page colors, fonts, artwork, graphical rules and explicit table fragments. Adds searchable text, links and heading bookmarks.                                                                                                                       | Visible pages are flattened. The search layer uses an embedded Unicode font. This is not a tagged-accessibility or vector-only PDF.                                 |
| Markdown (.md)        | Text, headings, inline formatting, lists, links, artwork and tables. Rejoins continued tables without duplicated headers. Merged cells use HTML. Artwork is embedded in the file.                                                                                                            | Markdown cannot preserve fonts, sizes, paper colors or exact pagination. HTML and data images depend on the Markdown reader.                                        |
| Page image (.png)     | A selected physical page at 300 DPI, including continued contents/index sheets.                                                                                                                                                                                                              | Flattened image.                                                                                                                                                    |

Project JSON backup remains under **Projects → Download current project (.json)**. It retains all editable Adventure Drafter data, images and custom fonts.

Exports wait for fonts, artwork and table/page flow to settle. PDF and PNG share the same fresh capture path, embed fonts from every exported page plus uploaded fonts, and remove editor controls and selection highlights. Word never captures page screenshots: text and tables are written as native Word elements, with native paper color shapes and separate background artwork behind the text. Each paper starts a new section and wide blocks switch column counts using continuous sections. Screen table fragments remain separate editable tables. Headers repeat and rows stay together if Word continues a fragment across columns or pages. Contents/index page labels and inline cross-reference labels reflect the exported editor layout. After Word edits or reflow, those labels may need manual updating. Header/footer page fields update in Word. Missing artwork or persistent overflow produces an actionable error rather than a partial download.

## Architecture

- `src/lib/types.ts`, `documents.ts`, `templates.ts`, `references.ts`, `validation.ts`: versioned schema, starter content, styling, generated references and validation
- `src/lib/editor.ts`: rich-text schema, layout attributes, sanitization and safe node splitting
- `src/components/PageEditor.tsx`: page canvas, inline editor and measured overflow handling
- `src/lib/storage.ts`: IndexedDB project/version transactions
- `src/lib/import.ts`: lazy-loaded format adapters
- `src/lib/export.ts`: downloads and portable source backups
- `src/lib/export-capture.ts`, `export-layout.ts`, `export-assets.ts`: settled page capture, fonts and artwork
- `src/lib/export-markdown.ts`, `markdown-inline.ts`: content-preserving Markdown serialization
- `src/lib/export-editable.ts`, `word-content.ts`, `word-table.ts`, `word-format.ts`, `word-styles.ts`: native Word layout and resolved typography
- `src/components/Toolbar.tsx`, `Inspector.tsx`, `Modal.tsx`: editing controls
- `src/App.tsx`: workspace composition
- `src/state/`: local draft lifecycle, workspace state, page editing, media, import and publishing actions
- `src/components/dialogs/`: feature-specific dialog bodies and pinned actions
- `src/styles/`: focused style modules
- `scripts/check-architecture.mjs`: enforces the 500-line source limit and custom-dialog rules during every build

The editor follows the direct-preview and content/style separation patterns of DND News, using ProseMirror transactions instead of ad-hoc `contenteditable` mutations. Rendering and editing share one document model. Large import/export libraries are loaded on demand. Bundled fonts are same-origin assets with their license texts in `/licenses/`.

## Validation

Unit tests cover generated references, continued-page accounting, safe rich-text splitting, all nine heading levels, sanitization, Markdown tables and Homebrewery constructs. Browser tests cover writing, template changes, local reload recovery, project round trips, long-document pagination without text loss, all publishing downloads, editable Word re-import, high headings, image insertion and wrapping. Additional checks cover narrow layouts, all three shared modal sizes, pinned headers/footers, Escape dismissal and native file selection.
