import type { Theme } from "./types";

export interface ColorTheme {
  id: string;
  name: string;
  paper: string;
  ink: string;
  accent: string;
}

export const colorThemes: ColorTheme[] = [
  {
    id: "parchment",
    name: "Classic parchment",
    paper: "#f7f1df",
    ink: "#302b24",
    accent: "#823a32",
  },
  {
    id: "forest",
    name: "Forest journal",
    paper: "#f6f5eb",
    ink: "#263a30",
    accent: "#456750",
  },
  {
    id: "gothic",
    name: "Gothic plum",
    paper: "#eee9e4",
    ink: "#352d3b",
    accent: "#64415f",
  },
  {
    id: "ocean",
    name: "Ocean blue",
    paper: "#f0f6fa",
    ink: "#203549",
    accent: "#285f85",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    paper: "#ffffff",
    ink: "#20201e",
    accent: "#20201e",
  },
  {
    id: "astral",
    name: "Astral violet",
    paper: "#f1f0f8",
    ink: "#33334b",
    accent: "#5c5395",
  },
  {
    id: "desert",
    name: "Desert copper",
    paper: "#fbf1e4",
    ink: "#443128",
    accent: "#99502b",
  },
  {
    id: "rose",
    name: "Rose manuscript",
    paper: "#fff4f2",
    ink: "#493039",
    accent: "#963b59",
  },
  {
    id: "slate",
    name: "Slate and steel",
    paper: "#f3f5f7",
    ink: "#293440",
    accent: "#4d6579",
  },
  {
    id: "emerald",
    name: "Emerald archive",
    paper: "#eef7f2",
    ink: "#203b35",
    accent: "#236653",
  },
];

export const fontPairings = [
  {
    id: "classic",
    name: "Classic adventure",
    headingFont: "Cinzel",
    bodyFont: "Alegreya",
  },
  {
    id: "literary",
    name: "Literary folio",
    headingFont: "Cormorant Garamond",
    bodyFont: "EB Garamond",
  },
  {
    id: "gothic",
    name: "Gothic chronicle",
    headingFont: "Pirata One",
    bodyFont: "Crimson Pro",
  },
  {
    id: "modern",
    name: "Modern quest",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
  },
  {
    id: "zine",
    name: "Old-school zine",
    headingFont: "Oswald",
    bodyFont: "Libre Baskerville",
  },
  {
    id: "astral",
    name: "Astral atlas",
    headingFont: "Uncial Antiqua",
    bodyFont: "Spectral",
  },
  {
    id: "storybook",
    name: "Storybook",
    headingFont: "Almendra",
    bodyFont: "Lora",
  },
  {
    id: "antiquarian",
    name: "Antiquarian",
    headingFont: "IM FELL English",
    bodyFont: "Cardo",
  },
  {
    id: "scribe",
    name: "Scribe's journal",
    headingFont: "Fondamento",
    bodyFont: "Vollkorn",
  },
  {
    id: "terminal",
    name: "Expedition report",
    headingFont: "Inter",
    bodyFont: "JetBrains Mono",
  },
];

export function applyColorTheme(theme: Theme, palette: ColorTheme): Theme {
  return { ...theme, ink: palette.ink, accent: palette.accent };
}

export function applyFontPairing(
  theme: Theme,
  pairing: (typeof fontPairings)[number],
): Theme {
  return {
    ...theme,
    headingFont: pairing.headingFont,
    bodyFont: pairing.bodyFont,
  };
}

export function applyStylePreset(theme: Theme, preset: Theme): Theme {
  return { ...preset, paper: theme.paper };
}
