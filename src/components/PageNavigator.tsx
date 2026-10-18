import {
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  BookOpen,
  PanelLeftClose,
  Search,
  HelpCircle,
  LayoutTemplate,
} from "lucide-react";
import { uid, nodeText, pageNumber, type PageKind } from "../lib/model";
import { useDesk } from "../state/context";
export function PageNavigator() {
  const {
    doc,
    setDialog,
    preview,
    leftOpen,
    setLeftOpen,
    pageMenu,
    setPageMenu,
    setDeleteTarget,
    dragging,
    update,
    openDialog,
    activePage,
    goPage,
    addPage,
    move,
    reflow,
  } = useDesk();
  return (
    <aside className={`navigator ${leftOpen && !preview ? "" : "collapsed"}`}>
      <div className="navigator-head">
        <span>MANUSCRIPT</span>
        <button
          title="Collapse pages"
          aria-label="Collapse pages"
          onClick={() => setLeftOpen(false)}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <div className="navigator-doc">
        <BookOpen size={17} />
        <b>{doc.title}</b>
      </div>
      <div className="page-list">
        {doc.pages.map((p, i) => (
          <div
            key={p.id}
            className={`page-card ${activePage.id === p.id ? "current" : ""}`}
            draggable
            onDragStart={() => (dragging.current = p.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragging.current;
              update((d) => {
                const pages = d.pages.filter((p) => p.id !== from);
                const target = pages.findIndex((x) => x.id === p.id);
                pages.splice(
                  Math.max(0, target),
                  0,
                  d.pages.find((p) => p.id === from)!,
                );
                return { ...d, pages };
              });
            }}
          >
            <button className="page-pick" onClick={() => goPage(p.id)}>
              <span
                className={`page-mini ${p.kind}`}
                style={{
                  background: doc.settings.theme.paper,
                  color: doc.settings.theme.accent,
                }}
              >
                <span>
                  {p.kind === "title"
                    ? "✧"
                    : p.kind === "toc"
                      ? "≡"
                      : p.kind === "index"
                        ? "A–Z"
                        : pageNumber(doc, i)}
                </span>
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="page-card-title">
                <b>
                  {p.kind === "body"
                    ? nodeText(
                        p.content.content?.find((n) => n.type === "heading") ??
                          p.content,
                      ).slice(0, 35) || "Untitled page"
                    : p.kind === "title"
                      ? "Title page"
                      : p.kind === "toc"
                        ? "Table of contents"
                        : "Keyword index"}
                </b>
                <small>
                  {p.kind === "body"
                    ? "Adventure page"
                    : p.kind === "title"
                      ? "Cover"
                      : "Generated page"}{" "}
                  · {i + 1}
                </small>
              </span>
            </button>
            <div className="page-actions">
              <button
                aria-label={`Move page ${i + 1} up`}
                disabled={!i}
                onClick={() => move(p.id, -1)}
              >
                <ChevronUp size={13} />
              </button>
              <button
                aria-label={`Move page ${i + 1} down`}
                disabled={i === doc.pages.length - 1}
                onClick={() => move(p.id, 1)}
              >
                <ChevronDown size={13} />
              </button>
              <button
                aria-label={`Duplicate page ${i + 1}`}
                onClick={() =>
                  update((d) => {
                    const pages = [...d.pages];
                    pages.splice(i + 1, 0, {
                      ...structuredClone(p),
                      id: uid(),
                    });
                    return { ...d, pages };
                  })
                }
              >
                <Copy size={12} />
              </button>
              <button
                aria-label={`Delete page ${i + 1}`}
                disabled={doc.pages.length === 1}
                onClick={() => {
                  setDeleteTarget({ type: "page", id: p.id });
                  setDialog("delete");
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="add-page-wrap">
        <button className="add-page" onClick={() => setPageMenu(!pageMenu)}>
          <Plus size={16} /> Add page <ChevronDown size={13} />
        </button>
        {pageMenu && (
          <div className="page-menu">
            {(["body", "title", "toc", "index"] as PageKind[]).map((k) => (
              <button key={k} onClick={() => addPage(k)}>
                {k === "body"
                  ? "Adventure page"
                  : k === "title"
                    ? "Title page"
                    : k === "toc"
                      ? "Table of contents"
                      : "Keyword index"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="navigator-bottom">
        <button onClick={reflow}>
          <LayoutTemplate size={15} /> Reflow body pages
        </button>
        <button onClick={() => openDialog("find")}>
          <Search size={15} /> Find & replace
        </button>
        <button onClick={() => openDialog("help")}>
          <HelpCircle size={15} /> Writing desk guide
        </button>
      </div>
    </aside>
  );
}
