// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "@tiptap/core";
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import {
  createAdventure,
  heading,
  page,
  paragraph,
} from "../src/lib/documents";
import {
  applyColorTheme,
  applyFontPairing,
  applyStylePreset,
  colorThemes,
  fontPairings,
} from "../src/lib/appearance";
import { themes } from "../src/lib/templates";
import { pageDesign, newMaster } from "../src/lib/designs";
import { validateAdventure } from "../src/lib/validation";
import { extensions, cleanHtml } from "../src/lib/editor";
import { dividerSource, themeDivider } from "../src/lib/dividers";
import { mergeValue } from "../src/lib/merge-tags";
import { applyPageFlow, applyBackflow } from "../src/lib/page-flow";
import { wordRunningText } from "../src/lib/export-running-text";

function fixture() {
  const doc = createAdventure(true);
  doc.title = "The Moon Gate";
  doc.author = "Mara";
  doc.pages = [
    page("body", [heading("Chapter One"), paragraph("Opening")]),
    page("body", [paragraph("Afterward")]),
  ];
  return doc;
}

describe("page appearance inheritance", () => {
  it("applies each theme's paper, preserves it on font changes, and lets pages override it", () => {
    const doc = fixture();
    doc.pages[1].paper = "#ffffff";
    for (const palette of colorThemes) {
      doc.settings.theme = applyColorTheme(doc.settings.theme, palette);
      expect(pageDesign(doc, doc.pages[0], 0).paper).toBe(palette.paper);
      expect(pageDesign(doc, doc.pages[1], 1).paper).toBe("#ffffff");
      expect(applyFontPairing(doc.settings.theme, fontPairings[1]).paper).toBe(
        palette.paper,
      );
      expect(dividerSource("theme", doc.settings.theme)).toBe(
        `/dividers/${palette.id}.png`,
      );
    }
    expect(applyStylePreset(doc.settings.theme, themes[0]).paper).toBe(
      themes[0].paper,
    );
    doc.pageMasters = [{ ...newMaster(), id: "colored", paper: "#eeeeee" }];
    doc.settings.defaultMasterId = "colored";
    expect(pageDesign(doc, doc.pages[0], 0).paper).toBe("#eeeeee");
    expect(pageDesign(doc, doc.pages[1], 1).paper).toBe("#ffffff");
    delete doc.pages[1].paper;
    expect(pageDesign(doc, doc.pages[1], 1).paper).toBe("#eeeeee");
  });

  it("resolves all slots and placeholders, retaining explicit blanks and page overrides", () => {
    const doc = fixture();
    doc.settings.runningText = {
      headerLeft: "{title} / {chapter}",
      headerRight: "by {author}",
      footerLeft: "",
      footerCenter: "Page {page} of {pages}",
      footerRight: "{subtitle}",
    };
    doc.subtitle = "A winter tale";
    doc.pages[1].runningText = { headerRight: "Page-only note" };
    expect(pageDesign(doc, doc.pages[0], 0)).toMatchObject({
      header: "The Moon Gate / Chapter One",
      headerRight: "by Mara",
      footer: "",
      footerCenter: "Page 1 of 2",
      footerRight: "A winter tale",
    });
    doc.title = "New title";
    expect(pageDesign(doc, doc.pages[1], 1)).toMatchObject({
      header: "New title / Chapter One",
      headerRight: "Page-only note",
      footerCenter: "Page 2 of 2",
    });
    delete doc.pages[1].runningText;
    expect(pageDesign(doc, doc.pages[1], 1).headerRight).toBe("by Mara");
  });

  it("keeps legacy master text until a document or page override is supplied", () => {
    const doc = fixture();
    doc.pageMasters = [
      {
        ...newMaster(),
        id: "book",
        headerOdd: "Odd {title}",
        headerEven: "Even {author}",
        footer: "Master",
      },
    ];
    doc.settings.defaultMasterId = "book";
    expect(pageDesign(doc, doc.pages[1], 1)).toMatchObject({
      header: "Even Mara",
      footer: "Master",
    });
    doc.settings.runningText = { headerLeft: "Document" };
    doc.pages[1].runningText = { footerLeft: "Page" };
    expect(pageDesign(doc, doc.pages[1], 1)).toMatchObject({
      header: "Document",
      footer: "Page",
    });
    doc.settings.runningText.footerLeft = "{footer} · {page}";
    expect(mergeValue(doc, "footer", 2)).toBe("Mara · 2");
  });

  it("round trips overrides and rejects malformed imported values", () => {
    const doc = fixture();
    doc.settings.runningText = { headerLeft: "{title}", footerLeft: "" };
    doc.pages[1].runningText = { footerCenter: "{page}/{pages}" };
    doc.pages[1].paper = "#eeddcc";
    const saved = validateAdventure(JSON.parse(JSON.stringify(doc)));
    expect(saved.settings.runningText).toEqual(doc.settings.runningText);
    expect(saved.pages[1].runningText).toEqual(doc.pages[1].runningText);
    expect(saved.pages[1].paper).toBe("#eeddcc");
    const invalid = JSON.parse(JSON.stringify(doc));
    invalid.pages[1].paper = "red;display:none";
    invalid.pages[1].runningText = {
      headerLeft: 25,
      footerLeft: "",
      unknown: "x",
    };
    const cleaned = validateAdventure(invalid);
    expect(cleaned.pages[1].paper).toBeUndefined();
    expect(cleaned.pages[1].runningText).toEqual({ footerLeft: "" });
  });

  it.each([{ paper: "#eeddcc" }, { runningText: { footerLeft: "Special" } }])(
    "preserves explicit appearance during forward and backward pagination: %j",
    (override) => {
      const doc = fixture();
      const [source, target] = doc.pages;
      doc.pages[1] = {
        ...target,
        ...override,
        breakBefore: false,
        continuedFrom: source.id,
      };
      const before = source.content.content!;
      const flowed = applyPageFlow(
        doc,
        source.id,
        before,
        [before[0]],
        [before[1]],
      );
      expect(flowed.pages).toHaveLength(3);
      expect(flowed.pages[2]).toBe(doc.pages[1]);
      expect(
        applyBackflow(doc, source.id, {
          sourceId: target.id,
          before,
          source: target.content.content!,
          pulled: target.content.content!,
          consumed: 1,
        }),
      ).toBe(doc);
    },
  );
});

describe("decorative rules and export", () => {
  it("round trips safe divider selections and full-width layout in HTML", () => {
    const source = {
      type: "doc",
      content: [
        { type: "horizontalRule", attrs: { divider: "theme", wide: true } },
      ],
    };
    const html = generateHTML(source, extensions());
    const parsed = generateJSON(cleanHtml(html), extensions());
    expect(parsed.content![0].attrs).toMatchObject({
      divider: "theme",
      wide: true,
    });
    const unsafe = generateJSON('<hr data-divider="../../evil">', extensions());
    expect(unsafe.content![0].attrs?.divider).toBeNull();
    expect(dividerSource("../../evil", themes[0])).toBeUndefined();
    expect(themeDivider(themes[0])).toBe("parchment");
  });

  it("exports all running-text slots and suppresses hidden slots in editable Word", async () => {
    const doc = fixture();
    doc.settings.runningText = {
      headerLeft: "Header left",
      headerRight: "Header right",
      footerLeft: "Footer left",
      footerCenter: "{page}/{pages}",
      footerRight: "Footer right",
    };
    const design = pageDesign(doc, doc.pages[0], 0);
    const file = new Document({
      sections: [
        {
          ...wordRunningText(doc, design, false, 600),
          children: [new Paragraph("Body")],
        },
      ],
    });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(file));
    const header = await zip.file("word/header1.xml")!.async("string");
    const footer = await zip.file("word/footer1.xml")!.async("string");
    expect(header).toContain("Header left");
    expect(header).toContain("Header right");
    expect(footer).toContain("Footer left");
    expect(footer).toContain("Footer right");
    expect(footer).toContain("PAGE");
    expect(footer).toContain("NUMPAGES");
    const hiddenFile = new Document({
      sections: [
        {
          ...wordRunningText(
            doc,
            { ...design, hideHeader: true, hideNumber: true },
            false,
            600,
          ),
          children: [new Paragraph("Body")],
        },
      ],
    });
    const hidden = await JSZip.loadAsync(await Packer.toBuffer(hiddenFile));
    expect(
      await hidden.file("word/header1.xml")!.async("string"),
    ).not.toContain("Header left");
    expect(
      await hidden.file("word/footer1.xml")!.async("string"),
    ).not.toContain("NUMPAGES");
  });
});
