// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { extensions } from "../src/lib/editor";
import { unlinkPlaceholder } from "../src/lib/placeholder-actions";
import { createAdventure, page, paragraph } from "../src/lib/documents";
import { titlePageContent } from "../src/lib/title-page";
import { validateAdventure } from "../src/lib/validation";
import { resolveText, MERGE_TAGS } from "../src/lib/merge-tags";
import { applyColorTheme, colorThemes } from "../src/lib/appearance";
import { pageDesign } from "../src/lib/designs";
import { dividerSource } from "../src/lib/dividers";

vi.stubGlobal("requestAnimationFrame", () => 0);

describe("placeholder conversion", () => {
  it.each(MERGE_TAGS)(
    "converts $name to its name, preserves formatting, and supports undo",
    ({ name }) => {
      const editor = new Editor({
        extensions: extensions(),
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Before " },
                {
                  type: "mergeTag",
                  attrs: { name },
                  marks: [{ type: "bold" }],
                },
                { type: "text", text: " after" },
              ],
            },
          ],
        },
      });
      expect(unlinkPlaceholder(editor, 8)).toBe(true);
      expect(editor.state.doc.textContent).toBe(`Before ${name} after`);
      expect(editor.getJSON().content![0].content![1]).toEqual({
        type: "text",
        text: name,
        marks: [{ type: "bold" }],
      });
      editor.commands.undo();
      expect(editor.state.doc.nodeAt(8)?.type.name).toBe("mergeTag");
      editor.commands.redo();
      expect(editor.state.doc.textContent).toBe(`Before ${name} after`);
      editor.destroy();
    },
  );
  it("ignores stale positions and read-only editors", () => {
    const editor = new Editor({
      extensions: extensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "mergeTag", attrs: { name: "title" } }],
          },
        ],
      },
    });
    expect(unlinkPlaceholder(editor, undefined)).toBe(false);
    expect(unlinkPlaceholder(editor, 0)).toBe(false);
    editor.setEditable(false);
    expect(unlinkPlaceholder(editor, 1)).toBe(false);
    expect(editor.state.doc.nodeAt(1)?.type.name).toBe("mergeTag");
    editor.destroy();
  });
});

describe("default title pages", () => {
  it("starts a blank adventure with live title, subtitle, author and a theme rule", () => {
    const doc = createAdventure(true);
    expect(doc.pages.map((p) => p.kind)).toEqual(["title", "body"]);
    expect(doc.pages[0].content.content).toEqual(titlePageContent());
    doc.title = "The Lantern";
    doc.author = "Mara";
    doc.subtitle = "A winter tale";
    const content = resolveText(doc.pages[0].content, doc, 1);
    for (const value of ["The Lantern", "Mara", "A winter tale"])
      expect(content).toContain(value);
    expect(page("title").content.content).toEqual(titlePageContent());
    for (const theme of colorThemes) {
      doc.settings.theme = applyColorTheme(doc.settings.theme, theme);
      expect(pageDesign(doc, doc.pages[0], 0).paper).toBe(theme.paper);
      expect(dividerSource("theme", doc.settings.theme)).toBe(
        `/dividers/${theme.id}.png`,
      );
    }
  });
  it("upgrades empty saved title pages without replacing authored content or empty fields", () => {
    const doc = createAdventure(true);
    doc.pages = [
      page("title", []),
      page("title", [paragraph(" ")]),
      page("title", [paragraph("My cover")]),
      page("title", [
        {
          type: "paragraph",
          content: [{ type: "mergeTag", attrs: { name: "subtitle" } }],
        },
      ]),
    ];
    const safe = validateAdventure(doc);
    expect(resolveText(safe.pages[0].content, safe, 1)).toContain(safe.title);
    expect(resolveText(safe.pages[1].content, safe, 2)).toContain(safe.author);
    expect(resolveText(safe.pages[2].content, safe, 3)).toBe("My cover");
    expect(safe.pages[3].content.content).toHaveLength(1);
    expect(validateAdventure(JSON.parse(JSON.stringify(safe)))).toEqual(safe);
  });
});
