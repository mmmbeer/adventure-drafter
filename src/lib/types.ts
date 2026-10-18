import type { JSONContent } from "@tiptap/core";
export type PageKind = "body" | "title" | "toc" | "index";
export interface Page {
  id: string;
  kind: PageKind;
  content: JSONContent;
  columns?: number;
  background?: string;
  backgroundOpacity?: number;
  hideNumber?: boolean;
  breakBefore?: boolean;
}
export interface Theme {
  id: string;
  name: string;
  description: string;
  paper: string;
  ink: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
}
export interface Adventure {
  format: "adventure-drafter";
  version: 1;
  id: string;
  title: string;
  author: string;
  subtitle: string;
  updatedAt: string;
  pages: Page[];
  settings: {
    theme: Theme;
    size: "letter" | "a4" | "a5";
    columns: number;
    fontSize: number;
    lineHeight: number;
    margin: number;
    gutter: number;
    pageStart: number;
    footer: string;
    tocDepth: number;
  };
  indexTerms: string[];
  fonts: { name: string; data: string }[];
}
