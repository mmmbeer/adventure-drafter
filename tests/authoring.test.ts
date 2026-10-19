// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  createAdventure,
  heading,
  paragraph,
  page,
} from "../src/lib/documents";
import { identifyDocument, cloneBlocks, plainText } from "../src/lib/anchors";
import {
  outlineEntries,
  moveSection,
  rearrangeSection,
} from "../src/lib/outline";
import { referenceValue, missingReferences } from "../src/lib/cross-references";
import {
  linkedBlock,
  linkedInstances,
  publishLibraryEntry,
} from "../src/lib/content-library";
import { newMaster, newStyle, pageDesign } from "../src/lib/designs";
import { validateAdventure } from "../src/lib/validation";
import { importFile } from "../src/lib/import";
import type { LibraryEntry } from "../src/lib/authoring-types";
function fixture() {
  const d = createAdventure(true);
  d.pages = [
    page("body", [
      heading("Chapter A"),
      paragraph("Opening A"),
      heading("Room A", 2),
    ]),
    page("body", [
      paragraph("Room A continued"),
      heading("Chapter B"),
      paragraph("Opening B"),
    ]),
    page("body", [heading("Chapter C"), paragraph("Opening C")]),
  ];
  return identifyDocument(d);
}
function text(d: ReturnType<typeof fixture>) {
  return d.pages.map((p) => plainText(p.content)).join(" ");
}
describe("outline operations and stable references", () => {
  it("moves a section spanning pages with its subheadings and no text loss", () => {
    const doc = fixture(),
      before = outlineEntries(doc),
      a = before[0].id;
    const moved = moveSection(doc, a, 1);
    expect(outlineEntries(moved).map((e) => e.title)).toEqual([
      "Chapter B",
      "Chapter A",
      "Room A",
      "Chapter C",
    ]);
    for (const term of [
      "Opening A",
      "Room A continued",
      "Opening B",
      "Opening C",
    ])
      expect(text(moved).split(term)).toHaveLength(2);
    expect(outlineEntries(moved).find((e) => e.title === "Chapter A")!.id).toBe(
      a,
    );
    expect(referenceValue(moved, { targetId: a })).toContain("Chapter A, page");
  });
  it("clones sections with new target IDs and retargets references inside the copy", () => {
    const doc = fixture(),
      a = outlineEntries(doc)[0].id;
    doc.pages[0].content.content!.push({
      type: "paragraph",
      content: [
        { type: "crossReference", attrs: { targetId: a, format: "title" } },
      ],
    });
    const next = rearrangeSection(doc, a, undefined, true);
    const headings = outlineEntries(next).filter(
      (e) => e.title === "Chapter A",
    );
    expect(headings).toHaveLength(2);
    expect(headings[0].id).not.toBe(headings[1].id);
    expect(JSON.stringify(next)).toContain(`"targetId":"${headings[1].id}"`);
    expect(missingReferences(next)).toHaveLength(0);
  });
  it("updates names and page references and reports deleted targets", () => {
    const d = fixture(),
      targetId = outlineEntries(d)[0].id;
    d.pages[0].content.content![0].content = [
      { type: "text", text: "Renamed chapter" },
    ];
    expect(referenceValue(d, { targetId, format: "title" })).toBe(
      "Renamed chapter",
    );
    d.pages.unshift(page("toc"));
    expect(referenceValue(d, { targetId, format: "page" })).toBe("2");
    d.pages[1].content.content!.shift();
    d.pages[1].content.content!.push({
      type: "paragraph",
      content: [
        { type: "crossReference", attrs: { targetId, fallback: "Chapter A" } },
      ],
    });
    expect(missingReferences(d)).toHaveLength(1);
    expect(referenceValue(d, { targetId, fallback: "Chapter A" })).toContain(
      "Missing reference",
    );
  });
  it("does not move a chapter into its own child", () => {
    const d = fixture(),
      [parent, child] = outlineEntries(d);
    expect(rearrangeSection(d, parent.id, child.id)).toBe(d);
  });
});
describe("reusable content and portable designs", () => {
  it("updates linked instances, preserves reference targets, and leaves copies alone", () => {
    const doc = fixture();
    const entry: LibraryEntry = {
      id: "npc-mara",
      name: "Mara",
      category: "NPC",
      tags: [],
      revision: 1,
      content: [heading("Mara"), paragraph("Old description")],
      updatedAt: new Date().toISOString(),
    };
    entry.content = identifyDocument({
      ...doc,
      pages: [page("body", entry.content)],
    }).pages[0].content.content!;
    doc.pages = [
      page("body", [
        linkedBlock(entry),
        linkedBlock(entry),
        ...cloneBlocks(entry.content),
      ]),
    ];
    const targetId = doc.pages[0].content.content![0].content![0].attrs!.refId;
    const next = publishLibraryEntry(doc, {
      ...entry,
      revision: 2,
      content: [entry.content[0], paragraph("New description")],
    });
    expect(linkedInstances(next, entry.id)).toHaveLength(2);
    expect(text(next).split("New description")).toHaveLength(3);
    expect(text(next).split("Old description")).toHaveLength(2);
    expect(next.pages[0].content.content![0].content![0].attrs!.refId).toBe(
      targetId,
    );
  });
  it("applies odd/even mirrored margins and document/page master precedence", () => {
    const doc = fixture(),
      master = {
        ...newMaster(),
        id: "bound",
        mirror: true,
        margin: 50,
        innerMargin: 85,
        headerOdd: "{title}",
        headerEven: "{chapter}",
      };
    doc.pageMasters = [master];
    doc.settings.defaultMasterId = master.id;
    expect(pageDesign(doc, doc.pages[0], 0)).toMatchObject({
      left: 85,
      right: 50,
      columns: 2,
      header: doc.title,
    });
    expect(pageDesign(doc, doc.pages[1], 1)).toMatchObject({
      left: 50,
      right: 85,
      header: "Chapter B",
    });
    doc.pages[1].masterId = "chapter-opener";
    expect(pageDesign(doc, doc.pages[1], 1)).toMatchObject({
      columns: 1,
      hideHeader: true,
    });
  });
  it("round trips anchors, references, reusable content and design definitions in JSON imports", async () => {
    const doc = fixture(),
      target = outlineEntries(doc)[0];
    doc.pages[0].content.content!.push({
      type: "paragraph",
      content: [
        {
          type: "crossReference",
          attrs: {
            targetId: target.id,
            format: "title-page",
            fallback: target.title,
          },
        },
      ],
    });
    doc.namedStyles = [{ ...newStyle(), id: "boxed" }];
    doc.pageMasters = [{ ...newMaster(), id: "custom" }];
    doc.pages[0].masterId = "custom";
    doc.contentLibrary = [
      {
        id: "entry",
        name: "Test",
        category: "Other",
        tags: [],
        revision: 1,
        content: [paragraph("Reusable text")],
        updatedAt: new Date().toISOString(),
      },
    ];
    doc.pages[1].content.content!.push(linkedBlock(doc.contentLibrary[0]));
    const file = {
      name: "book.adventure.json",
      size: 100,
      text: async () => JSON.stringify(doc),
    } as File;
    const result = (await importFile(file)).document;
    expect(result.id).not.toBe(doc.id);
    expect(result.namedStyles![0].id).toBe("boxed");
    expect(result.pages[0].masterId).toBe("custom");
    expect(missingReferences(result)).toHaveLength(0);
    expect(linkedInstances(result, "entry")).toHaveLength(1);
    expect(referenceValue(result, { targetId: target.id })).toContain(
      "Chapter A",
    );
  });
  it("rejects unsafe design values and accepts older projects", () => {
    const doc = fixture();
    doc.namedStyles = [
      { ...newStyle(), color: "red;display:none", fontSize: 999 },
    ];
    doc.pageMasters = [{ ...newMaster(), background: "javascript:alert(1)" }];
    const safe = validateAdventure(doc);
    expect(safe.namedStyles![0].color).toBe("#302b24");
    expect(safe.namedStyles![0].fontSize).toBe(72);
    expect(safe.pageMasters![0].background).toBeUndefined();
    expect(validateAdventure(createAdventure(true)).contentLibrary).toEqual([]);
  });
});
