import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { anchorTypes, validId, cloneBlocks } from "./anchors";
import { ReferenceNode, ReusableNode } from "../components/AuthoringNodes";
const attribute = (key: string, data: string) => ({
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute(data),
  renderHTML: (attrs: Record<string, string>) =>
    attrs[key] ? { [data]: attrs[key] } : {},
});
export const AuthoringAttributes = Extension.create({
  name: "authoringAttributes",
  addGlobalAttributes() {
    return [
      {
        types: anchorTypes,
        attributes: {
          refId: {
            ...attribute("refId", "data-ref-id"),
            renderHTML: (attrs) =>
              validId(attrs.refId)
                ? { "data-ref-id": attrs.refId, id: `ref-${attrs.refId}` }
                : {},
          },
          referenceLabel: attribute("referenceLabel", "data-reference-label"),
          sourceRefId: attribute("sourceRefId", "data-source-ref-id"),
        },
      },
      {
        types: [
          ...anchorTypes,
          "paragraph",
          "blockquote",
          "bulletList",
          "orderedList",
        ],
        attributes: { styleId: attribute("styleId", "data-style-id") },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPasted(slice, view) {
            const nodes = cloneBlocks(slice.content.toJSON());
            return new Slice(
              Fragment.fromJSON(view.state.schema, nodes),
              slice.openStart,
              slice.openEnd,
            );
          },
        },
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const seen = new Set<string>(),
            tr = state.tr;
          state.doc.descendants((node, pos) => {
            if (!anchorTypes.includes(node.type.name)) return;
            let id = node.attrs.refId;
            if (!validId(id) || seen.has(id)) {
              id = crypto.randomUUID();
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, refId: id });
            }
            seen.add(id);
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
export const CrossReference = Node.create({
  name: "crossReference",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      targetId: attribute("targetId", "data-target-id"),
      format: {
        ...attribute("format", "data-reference-format"),
        default: "title-page",
      },
      fallback: attribute("fallback", "data-reference-fallback"),
    };
  },
  parseHTML() {
    return [{ tag: "span[data-cross-reference]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-cross-reference": "",
        class: "cross-reference",
      }),
      node.attrs.fallback || "Reference",
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ReferenceNode);
  },
});
export const ReusableBlock = Node.create({
  name: "reusableBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      libraryId: attribute("libraryId", "data-library-id"),
      revision: {
        ...attribute("revision", "data-library-revision"),
        default: 1,
      },
      name: attribute("name", "data-library-name"),
    };
  },
  parseHTML() {
    return [{ tag: "section[data-reusable]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-reusable": "" }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ReusableNode);
  },
});
