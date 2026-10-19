import type { JSONContent } from "@tiptap/core";
import type { Theme } from "./types";
export interface LibraryEntry {
  id: string;
  name: string;
  category:
    | "NPC"
    | "Creature"
    | "Location"
    | "Item"
    | "Encounter"
    | "Boxed text"
    | "Other";
  tags: string[];
  revision: number;
  content: JSONContent[];
  updatedAt: string;
}
export interface NamedStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  background: string;
  lineHeight: number;
  spaceBefore: number;
  spaceAfter: number;
  bold: boolean;
  italic: boolean;
  border: boolean;
}
export interface PageMaster {
  id: string;
  name: string;
  columns: number;
  margin: number;
  innerMargin: number;
  mirror: boolean;
  headerOdd: string;
  headerEven: string;
  footer: string;
  hideHeader: boolean;
  hideNumber: boolean;
  background?: string;
  backgroundOpacity: number;
  paper?: string;
}
export interface DesignLibrary {
  themes: Theme[];
  styles: NamedStyle[];
  masters: PageMaster[];
}
