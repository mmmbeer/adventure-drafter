import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const documentSelectionKey = new PluginKey<boolean>("documentSelection");

export const DocumentSelectionDecoration = Extension.create({
  name: "documentSelection",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: documentSelectionKey,
        state: {
          init: () => false,
          apply: (tr, selected) => tr.getMeta(documentSelectionKey) ?? selected,
        },
        props: {
          decorations(state) {
            if (!documentSelectionKey.getState(state)) return null;
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.isInline) {
                decorations.push(
                  Decoration.inline(pos, pos + node.nodeSize, {
                    class: "document-selection-text",
                  }),
                );
              } else if (
                node.isAtom ||
                (node.isTextblock && !node.content.size)
              ) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "document-selection-node",
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
          attributes(state): Record<string, string> {
            return documentSelectionKey.getState(state)
              ? { "data-document-selected": "true" }
              : {};
          },
        },
      }),
    ];
  },
});
