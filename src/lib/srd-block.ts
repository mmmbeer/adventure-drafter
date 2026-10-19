import { Extension, type JSONContent } from "@tiptap/core";
import { heading } from "./documents";
export const SrdBlockMetadata = Extension.create({
  name: "srdBlockMetadata",
  addGlobalAttributes() {
    return [
      {
        types: ["statBlock"],
        attributes: {
          srdId: {
            default: null,
            parseHTML: (e) => e.dataset.srdId || null,
            renderHTML: (a) => (a.srdId ? { "data-srd-id": a.srdId } : {}),
          },
          srdName: {
            default: null,
            parseHTML: (e) => e.dataset.srdName || null,
            renderHTML: (a) =>
              a.srdName ? { "data-srd-name": a.srdName } : {},
          },
          srdContinuation: {
            default: false,
            parseHTML: (e) => e.dataset.srdContinuation === "true",
            renderHTML: (a) =>
              a.srdContinuation ? { "data-srd-continuation": "true" } : {},
          },
        },
      },
    ];
  },
});
/** Long reference blocks remain editable and keep all text when paginated. */
export function splitSrdBlock(
  node: JSONContent,
  splitChild: (node: JSONContent) => [JSONContent, JSONContent] | null,
): [JSONContent, JSONContent] | null {
  if (node.type !== "statBlock" || !node.attrs?.srdId) return null;
  const content = node.content ?? [];
  const header = node.attrs.srdContinuation ? content.slice(0, 1) : [];
  const body = content.slice(header.length);
  let left: JSONContent[], right: JSONContent[];
  if (body.length > 1) {
    let cut = Math.ceil(body.length / 2);
    // Keep section headings with their first content block.
    if (body[cut - 1]?.type === "heading" && cut > 1) cut--;
    left = [...header, ...body.slice(0, cut)];
    right = body.slice(cut);
  } else {
    const split = body[0] && splitChild(body[0]);
    if (!split) return null;
    left = [...header, split[0]];
    right = [split[1]];
  }
  const continued = heading(
    `${node.attrs.srdName || "SRD reference"} (continued)`,
    2,
  );
  continued.attrs = { ...continued.attrs, templateField: "name" };
  return [
    { ...node, content: left },
    {
      ...node,
      attrs: { ...node.attrs, refId: null, srdContinuation: true },
      content: [continued, ...right],
    },
  ];
}
