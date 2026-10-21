// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { extensions } from "../src/lib/editor";
import { paragraph } from "../src/lib/model";
import { planTableLayout, tableElement } from "../src/lib/table-pagination";
import { planBackflow, appendFlow } from "../src/lib/backflow";

// A deterministic column geometry fixture exercises pagination decisions.
// Browser layout and font metrics are intentionally not claimed by these tests.
function placements(page: HTMLElement) {
  let column = 0,
    used = 0;
  const height = Number(page.dataset.capacity || 100);
  return [...page.children].map((el) => {
    const rows = el.querySelectorAll("tr");
    const size = rows.length
      ? [...rows].reduce(
          (sum, r) => sum + (r.textContent?.includes("Tall") ? 30 : 10),
          0,
        )
      : 20;
    if (used && used + size > height) {
      column++;
      used = 0;
    }
    const rect = {
      left: column * 200,
      right: column * 200 + 180,
      top: used,
      bottom: used + size,
    };
    used += size;
    return { el, rect };
  });
}
vi.mock("../src/lib/layout-measurement", () => ({
  layoutProbe: (page: HTMLElement) => {
    const probe = page.cloneNode(true) as HTMLElement;
    page.parentElement!.append(probe);
    return probe;
  },
  layoutFits: (page: HTMLElement) =>
    placements(page).every(
      ({ rect }) =>
        rect.left < Number(page.dataset.columns || 1) * 200 &&
        rect.bottom <= Number(page.dataset.capacity || 100),
    ),
}));
const schema = getSchema(extensions());
const row = (text: string, header = false): JSONContent => ({
  type: "tableRow",
  content: [
    { type: header ? "tableHeader" : "tableCell", content: [paragraph(text)] },
  ],
});
const table = (count: number): JSONContent => ({
  type: "table",
  content: [
    row("Header", true),
    ...Array.from({ length: count }, (_, i) => row(`Row ${i}`)),
  ],
});
function dom(nodes: JSONContent[], columns = 1, capacity = 100) {
  const host = document.createElement("div");
  const editor = document.createElement("div");
  editor.dataset.columns = String(columns);
  editor.dataset.capacity = String(capacity);
  host.append(editor);
  document.body.append(host);
  for (const node of nodes)
    editor.append(
      node.type === "table"
        ? tableElement(node, schema)
        : document.createElement("p"),
    );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return placements(this.parentElement!).find(({ el }) => el === this)
        ?.rect as DOMRect;
    },
  );
  return editor;
}
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("measured column and page table layout", () => {
  it("fills columns and then stops changing once the row groups fit", () => {
    const source = table(24);
    const first = planTableLayout(dom([source], 2), [source], schema)!;
    expect(first.content.map((t) => t.content?.length)).toEqual([10, 10]);
    expect(first.overflow[0].content).toHaveLength(7);
    expect(
      planTableLayout(dom(first.content, 2), first.content, schema),
    ).toBeNull();
    expect(
      planTableLayout(dom(first.overflow, 2), first.overflow, schema),
    ).toBeNull();
    expect(
      appendFlow([], [...first.content, ...first.overflow])[0].content,
    ).toEqual(source.content);
  });

  it("uses actual row heights and available space after preceding text", () => {
    const source = table(10);
    source.content![2] = row("Tall row");
    const nodes = [paragraph("Introduction"), source];
    const result = planTableLayout(dom(nodes), nodes, schema)!;
    expect(result.content[1].content).toHaveLength(6);
    expect(
      appendFlow([], [...result.content.slice(1), ...result.overflow])[0]
        .content,
    ).toEqual(source.content);
  });

  it("does not lose a completed table plan when following text overflows", () => {
    const source = table(17);
    const nodes = [source, paragraph("After")];
    const result = planTableLayout(dom(nodes, 2), nodes, schema)!;
    expect(result.content).toHaveLength(2);
    expect(result.overflow).toEqual([nodes[1]]);
  });

  it("pulls fitting rows back into a table without adding another header", () => {
    const source = table(15);
    const result = planTableLayout(dom([source]), [source], schema)!;
    const before = result.content;
    // Increasing capacity simulates reducing the type size or page margins.
    const previousDom = dom(before, 1, 130);
    const nextDom = dom(result.overflow);
    const plan = planBackflow(
      previousDom,
      nextDom,
      before,
      result.overflow,
      "next",
      schema,
    )!;
    const compact = appendFlow(before, plan.pulled);
    expect(compact[0].content).toHaveLength(13);
    expect(plan.remainder?.content).toHaveLength(4);
    expect(planTableLayout(dom(compact, 1, 130), compact, schema)).toBeNull();
    expect(
      planBackflow(
        dom(compact, 1, 130),
        dom([plan.remainder!]),
        compact,
        [plan.remainder!],
        "next",
        schema,
      ),
    ).toBeNull();
    expect(appendFlow(compact, [plan.remainder!])[0].content).toEqual(
      source.content,
    );
  });

  it("leaves an indivisible oversized row for a warning instead of adding pages", () => {
    const source = table(1);
    source.content![1] = row("Tall row");
    expect(planTableLayout(dom([source], 1, 25), [source], schema)).toBeNull();
  });
});
