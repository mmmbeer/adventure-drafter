import type { JSONContent } from "@tiptap/core";
import { page as makePage } from "./documents";
import type { Adventure } from "./types";
import { appendFlow, type BackflowPlan } from "./backflow";

/** Commit a measured split once, atomically, only against its original source. */
export function applyPageFlow(
  doc: Adventure,
  id: string,
  before: JSONContent[],
  remaining: JSONContent[],
  moved: JSONContent[],
): Adventure {
  const i = doc.pages.findIndex((p) => p.id === id);
  if (
    i < 0 ||
    !remaining.length ||
    JSON.stringify(doc.pages[i].content.content) !== JSON.stringify(before)
  )
    return doc;
  const pages = [...doc.pages];
  const source = pages[i];
  const next = pages[i + 1];
  const reusable =
    next?.kind === "body" &&
    !next.breakBefore &&
    !next.background &&
    next.columns === source.columns &&
    next.masterId === source.masterId;
  if (moved.length && !reusable && pages.length >= 1000) return doc;
  pages[i] = { ...source, content: { type: "doc", content: remaining } };
  if (moved.length) {
    if (reusable) {
      pages[i + 1] = {
        ...next,
        continuedFrom: id,
        content: {
          type: "doc",
          content: appendFlow(moved, next.content.content ?? []),
        },
      };
    } else {
      pages.splice(i + 1, 0, {
        ...makePage("body", moved),
        breakBefore: false,
        continuedFrom: id,
        columns: source.columns,
        masterId: ["chapter-opener", "cover"].includes(source.masterId ?? "")
          ? undefined
          : source.masterId,
      });
    }
  }
  return { ...doc, pages };
}

/** Reject either half of a stale backflow plan before moving any rows. */
export function applyBackflow(
  doc: Adventure,
  id: string,
  plan: BackflowPlan,
): Adventure {
  const i = doc.pages.findIndex((p) => p.id === id);
  const prev = doc.pages[i],
    source = doc.pages[i + 1];
  if (
    i < 0 ||
    !prev ||
    !source ||
    source.id !== plan.sourceId ||
    prev.kind !== "body" ||
    source.kind !== "body" ||
    source.continuedFrom !== id ||
    source.breakBefore ||
    source.background ||
    source.masterId !== prev.masterId ||
    source.columns !== prev.columns ||
    JSON.stringify(prev.content.content ?? []) !==
      JSON.stringify(plan.before) ||
    JSON.stringify(source.content.content ?? []) !== JSON.stringify(plan.source)
  )
    return doc;
  const pages = [...doc.pages];
  pages[i] = {
    ...prev,
    content: {
      type: "doc",
      content: appendFlow(prev.content.content ?? [], plan.pulled),
    },
  };
  const tail = [
    ...(plan.remainder ? [plan.remainder] : []),
    ...(source.content.content ?? []).slice(plan.consumed),
  ];
  if (tail.length)
    pages[i + 1] = { ...source, content: { type: "doc", content: tail } };
  else {
    pages.splice(i + 1, 1);
    if (pages[i + 1]?.continuedFrom === source.id)
      pages[i + 1] = { ...pages[i + 1], continuedFrom: id };
  }
  return { ...doc, pages };
}
