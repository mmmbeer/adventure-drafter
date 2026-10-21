import { Extension } from "@tiptap/core";
import { colorThemes } from "./appearance";
import type { Theme } from "./types";
export const dividers = colorThemes.map((theme) => ({
  id: theme.id,
  name: theme.name,
  src: `/dividers/${theme.id}.png`,
}));
export function validDivider(value: unknown): value is string {
  return value === "theme" || dividers.some((d) => d.id === value);
}
export function themeDivider(theme: Theme) {
  const match = colorThemes.find(
    (p) => p.ink === theme.ink && p.accent === theme.accent,
  );
  const preset: Record<string, string> = {
    classic: "parchment",
    field: "forest",
    nocturne: "gothic",
    minimal: "ocean",
    oldschool: "monochrome",
    astral: "astral",
  };
  return match?.id ?? preset[theme.id] ?? "parchment";
}
export function dividerSource(id: string, theme: Theme) {
  return dividers.find(
    (d) => d.id === (id === "theme" ? themeDivider(theme) : id),
  )?.src;
}
export const DividerDecoration = Extension.create({
  name: "dividerDecoration",
  addGlobalAttributes() {
    return [
      {
        types: ["horizontalRule"],
        attributes: {
          divider: {
            default: null,
            parseHTML: (el) =>
              validDivider(el.dataset.divider) ? el.dataset.divider : null,
            renderHTML: (attrs) =>
              validDivider(attrs.divider)
                ? {
                    "data-divider": attrs.divider,
                    style: `background-image:${attrs.divider === "theme" ? "var(--theme-divider)" : `url('/dividers/${attrs.divider}.png')`}`,
                  }
                : {},
          },
        },
      },
    ];
  },
});
