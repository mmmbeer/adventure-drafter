import type { JSONContent } from "@tiptap/core";
import type { Adventure } from "./types";
import { mergeValue } from "./merge-tags";
import { referenceValue } from "./cross-references";

export const htmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export const markdownEscape = (value: string) =>
  value
    .replace(/([\\`*_{}\[\]<>|~])/g, "\\$1")
    .replace(/^([ \t]*)([#>+-]|\d+\.)/gm, "$1\\$2");
export function markdownUrl(url: string) {
  return /^(https?:|mailto:|data:image\/(?:png|jpeg|webp|gif);base64,|#)/i.test(
    url,
  )
    ? url.replace(/[\s<>"()]/g, (char) => encodeURIComponent(char))
    : "";
}
export function markdownInline(
  nodes: JSONContent[] = [],
  doc: Adventure,
  page: number,
): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type === "mergeTag")
        return markdownEscape(mergeValue(doc, node.attrs?.name || "", page));
      if (node.type === "crossReference") {
        const value = markdownEscape(referenceValue(doc, node.attrs ?? {}));
        return node.attrs?.targetId
          ? `[${value}](#ref-${encodeURIComponent(node.attrs.targetId)})`
          : value;
      }
      if (node.type !== "text") return markdownInline(node.content, doc, page);
      let value = markdownEscape(node.text || "");
      const wrap = (open: string, close = open) =>
        value.replace(
          /^(\s*)([\s\S]*?)(\s*)$/,
          (_, before, middle, after) =>
            `${before}${open}${middle}${close}${after}`,
        );
      for (const mark of node.marks ?? []) {
        if (mark.type === "code") {
          const longest = Math.max(
            0,
            ...[...(node.text || "").matchAll(/`+/g)].map((m) => m[0].length),
          );
          const fence = "`".repeat(longest + 1);
          value = `${fence} ${node.text || ""} ${fence}`;
        } else if (mark.type === "bold") value = wrap("**");
        else if (mark.type === "italic") value = wrap("*");
        else if (mark.type === "strike") value = wrap("~~");
        else if (mark.type === "underline") value = `<u>${value}</u>`;
        else if (mark.type === "superscript") value = `<sup>${value}</sup>`;
        else if (mark.type === "subscript") value = `<sub>${value}</sub>`;
        else if (mark.type === "highlight") value = `<mark>${value}</mark>`;
        else if (mark.type === "link") {
          const url = markdownUrl(mark.attrs?.href || "");
          if (url) value = `[${value}](${url})`;
        }
      }
      return value;
    })
    .join("");
}
