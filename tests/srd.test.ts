// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Editor } from "@tiptap/core";
import {
  makeSrdBlock,
  insertSrdBlock,
  srdPreview,
} from "../src/lib/srd-content";
import {
  filterSrd,
  loadSrdCatalog,
  type SrdEntry,
} from "../src/lib/srd-catalog";
import { extensions, splitNode } from "../src/lib/editor";
import {
  templateFields,
  templateRichFields,
  patchTemplate,
} from "../src/lib/template-blocks";
import { plainText } from "../src/lib/anchors";
const catalog = (name: string): SrdEntry[] =>
  JSON.parse(readFileSync(`public/srd/${name}.json`, "utf8"));
const find = (group: string, name: string) =>
  catalog(group).find((e) => e.name === name)!;
afterEach(() => vi.unstubAllGlobals());
describe("edition-specific SRD catalogs", () => {
  it("has unique edition-qualified IDs and preserves materially different rules", () => {
    const all = [
      "2014-items",
      "2024-items",
      "2014-monsters",
      "2024-monsters",
    ].flatMap(catalog);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    for (const e of all) {
      expect(e.id).toMatch(new RegExp(`^${e.edition}-${e.kind}-`));
      expect(e.markdown.trim().split("\n\n").length).toBeGreaterThan(1);
      expect(e.markdown).not.toContain("[object Object]");
    }
    expect(find("2014-items", "Bag of Holding").markdown).toContain(
      "15 pounds",
    );
    expect(find("2024-items", "Bag of Holding").markdown).toContain("5 pounds");
    expect(find("2014-monsters", "Aboleth").markdown).toContain("135");
    expect(find("2014-monsters", "Aboleth").markdown).toContain(
      "3 legendary actions",
    );
    expect(find("2024-monsters", "Aboleth").markdown).toContain("150");
    expect(find("2024-monsters", "Aboleth").markdown).toContain(
      "Initiative** +7",
    );
    expect(find("2024-monsters", "Mage").markdown).toContain("Misty Step");
  });
  it("keeps nested artifact properties and item tables", () => {
    expect(find("2014-items", "Orb of Dragonkind").markdown).toContain(
      "Dragon",
    );
    expect(find("2014-items", "Apparatus of the Crab").markdown).toContain(
      "| Lever |",
    );
    const block = makeSrdBlock(find("2024-items", "Bag of Beans"));
    expect(block.content!.some((n) => n.type === "table")).toBe(true);
    expect(plainText(block)).toContain("SRD 5.2");
    expect(plainText(block)).not.toContain("SRD 5.2.1");
    const item = makeSrdBlock(find("2014-items", "Orb of Dragonkind"));
    const patched = patchTemplate(
      item,
      templateFields(item),
      templateRichFields(item),
    );
    expect(plainText(patched)).toBe(plainText(item));
    expect(patched.content!.map((n) => n.type)).toEqual(
      item.content!.map((n) => n.type),
    );
  });
  it("searches by multiple words and excludes unmatched editions", () => {
    const items = filterSrd(catalog("2024-items"), "bag holding");
    expect(items.map((e) => e.name)).toEqual(["Bag of Holding"]);
    expect(filterSrd(catalog("2014-monsters"), "goblin warrior")).toEqual([]);
    expect(
      filterSrd(catalog("2024-monsters"), "goblin warrior").map((e) => e.name),
    ).toContain("Goblin Warrior");
  });
  it("clears failed catalog requests so retry can succeed", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => catalog("2014-items"),
      });
    vi.stubGlobal("fetch", fetch);
    await expect(loadSrdCatalog("2014", "items")).rejects.toThrow(
      "could not be loaded",
    );
    expect((await loadSrdCatalog("2014", "items")).length).toBe(240);
    await loadSrdCatalog("2014", "items");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
describe("editable SRD blocks", () => {
  it("preserves 2024 stats, saves, actions and attribution through field editing", () => {
    const block = makeSrdBlock(find("2024-monsters", "Aboleth"));
    const fields = templateFields(block);
    expect(fields.str).toBe("21");
    expect(fields.dex).toBe("9");
    expect(fields.hitPoints).toContain("150");
    const patched = patchTemplate(
      block,
      { ...fields, name: "Ancient Aboleth" },
      templateRichFields(block),
    );
    const text = plainText(patched);
    expect(text).toContain("Ancient Aboleth");
    expect(text).toContain("Initiative +7");
    expect(text).toContain("DEX +3");
    expect(text).toContain("Legendary Action Uses: 3 (4 in Lair)");
    expect(text).toContain("Creative Commons Attribution 4.0");
    expect(srdPreview(block)).toContain("<table");
  });
  it("inserts at the saved cursor and outside an existing stat block", () => {
    const ed = new Editor({
      extensions: extensions(),
      content: "<p>Before</p><p>After</p>",
    });
    try {
      ed.commands.setTextSelection(9);
      const bookmark = ed.state.selection.getBookmark();
      const block = makeSrdBlock(find("2014-monsters", "Goblin"));
      insertSrdBlock(ed, block, bookmark);
      expect(ed.getJSON().content![0].content![0].text).toBe("Before");
      let inside = 0;
      ed.state.doc.descendants((n, pos) => {
        if (n.type.name === "statBlock" && !inside) inside = pos + 2;
      });
      ed.commands.setTextSelection(inside);
      insertSrdBlock(ed, block, ed.state.selection.getBookmark());
      const blocks = ed
        .getJSON()
        .content!.filter((n) => n.type === "statBlock");
      expect(blocks).toHaveLength(2);
      expect(
        blocks.every((n) => !n.content!.some((c) => c.type === "statBlock")),
      ).toBe(true);
    } finally {
      ed.destroy();
    }
  });
  it("splits oversized blocks without losing their rule text or metadata", () => {
    const block = makeSrdBlock(find("2024-monsters", "Aboleth"));
    const split = splitNode(block)!;
    expect(split).not.toBeNull();
    expect(split[1].attrs?.srdContinuation).toBe(true);
    expect(split[1].attrs?.srdId).toBe(block.attrs?.srdId);
    expect([...split[0].content!, ...split[1].content!.slice(1)]).toEqual(
      block.content,
    );
    const continuation = split[1];
    const patched = patchTemplate(
      continuation,
      templateFields(continuation),
      templateRichFields(continuation),
    );
    expect(plainText(patched)).toBe(plainText(continuation));
    expect(
      patched.content!.some((n) => n.attrs?.templateField === "abilities"),
    ).toBe(false);
  });
});
