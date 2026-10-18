import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { extensions, cleanHtml, splitNode } from "../lib/editor";
import { dataUrl } from "../lib/fonts";
import { interpolateMergeTags } from "../lib/merge-tags";
import { planBackflow, type BackflowPlan } from "../lib/backflow";
import {
  sizes,
  entries,
  keywordIndex,
  pageNumber,
  generatedCapacity,
  type Adventure,
  type Page,
} from "../lib/model";
import type { JSONContent } from "@tiptap/core";
interface Props {
  doc: Adventure;
  page: Page;
  index: number;
  active: boolean;
  readOnly: boolean;
  onFocus: (editor: Editor | null, id: string) => void;
  onChange: (id: string, content: JSONContent) => void;
  onOverflow: (id: string, nodes: JSONContent[], cursor?: number) => void;
  onReclaim: (id: string, plan: BackflowPlan) => void;
  register: (id: string, editor: Editor | null) => void;
  report: (message: string) => void;
}
export function PageEditor({
  doc,
  page,
  index,
  active,
  readOnly,
  onFocus,
  onChange,
  onOverflow,
  onReclaim,
  register,
  report,
}: Props) {
  const [overflow, setOverflow] = useState(false);
  const [oversized, setOversized] = useState(false);
  const paginationPending = useRef(false);
  const nextPage = doc.pages[index + 1];
  const latest = useRef({ onChange, onFocus, onOverflow, onReclaim, page, nextPage, readOnly });
  latest.current = { onChange, onFocus, onOverflow, onReclaim, page, nextPage, readOnly };
  const container = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: extensions(),
    content: page.content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        "aria-label": `Page ${index + 1} writing area`,
        spellcheck: "true",
      },
      transformPastedHTML: cleanHtml,
      handlePaste: (_, event) => {
        const items = [...(event.clipboardData?.items ?? [])].filter((i) =>
          /^image\/(png|jpe?g|webp|gif)$/.test(i.type),
        );
        if (!items.length) return false;
        event.preventDefault();
        Promise.all(
          items.map(async (i) => {
            const f = i.getAsFile();
            if (f) {
              if (f.size > 15 * 1024 * 1024)
                throw new Error("Images must be smaller than 15 MB.");
              const src = await dataUrl(f);
              editor?.chain().focus().setImage({ src }).run();
            }
          }),
        ).catch((e) => report(e.message));
        return true;
      },
      handleDrop: (_, event, _slice, moved) => {
        if (moved) return false;
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) =>
          /^image\/(png|jpe?g|webp|gif)$/.test(f.type),
        );
        if (!files.length) return false;
        event.preventDefault();
        Promise.all(
          files.map(async (f) => {
            if (f.size > 15 * 1024 * 1024)
              throw new Error("Images must be smaller than 15 MB.");
            const src = await dataUrl(f);
            editor?.chain().focus().setImage({ src }).run();
          }),
        ).catch((e) => report(e.message));
        return true;
      },
    },
    onFocus: ({ editor }) => latest.current.onFocus(editor, page.id),
    onUpdate: ({ editor }) =>
      latest.current.onChange(page.id, editor.getJSON()),
  });
  useEffect(() => {
    if (editor) register(page.id, editor);
    return () => register(page.id, null);
  }, [editor, page.id]);
  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);
  useEffect(() => {
    if (
      editor &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(page.content)
    )
      editor.commands.setContent(page.content, { emitUpdate: false });
    // The editor and persisted page have caught up with the previous split.
    paginationPending.current = false;
  }, [editor, page.content]);
  useEffect(() => {
    if (!editor || page.kind === "toc" || page.kind === "index") return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!editor || editor.isDestroyed || paginationPending.current) return;
        const el = editor.view.dom;
        const spills =
          el.scrollWidth > el.clientWidth + 4 ||
          el.scrollHeight > el.clientHeight + 4;
        setOverflow(spills);
        setOversized(false);
        if (!spills && !latest.current.readOnly &&
            page.kind === "body" && !editor.view.composing) {
          const next = latest.current.nextPage;
          if (next?.kind === "body" && next.continuedFrom === page.id &&
              !next.breakBefore && !next.background) {
            const nextDom = document.querySelector<HTMLElement>(
              `.paper[data-page-id="${next.id}"] .page-writing .tiptap`,
            );
            if (nextDom && !nextDom.contains(document.activeElement)) {
              const plan = planBackflow(
                el, nextDom, editor.getJSON().content ?? [],
                next.content.content ?? [], next.id, editor.schema,
              );
              if (plan) latest.current.onReclaim(page.id, plan);
            }
          }
        }
        if (!spills || latest.current.readOnly ||
            page.kind !== "body" || editor.view.composing) return;
        const nodes: JSONContent[] =
          (editor.getJSON() as JSONContent).content ?? [];
        if (!nodes.length) return;
        const bounds = el.getBoundingClientRect();
        const children = [...el.children];
        let spill = children.findIndex((child) =>
          [...child.getClientRects()].some((r) =>
            r.right > bounds.right + 3 || r.left < bounds.left - 3 ||
            (el.scrollHeight > el.clientHeight + 4 && r.bottom > bounds.bottom + 3)),
        );
        if (spill < 0) spill = nodes.length - 1;
        spill = Math.min(spill, nodes.length - 1);
        // Multicolumn scroll metrics sometimes find a trailing image without
        // exposing an out-of-bounds child rect. Move that image with any empty
        // paragraphs that follow it, rather than endlessly moving blank text.
        while (
          spill > 0 && nodes[spill].type === "paragraph" &&
          !(nodes[spill].content ?? []).length
        ) spill--;
        let remaining = nodes.slice(0, spill),
          moved = nodes.slice(spill);
        if (spill === 0) {
          const split = splitNode(nodes[0]);
          if (!split) {
            setOversized(true);
            return;
          }
          remaining = [split[0]];
          moved = [split[1], ...nodes.slice(1)];
        } else if (remaining.at(-1)?.type === "heading") {
          moved.unshift(remaining.pop()!);
        }
        if (!moved.length || JSON.stringify(moved) === JSON.stringify(nodes)) {
          setOversized(true);
          return;
        }
        const selection = editor.state.selection.from;
        const retainedSize = remaining.reduce(
          (sum, n) => sum + editor.schema.nodeFromJSON(n).nodeSize,
          0,
        );
        const cursor =
          editor.isFocused && selection > retainedSize
            ? Math.max(1, selection - retainedSize)
            : undefined;
        paginationPending.current = true;
        editor.commands.setContent(
          { type: "doc", content: remaining },
          { emitUpdate: false },
        );
        editor.commands.setTextSelection(
          Math.min(selection, editor.state.doc.content.size),
        );
        latest.current.onChange(page.id, editor.getJSON());
        latest.current.onOverflow(page.id, moved, cursor);
      }, 700);
    };
    editor.on("update", check);
    const resize = new ResizeObserver(check);
    resize.observe(editor.view.dom);
    document.fonts.ready.then(check);
    check();
    return () => {
      clearTimeout(timer);
      editor.off("update", check);
      resize.disconnect();
    };
  }, [editor, doc.settings, page.content, page.kind, nextPage?.content, nextPage?.id, nextPage?.continuedFrom, readOnly]);
  const size = sizes[doc.settings.size];
  const style = {
    "--page-width": `${size.width}px`,
    "--page-height": `${size.height}px`,
    "--margin": `${doc.settings.margin}px`,
    "--gutter": `${doc.settings.gutter}px`,
    "--columns":
      page.kind === "title" ? 1 : (page.columns ?? doc.settings.columns),
    "--paper": doc.settings.theme.paper,
    "--ink": doc.settings.theme.ink,
    "--accent": doc.settings.theme.accent,
    "--heading-font": `"${doc.settings.theme.headingFont}"`,
    "--body-font": `"${doc.settings.theme.bodyFont}"`,
    "--body-size": `${doc.settings.fontSize}px`,
    "--line-height": doc.settings.lineHeight,
  } as CSSProperties;
  const toc = entries(doc).filter((x) => x.level <= doc.settings.tocDepth);
  const terms = keywordIndex(doc);
  // Long generated sections are continued on additional physical pages, without truncation.
  const generated =
    page.kind === "toc" ? toc : page.kind === "index" ? terms : [];
  const perSheet = generatedCapacity(doc);
  const chunks = Math.max(1, Math.ceil(generated.length / perSheet));
  const frame = (part = 0) => (
    <article
      ref={part === 0 ? container : undefined}
      className={`paper ${page.kind} ${active ? "active" : ""}`}
      data-page-id={page.id}
      data-part={part}
      style={style}
      onClick={() =>
        onFocus(
          page.kind === "toc" || page.kind === "index" ? null : editor,
          page.id,
        )
      }
      key={part}
    >
      {page.background && (
        <div
          className="page-background"
          style={{
            backgroundImage: `url("${page.background}")`,
            opacity: page.backgroundOpacity ?? 0.22,
          }}
        />
      )}
      <div className="running-header">
        <span>{doc.title}</span>
        <span>
          {page.kind === "body"
            ? "ADVENTURE"
            : page.kind === "title"
              ? ""
              : page.kind.toUpperCase()}
        </span>
      </div>
      {page.kind === "toc" ? (
        <section className="generated">
          <p className="eyebrow">FIND YOUR WAY</p>
          <h1>Contents{part > 0 ? " · continued" : ""}</h1>
          {toc.slice(part * perSheet, (part + 1) * perSheet).map((e, i) => (
            <a
              href={`#page-${e.pageId}`}
              className="toc-entry"
              key={i}
              style={{ paddingLeft: (e.level - 1) * 14 }}
            >
              <span>{e.title}</span>
              <i />
              <b>{e.page}</b>
            </a>
          ))}
          {!toc.length && (
            <p>
              Add headings to the adventure. They will appear here
              automatically.
            </p>
          )}
        </section>
      ) : page.kind === "index" ? (
        <section className="generated">
          <p className="eyebrow">NAMES, PLACES & SECRETS</p>
          <h1>Index{part > 0 ? " · continued" : ""}</h1>
          {terms.slice(part * perSheet, (part + 1) * perSheet).map((e) => (
            <div className="toc-entry" key={e.term}>
              <span>{e.term}</span>
              <i />
              <b>{e.pages.join(", ") || "—"}</b>
            </div>
          ))}
          {!terms.length && (
            <p>
              Add keywords in the Publishing panel or select text and choose
              “Index selection.”
            </p>
          )}
        </section>
      ) : (
        <EditorContent editor={editor} className="page-writing" />
      )}
      {doc.pages[index + 1]?.continuedFrom === page.id && page.kind === "body" && (
        <div className="continuation-hint no-print" role="note" aria-label="Content continues on next page">
          Continued on next page ↘
        </div>
      )}
      <footer className="page-footer">
        <span>{interpolateMergeTags(doc.settings.footer || doc.author, doc, pageNumber(doc, index) + part)}</span>
        {!page.hideNumber && page.kind !== "title" && (
          <b>{pageNumber(doc, index) + part}</b>
        )}
        <span>{doc.title}</span>
      </footer>
      {overflow && (
        <div className="overflow-note no-print">
          {oversized
            ? "This block is too large for the page. Shorten it, reduce its size, or use more space."
            : page.kind === "body"
              ? "Flowing content to the next page…"
              : "Content exceeds this page. Shorten it or reduce the type size."}
        </div>
      )}
    </article>
  );
  return (
    <div className="page-stack" id={`page-${page.id}`}>
      {Array.from({ length: chunks }, (_, i) => frame(i))}
    </div>
  );
}
