import type { Adventure, Page, RunningText } from "./types";
import type { PageMaster } from "./authoring-types";

export const runningFields = [
  ["headerLeft", "Header · left"],
  ["headerRight", "Header · right"],
  ["footerLeft", "Footer · left"],
  ["footerCenter", "Footer · center"],
  ["footerRight", "Footer · right"],
] as const;

export function runningTemplates(
  doc: Adventure,
  page: Page,
  number: number,
  master?: PageMaster,
): RunningText {
  return {
    headerLeft: master
      ? number % 2
        ? master.headerOdd
        : master.headerEven
      : "{title}",
    headerRight:
      page.kind === "body"
        ? "ADVENTURE"
        : page.kind === "title"
          ? ""
          : page.kind.toUpperCase(),
    footerLeft: master ? master.footer : doc.settings.footer || "{author}",
    footerCenter: "{page}",
    footerRight: "{title}",
    ...doc.settings.runningText,
    ...page.runningText,
  };
}

export function cleanRunningText(
  value: unknown,
): Partial<RunningText> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: Partial<RunningText> = {};
  for (const [key] of runningFields) {
    const text = (value as Record<string, unknown>)[key];
    if (typeof text === "string") result[key] = text.slice(0, 500);
  }
  return Object.keys(result).length ? result : undefined;
}
