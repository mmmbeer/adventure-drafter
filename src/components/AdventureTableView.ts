import { TableView } from "@tiptap/extension-table";
import type { Node } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

// The resizable table's wrapper participates in the page's column layout.
// Mirror the saved span attribute onto it as well as the table itself.
export class AdventureTableView extends TableView {
  constructor(
    node: Node,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes: Record<string, unknown> = {},
  ) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.syncLayout(node);
  }

  update(node: Node) {
    if (!super.update(node)) return false;
    this.syncLayout(node);
    return true;
  }

  private syncLayout(node: Node) {
    const wide = String(!!node.attrs.wide);
    this.dom.dataset.wide = wide;
    this.dom.dataset.styleId = node.attrs.styleId || "";
    this.dom.dataset.refId = node.attrs.refId || "";
    this.table.removeAttribute("id");
    this.table.removeAttribute("data-ref-id");
    if (node.attrs.refId) this.dom.id = `ref-${node.attrs.refId}`;
    this.table.dataset.wide = wide;
  }
}
