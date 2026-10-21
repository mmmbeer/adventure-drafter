import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import {
  page as makePage,
  heading,
  paragraph,
  type PageKind,
} from "../lib/model";
import type { WorkspaceState } from "./useWorkspaceState";
import { applyPageFlow, applyBackflow } from "../lib/page-flow";
import { appendFlow, type BackflowPlan } from "../lib/backflow";
export function usePageActions(state: WorkspaceState) {
  const {
    doc,
    active,
    setActive,
    editor,
    setEditor,
    setTab,
    setPageMenu,
    editors,
    report,
    update,
  } = state;
  const focus = useCallback((ed: Editor | null, id: string) => {
    setActive(id);
    setEditor(ed);
  }, []);
  const register = useCallback((id: string, ed: Editor | null) => {
    if (ed) editors.current.set(id, ed);
    else editors.current.delete(id);
  }, []);
  const change = useCallback(
    (id: string, content: JSONContent) =>
      update((d) => ({
        ...d,
        pages: d.pages.map((p) => (p.id === id ? { ...p, content } : p)),
      })),
    [update],
  );
  const overflow = useCallback(
    (
      id: string,
      before: JSONContent[],
      remaining: JSONContent[],
      nodes: JSONContent[],
      cursor?: number,
    ) =>
      update((d) => {
        const result = applyPageFlow(d, id, before, remaining, nodes);
        if (result === d) return d;
        const i = result.pages.findIndex((p) => p.id === id);
        const nextId = result.pages[i + 1]?.id;
        if (cursor !== undefined)
          setTimeout(() => {
            const ed = editors.current.get(nextId!);
            if (ed) {
              setActive(nextId!);
              setEditor(ed);
              ed.chain()
                .focus()
                .setTextSelection(Math.min(cursor, ed.state.doc.content.size))
                .run();
            }
          }, 80);
        return result;
      }),
    [update],
  );
  const reclaim = useCallback(
    (id: string, plan: BackflowPlan) => {
      update((d) => applyBackflow(d, id, plan));
      if (
        active === plan.sourceId &&
        plan.consumed === plan.source.length &&
        !plan.remainder
      ) {
        setActive(id);
        setEditor(editors.current.get(id) ?? null);
      }
    },
    [update, active, editors, setActive, setEditor],
  );
  const activePage = doc.pages.find((p) => p.id === active) ?? doc.pages[0];
  const goPage = (id: string) => {
    setActive(id);
    const ed = editors.current.get(id) ?? null;
    setEditor(ed);
    document
      .getElementById(`page-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const addPage = (kind: PageKind) => {
    let content: JSONContent[] = [paragraph()];
    if (kind === "title")
      content = [
        paragraph("A TABLETOP ADVENTURE"),
        heading(doc.title),
        paragraph(doc.subtitle),
        paragraph(`Written by ${doc.author}`),
      ];
    const p = makePage(kind, content);
    update((d) => {
      const pages = [...d.pages];
      pages.splice(
        Math.max(
          0,
          pages.findIndex((p) => p.id === active),
        ) + 1,
        0,
        p,
      );
      return { ...d, pages };
    });
    setActive(p.id);
    setPageMenu(false);
    setTimeout(() => goPage(p.id), 100);
  };
  const splitPage = () => {
    if (!editor) {
      addPage("body");
      return;
    }
    const { from } = editor.state.selection;
    const tail = editor.state.doc.slice(from).toJSON()?.content ?? [];
    editor.commands.deleteRange({ from, to: editor.state.doc.content.size });
    const p = makePage("body", tail.length ? tail : [paragraph()]);
    update((d) => {
      const pages = [...d.pages];
      const i = pages.findIndex((p) => p.id === active);
      pages.splice(i + 1, 0, p);
      return { ...d, pages };
    });
    setActive(p.id);
    setTimeout(() => goPage(p.id), 100);
  };
  const move = (id: string, delta: number) =>
    update((d) => {
      const pages = [...d.pages];
      const i = pages.findIndex((p) => p.id === id),
        j = i + delta;
      if (j < 0 || j >= pages.length) return d;
      [pages[i], pages[j]] = [pages[j], pages[i]];
      return { ...d, pages };
    });
  const indexSelection = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const term = editor.state.doc.textBetween(from, to, " ").trim();
    if (term) {
      update((d) => ({
        ...d,
        indexTerms: [...new Set([...d.indexTerms, term])],
      }));
      setTab("document");
      report(`“${term}” added to the index.`);
    }
  };
  const reflow = () => {
    const groups: typeof doc.pages = [];
    let buffer: typeof doc.pages = [];
    const flush = () => {
      if (!buffer.length) return;
      groups.push({
        ...buffer[0],
        continuedFrom: undefined,
        content: {
          type: "doc",
          content: buffer.reduce<JSONContent[]>(
            (all, p) => appendFlow(all, p.content.content ?? []),
            [],
          ),
        },
      });
      buffer = [];
    };
    for (const p of doc.pages) {
      if (
        p.kind === "body" &&
        (!buffer.length ||
          (!p.breakBefore &&
            p.columns === buffer[0].columns &&
            p.masterId === buffer[0].masterId)) &&
        !p.background &&
        !p.paper &&
        !p.runningText
      )
        buffer.push(p);
      else {
        flush();
        groups.push(p);
      }
    }
    flush();
    update((d) => ({ ...d, pages: groups }));
    setActive(groups[0].id);
    setEditor(null);
    report(
      "Reflowing body text. Title, contents, index and background pages stay separate.",
    );
  };
  return {
    focus,
    register,
    change,
    overflow,
    reclaim,
    activePage,
    goPage,
    addPage,
    splitPage,
    move,
    indexSelection,
    reflow,
  };
}
