// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/core";
import {
  createAdventure, heading, page, paragraph, entries, keywordIndex,
  physicalPageCount, sheetCount,
} from "../src/lib/model";
import { extensions } from "../src/lib/editor";
import { mergeNode, mergeValue, interpolateMergeTags, resolveText } from "../src/lib/merge-tags";

describe("dynamic merge tags and automatic references", () => {
  it("keeps merge tags structured while resolving current document metadata", () => {
    const doc = createAdventure(true);
    doc.title = "A Changing Title";
    doc.author = "A Living Author";
    const content = { type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "By " }, mergeNode("author"), { type: "text", text: " — " },
      mergeNode("title"),
    ] }] };
    expect(resolveText(content, doc, 1)).toContain("By A Living Author — A Changing Title");
    const html = generateHTML(content, extensions());
    expect(html).toContain('data-merge-tag="author"');
    const restored = generateJSON(html, extensions());
    expect(restored.content?.[0].content?.[1].attrs?.name).toBe("author");
    doc.title = "Changed Again";
    expect(resolveText(restored, doc, 1)).toContain("Changed Again");
  });
  it("resolves correct page numbers and total physical sheets", () => {
    const doc = createAdventure(true);
    doc.pages = [page("toc"), page("body", [heading("A Quest")]), page("index")];
    doc.indexTerms = ["A Quest"];
    expect(mergeValue(doc, "page", 9)).toBe("9");
    expect(mergeValue(doc, "pages", 1)).toBe(String(physicalPageCount(doc)));
    expect(interpolateMergeTags("{title} · {page} of {pages}", doc, 7))
      .toBe(`${doc.title} · 7 of ${physicalPageCount(doc)}`);
  });
  it("regenerates index terms, matching pages and contents when headings change", () => {
    const doc = createAdventure(true);
    const body = page("body", [heading("Marsh Shrine", 2), paragraph("Explore the shrine.")]);
    doc.pages = [page("toc"), body, page("index")];
    doc.indexTerms = ["Shrine"];
    expect(keywordIndex(doc).map((entry) => entry.term)).toContain("Marsh Shrine");
    expect(keywordIndex(doc).find((entry) => entry.term === "Marsh Shrine")?.pages)
      .toEqual([2]);
    doc.settings.tocDepth = 1;
    expect(entries(doc).filter((entry) => entry.level <= doc.settings.tocDepth)).toHaveLength(0);
    doc.settings.tocDepth = 2;
    expect(entries(doc)).toHaveLength(1);
    expect(sheetCount(doc, doc.pages[2])).toBeGreaterThan(0);
    doc.settings.autoIndexHeadings = false;
    expect(keywordIndex(doc).map((entry) => entry.term)).toEqual(["Shrine"]);
  });
});
