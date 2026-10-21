// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { extensions, splitNode } from "../src/lib/editor";
import {
  joinTables,
  splitTable,
  tableCuts,
  tableHeaderCount,
} from "../src/lib/table-flow";
import { appendFlow } from "../src/lib/backflow";
import { createAdventure, page, paragraph } from "../src/lib/model";
import { applyPageFlow, applyBackflow } from "../src/lib/page-flow";
import { tableCursor } from "../src/lib/table-cursor";
import { tableElement } from "../src/lib/table-pagination";
import { AdventureTableView } from "../src/components/AdventureTableView";

const row = (label: string, header = false): JSONContent => ({
  type: "tableRow",
  content: [
    {
      type: header ? "tableHeader" : "tableCell",
      attrs: { colwidth: [180] },
      content: [paragraph(label)],
    },
    {
      type: header ? "tableHeader" : "tableCell",
      content: [paragraph(`Description ${label}`)],
    },
  ],
});
const table = (count = 12): JSONContent => ({
  type: "table",
  attrs: { wide: true, refId: "original" },
  content: [
    row("Header", true),
    ...Array.from({ length: count }, (_, i) => row(`Row ${i + 1}`)),
  ],
});
const schema = getSchema(extensions());

describe("row-safe table flow", () => {
  it("retains every row and column width through repeated splits and joins", () => {
    const original = table(40);
    const parts: JSONContent[] = [];
    let tail = original;
    while (tail.content!.length > 6) {
      const split = splitTable(tail, 6)!;
      parts.push(split[0]);
      tail = split[1];
    }
    parts.push(tail);
    expect(parts.every((part) => tableHeaderCount(part) === 1)).toBe(true);
    const joined = appendFlow([], parts);
    expect(joined).toHaveLength(1);
    expect(joined[0].content).toEqual(original.content);
    expect(joined[0].attrs?.wide).toBe(true);
    expect(splitNode(original)).toBeNull();
  });

  it("repeats multiple header rows without treating row labels as headers", () => {
    const source = table(8);
    source.content!.unshift(row("Category", true));
    source.content![2].content![0].type = "tableHeader";
    expect(tableHeaderCount(source)).toBe(2);
    const parts = splitTable(source, 5)!;
    expect(parts[1].content!.slice(0, 2)).toEqual(source.content!.slice(0, 2));
    expect(joinTables(...parts)?.content).toEqual(source.content);
  });

  it("never cuts through merged rows or leaves a header by itself", () => {
    const source = table(8);
    source.content![2].content![0].attrs = { rowspan: 3, colspan: 1 };
    expect(tableCuts(source)).not.toContain(1);
    expect(tableCuts(source)).not.toContain(3);
    expect(tableCuts(source)).not.toContain(4);
    expect(tableCuts(source)).toContain(5);
    expect(splitTable(source, 3)).toBeNull();
    source.content![0].content![0].attrs = { rowspan: 2 };
    expect(tableCuts(source)).toEqual([]);
  });

  it("does not silently discard edited continuation headers or join unrelated tables", () => {
    const [a, b] = splitTable(table(), 6)!;
    expect(
      joinTables(a, { ...b, attrs: { ...b.attrs, refId: "continuation" } })
        ?.content,
    ).toHaveLength(13);
    const changed = structuredClone(b);
    changed.content![0] = row("Edited header", true);
    expect(joinTables(a, changed)).toBeNull();
    expect(joinTables(a, table())).toBeNull();
  });

  it("keeps a body-cell caret on its row after repeated headers are inserted", () => {
    const source = table();
    const [a, b] = splitTable(source, 6)!;
    const position =
      1 +
      source
        .content!.slice(0, 8)
        .reduce((n, r) => n + schema.nodeFromJSON(r).nodeSize, 0) +
      3;
    const mapped = tableCursor(
      [source],
      { content: [a], overflow: [b] },
      position,
      schema,
    )!;
    const oldText = schema
      .nodeFromJSON({ type: "doc", content: [source] })
      .textBetween(position, position + 5);
    const newText = schema
      .nodeFromJSON({ type: "doc", content: [b] })
      .textBetween(mapped.position, mapped.position + 5);
    expect(mapped.page).toBe(1);
    expect(newText).toBe(oldText);
  });

  it("measures the same wrapper and table styles as the live resizable table", () => {
    const model = schema.nodeFromJSON({
      ...table(),
      attrs: {
        wide: true,
        keep: true,
        styleId: "custom",
        boxFormat: { padding: 12, width: 3, edges: "all" },
      },
    });
    const actual = new AdventureTableView(model, 25);
    const measured = tableElement(model.toJSON(), schema);
    expect(measured.dataset).toEqual(actual.dom.dataset);
    expect(measured.querySelector("table")?.getAttribute("style")).toBe(
      actual.table.getAttribute("style"),
    );
    expect(measured.querySelector("colgroup")?.outerHTML).toBe(
      actual.colgroup.outerHTML,
    );
  });
});

describe("atomic pagination", () => {
  it("rejects repeated forward plans without creating pages or duplicating rows", () => {
    const source = table();
    const doc = createAdventure(true);
    doc.pages = [page("body", [source])];
    const [a, b] = splitTable(source, 7)!;
    const moved = applyPageFlow(doc, doc.pages[0].id, [source], [a], [b]);
    expect(moved.pages).toHaveLength(2);
    const replay = applyPageFlow(moved, doc.pages[0].id, [source], [a], [b]);
    expect(replay).toBe(moved);
    expect(
      appendFlow(
        [],
        replay.pages.flatMap((p) => p.content.content!),
      )[0].content,
    ).toEqual(source.content);
  });

  it("rejects a stale pull after its destination changed", () => {
    const source = table();
    const [a, b] = splitTable(source, 7)!;
    const doc = createAdventure(true);
    doc.pages = [
      page("body", [a]),
      { ...page("body", [b]), breakBefore: false },
    ];
    doc.pages[1].continuedFrom = doc.pages[0].id;
    const plan = {
      sourceId: doc.pages[1].id,
      before: [a],
      source: [b],
      pulled: [b],
      consumed: 1,
    };
    const changed = {
      ...doc,
      pages: [
        {
          ...doc.pages[0],
          content: { type: "doc", content: [a, paragraph("New edit")] },
        },
        doc.pages[1],
      ],
    };
    expect(applyBackflow(changed, doc.pages[0].id, plan)).toBe(changed);
    const compact = applyBackflow(doc, doc.pages[0].id, plan);
    expect(compact.pages).toHaveLength(1);
    expect(compact.pages[0].content.content![0].content).toEqual(
      source.content,
    );
    expect(applyBackflow(compact, doc.pages[0].id, plan)).toBe(compact);
  });

  it("preserves intentional page breaks and different column layouts", () => {
    const source = table();
    const [a, b] = splitTable(source, 7)!;
    const doc = createAdventure(true);
    doc.pages = [
      page("body", [source]),
      page("body", [paragraph("Manual page")]),
    ];
    const changed = applyPageFlow(doc, doc.pages[0].id, [source], [a], [b]);
    expect(changed.pages).toHaveLength(3);
    expect(changed.pages[2]).toBe(doc.pages[1]);
    doc.pages[1].breakBefore = false;
    doc.pages[1].columns = 1;
    expect(
      applyPageFlow(doc, doc.pages[0].id, [source], [a], [b]).pages,
    ).toHaveLength(3);
  });
});
