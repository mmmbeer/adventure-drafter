import type { Adventure, Theme } from "./types";
import type { NamedStyle, PageMaster, LibraryEntry } from "./authoring-types";
import { validId } from "./anchors";
const color = (v: unknown, fallback: string) =>
  typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v) ? v : fallback;
const text = (v: unknown, fallback = "", max = 500) =>
  typeof v === "string" ? v.slice(0, max) : fallback;
const number = (v: unknown, fallback: number, min: number, max: number) =>
  Number.isFinite(Number(v))
    ? Math.max(min, Math.min(max, Number(v)))
    : fallback;
const array = <T extends { id: string }>(items: unknown): T[] =>
  Array.isArray(items)
    ? items
        .filter(
          (item): item is T =>
            !!item && typeof item === "object" && validId(item.id),
        )
        .slice(0, 2000)
        .filter((item, i, all) => all.findIndex((x) => x.id === item.id) === i)
    : [];
export function validateAuthoring(doc: Adventure) {
  doc.namedStyles = array<NamedStyle>(doc.namedStyles).map((s) => ({
    id: s.id,
    name: text(s.name, "Style", 100),
    fontFamily: text(s.fontFamily, "Georgia", 150),
    fontSize: number(s.fontSize, 15, 8, 72),
    color: color(s.color, "#302b24"),
    background: color(s.background, "#ffffff"),
    lineHeight: number(s.lineHeight, 1.4, 1, 3),
    spaceBefore: number(s.spaceBefore, 0, 0, 100),
    spaceAfter: number(s.spaceAfter, 10, 0, 100),
    bold: s.bold === true,
    italic: s.italic === true,
    border: s.border === true,
  }));
  doc.pageMasters = array<PageMaster>(doc.pageMasters).map((m) => ({
    id: m.id,
    name: text(m.name, "Page master", 100),
    columns: Math.round(number(m.columns, 2, 1, 3)),
    margin: number(m.margin, 58, 25, 150),
    innerMargin: number(m.innerMargin, 72, 25, 150),
    mirror: m.mirror === true,
    headerOdd: text(m.headerOdd),
    headerEven: text(m.headerEven),
    footer: text(m.footer),
    hideHeader: m.hideHeader === true,
    hideNumber: m.hideNumber === true,
    paper: m.paper ? color(m.paper, doc.settings.theme.paper) : undefined,
    background:
      typeof m.background === "string" &&
      /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(
        m.background,
      )
        ? m.background
        : undefined,
    backgroundOpacity: number(m.backgroundOpacity, 0.22, 0, 1),
  }));
  doc.savedThemes = array<Theme>(doc.savedThemes).map((t) => ({
    id: t.id,
    name: text(t.name, "Custom theme", 100),
    description: text(t.description),
    paper: color(t.paper, "#ffffff"),
    ink: color(t.ink, "#302b24"),
    accent: color(t.accent, "#823a32"),
    headingFont: text(t.headingFont, "Georgia", 150),
    bodyFont: text(t.bodyFont, "Georgia", 150),
  }));
  doc.contentLibrary = array<LibraryEntry>(doc.contentLibrary)
    .filter((e) => Array.isArray(e.content) && e.content.length > 0)
    .map((e) => ({
      id: e.id,
      name: text(e.name, "Reusable content", 100),
      category: [
        "NPC",
        "Creature",
        "Location",
        "Item",
        "Encounter",
        "Boxed text",
        "Other",
      ].includes(e.category)
        ? e.category
        : "Other",
      revision: Math.round(number(e.revision, 1, 1, 1000000)),
      updatedAt: text(e.updatedAt),
      tags: Array.isArray(e.tags)
        ? e.tags
            .filter((t) => typeof t === "string")
            .slice(0, 50)
            .map((t) => t.slice(0, 100))
        : [],
      content: e.content,
    }));
  if (!validId(doc.settings.defaultMasterId))
    delete doc.settings.defaultMasterId;
  for (const page of doc.pages)
    if (!validId(page.masterId)) delete page.masterId;
}
