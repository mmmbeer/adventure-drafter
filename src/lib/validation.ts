import type { Adventure } from "./types";
import { sizes, themes } from "./templates";
import { createAdventure, uid } from "./documents";
export function validateAdventure(value: unknown): Adventure {
  const d = value as Adventure;
  if (
    !d ||
    d.format !== "adventure-drafter" ||
    d.version !== 1 ||
    !Array.isArray(d.pages) ||
    !d.pages.length ||
    d.pages.length > 1000 ||
    !d.settings ||
    !sizes[d.settings.size] ||
    typeof d.title !== "string" ||
    !d.settings.theme ||
    typeof d.settings.theme.bodyFont !== "string"
  )
    throw new Error("This is not a supported Adventure Drafter project.");
  const ids = new Set<string>();
  for (const p of d.pages) {
    if (
      !p ||
      !["body", "title", "toc", "index"].includes(p.kind) ||
      p.content?.type !== "doc" ||
      !Array.isArray(p.content.content)
    )
      throw new Error("The project contains an invalid page.");
    if (!p.id || ids.has(p.id)) p.id = uid();
    ids.add(p.id);
  }
  for (const key of ["author", "subtitle"] as const)
    d[key] = typeof d[key] === "string" ? d[key] : "";
  d.updatedAt =
    typeof d.updatedAt === "string" && Number.isFinite(Date.parse(d.updatedAt))
      ? d.updatedAt
      : new Date().toISOString();
  d.settings.theme = { ...themes[0], ...d.settings.theme };
  for (const key of ["paper", "ink", "accent"] as const)
    if (!/^#[0-9a-f]{6}$/i.test(d.settings.theme[key]))
      d.settings.theme[key] = themes[0][key];
  for (const key of ["headingFont", "bodyFont"] as const)
    if (
      typeof d.settings.theme[key] !== "string" ||
      d.settings.theme[key].length > 150
    )
      d.settings.theme[key] = themes[0][key];
  for (const p of d.pages) {
    if (p.continuedFrom && (typeof p.continuedFrom !== "string" || p.continuedFrom === p.id))
      delete p.continuedFrom;
    p.columns =
      p.columns === undefined
        ? undefined
        : Math.min(3, Math.max(1, Number(p.columns) || 2));
    if (
      p.background &&
      !/^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(
        p.background,
      )
    )
      delete p.background;
    p.backgroundOpacity = Math.min(
      1,
      Math.max(0, Number(p.backgroundOpacity ?? 0.22)),
    );
  }
  const base = createAdventure(true);
  d.settings = {
    ...base.settings,
    ...d.settings,
    footer: typeof d.settings.footer === "string" ? d.settings.footer : "",
    pageStart: Math.min(100000, Math.max(1, Number(d.settings.pageStart) || 1)),
    tocDepth: Math.min(9, Math.max(1, Number(d.settings.tocDepth) || 3)),
    columns: Math.min(3, Math.max(1, Number(d.settings.columns) || 2)),
    fontSize: Math.min(24, Math.max(10, Number(d.settings.fontSize) || 15)),
    margin: Math.min(100, Math.max(25, Number(d.settings.margin) || 58)),
    gutter: Math.min(60, Math.max(10, Number(d.settings.gutter) || 30)),
    lineHeight: Math.min(
      2,
      Math.max(1.1, Number(d.settings.lineHeight) || 1.4),
    ),
  };
  d.fonts = Array.isArray(d.fonts)
    ? d.fonts.filter(
        (f) =>
          typeof f.name === "string" &&
          /^data:(font\/|application\/)/.test(f.data),
      )
    : [];
  d.indexTerms = Array.isArray(d.indexTerms)
    ? d.indexTerms.filter((t) => typeof t === "string")
    : [];
  d.id = typeof d.id === "string" ? d.id : uid();
  return d;
}
