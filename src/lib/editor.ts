import {
  Node,
  Extension,
  mergeAttributes,
  type JSONContent,
} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import {
  TextStyle,
  FontFamily,
  Color,
  FontSize,
} from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import DOMPurify from "dompurify";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TemplateNode } from "../components/TemplateNode";
import { ImageNode } from "../components/ImageNode";
const Heading = Node.create({
  name: "heading",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: (e) => Number(e.dataset.level || e.tagName.slice(1)) || 1,
      },
    };
  },
  parseHTML() {
    return [
      ...[1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}` })),
      { tag: "div[data-level]" },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const level = Number(node.attrs.level);
    return [
      level > 6 ? "div" : `h${level}`,
      mergeAttributes(HTMLAttributes, {
        "data-level": level,
        ...(level > 6 ? { role: "heading", "aria-level": level } : {}),
      }),
      0,
    ];
  },
});
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { kind: { default: "readaloud", parseHTML: (e) => e.dataset.kind } };
  },
  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TemplateNode);
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        "data-kind": HTMLAttributes.kind,
      }),
      0,
    ];
  },
});
const StatBlock = Node.create({
  name: "statBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { kind: { default: "creature", parseHTML: (e) => e.dataset.kind || "creature" } };
  },
  parseHTML() {
    return [{ tag: "section[data-statblock]" }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TemplateNode);
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-statblock": "", "data-kind": HTMLAttributes.kind }),
      0,
    ];
  },
});
const ColumnBreak = Node.create({
  name: "columnBreak",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "div[data-column-break]" }];
  },
  renderHTML() {
    return ["div", { "data-column-break": "", "aria-label": "Column break" }];
  },
});
export function safeImageUrl(value: string) {
  return (
    /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) ||
    /^https?:\/\//i.test(value)
  );
}
const AdventureImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNode);
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (e) =>
          safeImageUrl(e.getAttribute("src") || "")
            ? e.getAttribute("src")
            : null,
      },
      width: {
        default: 100,
        parseHTML: (e) =>
          Math.min(100, Math.max(10, Number(e.dataset.width) || 100)),
        renderHTML: (a) => ({
          "data-width": a.width,
          style: `width:${a.width}%`,
        }),
      },
      flow: {
        default: "block",
        parseHTML: (e) => e.dataset.flow || "block",
        renderHTML: (a) => ({ "data-flow": a.flow }),
      },
      blend: {
        default: "normal",
        parseHTML: (e) => e.dataset.blend || "normal",
        renderHTML: (a) => ({ "data-blend": a.blend }),
      },
    };
  },
}).configure({ allowBase64: true });
const Layout = Extension.create({
  name: "layout",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "callout", "statBlock", "table", "image"],
        attributes: {
          wide: {
            default: false,
            parseHTML: (e) => e.dataset.wide === "true",
            renderHTML: (a) => ({ "data-wide": String(a.wide) }),
          },
          templateField: {
            default: null,
            parseHTML: (e) => e.dataset.templateField || null,
            renderHTML: (a) => a.templateField ? { "data-template-field": a.templateField } : {},
          },
          keep: {
            default: false,
            parseHTML: (e) => e.dataset.keep === "true",
            renderHTML: (a) => ({ "data-keep": String(a.keep) }),
          },
          indent: {
            default: 0,
            parseHTML: (e) => parseFloat(e.style.paddingLeft) || 0,
            renderHTML: (a) =>
              a.indent ? { style: `padding-left:${a.indent}px` } : {},
          },
          lineHeight: {
            default: null,
            parseHTML: (e) => e.style.lineHeight || null,
            renderHTML: (a) =>
              a.lineHeight ? { style: `line-height:${a.lineHeight}` } : {},
          },
          spaceBefore: {
            default: null,
            parseHTML: (e) => e.style.marginTop || null,
            renderHTML: (a) =>
              a.spaceBefore ? { style: `margin-top:${a.spaceBefore}` } : {},
          },
          spaceAfter: {
            default: null,
            parseHTML: (e) => e.style.marginBottom || null,
            renderHTML: (a) =>
              a.spaceAfter ? { style: `margin-bottom:${a.spaceAfter}` } : {},
          },
        },
      },
      {
        types: ["callout", "statBlock"],
        attributes: {
          width: {
            default: 100,
            parseHTML: (e) => Math.min(100, Math.max(20, Number(e.dataset.width) || 100)),
            renderHTML: (a) => ({ "data-width": a.width, style: `width:${a.width}%` }),
          },
          flow: {
            default: "block",
            parseHTML: (e) => e.dataset.flow || "block",
            renderHTML: (a) => ({ "data-flow": a.flow }),
          },
        },
      },
    ];
  },
});
export function extensions() {
  return [
    StarterKit.configure({
      heading: false,
      underline: {},
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      },
    }),
    Heading,
    AdventureImage,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyle,
    FontFamily,
    Color,
    FontSize,
    Highlight.configure({ multicolor: true }),
    Typography,
    Superscript,
    Subscript,
    Callout,
    StatBlock,
    ColumnBreak,
    Layout,
  ];
}
export function cleanHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["aside"],
    ADD_ATTR: [
      "colwidth",
      "data-callout",
      "data-kind",
      "data-statblock",
      "data-column-break",
      "data-flow",
      "data-width",
      "data-blend",
      "data-level",
      "data-wide",
      "data-keep",
      "data-template-field",
    ],
    FORBID_TAGS: [
      "style",
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
    ],
    FORBID_ATTR: ["srcset"],
  });
}
export function splitNode(n: JSONContent): [JSONContent, JSONContent] | null {
  if (n.type === "paragraph" || n.type === "heading") {
    const total = (n.content ?? []).reduce(
      (s, c) => s + (c.text?.length ?? 1),
      0,
    );
    if (total < 2) return null;
    const target = Math.ceil(total / 2);
    let used = 0;
    const a: JSONContent[] = [],
      b: JSONContent[] = [];
    for (const c of n.content ?? []) {
      const length = c.text?.length ?? 1;
      if (used >= target) b.push(c);
      else if (used + length <= target) a.push(c);
      else if (c.text) {
        let cut = target - used;
        const space = c.text.lastIndexOf(" ", cut);
        if (space > cut / 2) cut = space + 1;
        a.push({ ...c, text: c.text.slice(0, cut) });
        b.push({ ...c, text: c.text.slice(cut) });
      } else a.push(c);
      used += length;
    }
    return [
      { ...n, content: a },
      { ...n, type: n.type === "heading" ? "paragraph" : n.type, content: b },
    ];
  }
  // Preserve semantic blocks and floated media as a unit across pages.
  if (["statBlock", "callout", "image"].includes(n.type ?? "")) return null;
  const children = n.content ?? [];
  if (children.length < 2) return null;
  const cut = Math.ceil(children.length / 2);
  if (n.type === "table" && children.length <= 2) return null;
  return [
    { ...n, content: children.slice(0, cut) },
    {
      ...n,
      attrs:
        n.type === "orderedList"
          ? { ...n.attrs, start: Number(n.attrs?.start ?? 1) + cut }
          : n.attrs,
      content:
        n.type === "table" &&
        children[0].content?.some((c) => c.type === "tableHeader")
          ? [children[0], ...children.slice(cut)]
          : children.slice(cut),
    },
  ];
}
