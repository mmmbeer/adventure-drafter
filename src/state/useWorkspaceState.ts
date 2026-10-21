import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { nodeText, sizes, type Adventure } from "../lib/model";
import { saveDocument, listDocuments, listVersions } from "../lib/storage";
import { useLocalDraft } from "./useLocalDraft";
import type { MergeTagName } from "../lib/merge-tags";
import { useNotifications } from "./useNotifications";
export function useWorkspaceState() {
  const { notice, setNotice, report } = useNotifications();
  const [active, setActive] = useState("");
  const { doc, setDoc, docRef, ready, status, update } = useLocalDraft(
    report,
    setActive,
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tab, setTab] = useState("inspect");
  const [placeholderSource, setPlaceholderSource] = useState<{
    name: MergeTagName;
  } | null>(null);
  const [dialog, setDialog] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [zoom, setZoom] = useState(82);
  const [fit, setFit] = useState(true);
  const [preview, setPreview] = useState(false);
  const [leftOpen, setLeftOpen] = useState(window.innerWidth > 760);
  const [rightOpen, setRightOpen] = useState(window.innerWidth > 760);
  const [busy, setBusy] = useState("");
  const [documents, setDocuments] = useState<Adventure[]>([]);
  const [versions, setVersions] = useState<
    Awaited<ReturnType<typeof listVersions>>
  >([]);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [importSource, setImportSource] = useState("");
  const [homebrew, setHomebrew] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [imageFlow, setImageFlow] = useState("block");
  const [imageWidth, setImageWidth] = useState(60);
  const [link, setLink] = useState("");
  const [versionName, setVersionName] = useState("");
  const [pageMenu, setPageMenu] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "page" | "document";
    id: string;
  } | null>(null);
  const editors = useRef(new Map<string, Editor>());
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const dragging = useRef("");
  useEffect(() => {
    const el = workspace.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (fit)
        setZoom(
          Math.min(
            100,
            Math.max(
              25,
              Math.floor(
                ((el.clientWidth - 90) / sizes[doc.settings.size].width) * 100,
              ),
            ),
          ),
        );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, doc.settings.size, ready, leftOpen, rightOpen, preview]);
  const openDialog = useCallback(
    (name: string) => {
      setDialog(name);
      setWarnings([]);
      if (name === "image" || name === "background") {
        setImageUrl("");
        setAlt("");
        setCaption("");
      }
      if (name === "link") setLink(editor?.getAttributes("link").href || "");
      if (name === "documents") {
        listDocuments()
          .then(setDocuments)
          .catch((e) => report(e.message));
      }
      if (name === "versions") {
        listVersions(docRef.current.id)
          .then(setVersions)
          .catch((e) => report(e.message));
      }
    },
    [editor, report],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDocument(docRef.current)
          .then(() => report("Saved on this device."))
          .catch(() => report("Save failed. Download a project backup."));
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setDialog("find");
      }
      if (e.key === "Escape") setPageMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [report]);
  const matches = query
    ? doc.pages
        .flatMap((p) => {
          const ed = editors.current.get(p.id);
          const found: {
            pageId: string;
            from: number;
            to: number;
            text: string;
          }[] = [];
          ed?.state.doc.descendants((n, pos) => {
            if (n.isText && n.text) {
              let start = 0;
              while (true) {
                const at = n.text
                  .toLocaleLowerCase()
                  .indexOf(query.toLocaleLowerCase(), start);
                if (at < 0) break;
                found.push({
                  pageId: p.id,
                  from: pos + at,
                  to: pos + at + query.length,
                  text: n.text.slice(
                    Math.max(0, at - 35),
                    at + query.length + 45,
                  ),
                });
                start = at + Math.max(1, query.length);
                if (found.length >= 100) return false;
              }
            }
          });
          return found;
        })
        .slice(0, 200)
    : [];
  const words = doc.pages.reduce(
    (s, p) => s + nodeText(p.content).split(/\s+/).filter(Boolean).length,
    0,
  );
  return {
    doc,
    setDoc,
    docRef,
    ready,
    active,
    setActive,
    editor,
    setEditor,
    tab,
    setTab,
    placeholderSource,
    setPlaceholderSource,
    dialog,
    setDialog,
    status,
    notice,
    setNotice,
    warnings,
    setWarnings,
    zoom,
    setZoom,
    fit,
    setFit,
    preview,
    setPreview,
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    busy,
    setBusy,
    documents,
    setDocuments,
    versions,
    setVersions,
    query,
    setQuery,
    replacement,
    setReplacement,
    importSource,
    setImportSource,
    homebrew,
    setHomebrew,
    imageUrl,
    setImageUrl,
    alt,
    setAlt,
    caption,
    setCaption,
    imageFlow,
    setImageFlow,
    imageWidth,
    setImageWidth,
    link,
    setLink,
    versionName,
    setVersionName,
    pageMenu,
    setPageMenu,
    deleteTarget,
    setDeleteTarget,
    editors,
    fileInput,
    imageInput,
    fontInput,
    workspace,
    dragging,
    report,
    update,
    openDialog,
    matches,
    words,
  };
}
export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
