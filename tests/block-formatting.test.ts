// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { extensions, cleanHtml } from "../src/lib/editor";
import {
  applyBlockStyle,
  currentBlockStyle,
} from "../src/lib/block-formatting";
import {
  updateBoxFormat,
  boxCss,
  cleanBoxFormat,
} from "../src/lib/box-formatting";
const editors: Editor[] = [];
function editor(content = "<p>Opening words</p><p>Second paragraph</p>") {
  const ed = new Editor({ extensions: extensions(), content });
  editors.push(ed);
  return ed;
}
afterEach(() => editors.splice(0).forEach((ed) => ed.destroy()));
describe("block styles", () => {
  it("converts titles, headings, lists, quotes and code without losing content", () => {
    const ed = editor();
    ed.commands.setTextSelection(2);
    for (const style of [
      "title",
      "subtitle",
      "caption",
      "3",
      "bulletList",
      "orderedList",
      "p",
      "blockquote",
      "p",
      "codeBlock",
      "p",
    ]) {
      expect(applyBlockStyle(ed, style), style).toBe(true);
      expect(currentBlockStyle(ed), style).toBe(style);
      expect(ed.getText()).toContain("Opening words");
      expect(ed.getText()).toContain("Second paragraph");
    }
    expect(ed.getJSON().content![0].type).toBe("paragraph");
  });
  it("switches between quotes and lists without leaving a hidden wrapper", () => {
    const ed = editor();
    for (const style of ["orderedList", "blockquote", "bulletList", "p"]) {
      applyBlockStyle(ed, style);
      expect(currentBlockStyle(ed)).toBe(style);
    }
    expect(ed.getJSON().content![0].type).toBe("paragraph");
  });
  it("retains direct borders when changing text roles and starts a normal paragraph after a title", () => {
    const ed = editor();
    updateBoxFormat(ed, "text", { edges: "bottom", width: 2 });
    applyBlockStyle(ed, "title");
    expect(ed.getJSON().content![0].attrs?.boxFormat).toMatchObject({
      edges: "bottom",
      width: 2,
    });
    applyBlockStyle(ed, "2");
    expect(ed.getJSON().content![0].attrs?.boxFormat).toMatchObject({
      edges: "bottom",
      width: 2,
    });
    applyBlockStyle(ed, "title");
    ed.commands.setTextSelection(14);
    ed.commands.splitBlock();
    expect(ed.getJSON().content![1].attrs?.textRole).toBeNull();
  });
  it("preserves text roles and list markers in HTML and removes lists on paragraph conversion", () => {
    const ed = editor(
      '<p data-text-role="title">Title</p><ol start="4" style="list-style-type:lower-roman"><li><p>First</p></li><li><p>Next</p></li></ol>',
    );
    const restored = editor(cleanHtml(ed.getHTML()));
    expect(restored.getJSON().content![0].attrs?.textRole).toBe("title");
    expect(restored.getJSON().content![1].attrs).toMatchObject({
      start: 4,
      listStyleType: "lower-roman",
    });
    restored.commands.selectAll();
    expect(applyBlockStyle(restored, "p")).toBe(true);
    expect(
      restored
        .getJSON()
        .content!.filter((n) => n.content?.length)
        .map((n) => n.type),
    ).toEqual(["paragraph", "paragraph", "paragraph"]);
  });
});
describe("borders and shading", () => {
  it("applies to mixed selected text blocks, round trips and undoes", () => {
    const ed = editor('<h2 data-ref-id="heading-test">Heading</h2><p>Body</p>');
    const before = ed.getJSON();
    ed.commands.selectAll();
    updateBoxFormat(ed, "text", {
      edges: "bottom",
      width: 3,
      style: "dashed",
      color: "#123456",
      background: "#eeeeee",
      padding: 8,
    });
    for (const node of ed.getJSON().content!)
      expect(node.attrs?.boxFormat).toMatchObject({
        edges: "bottom",
        width: 3,
      });
    const restored = editor(cleanHtml(ed.getHTML()));
    expect(restored.getJSON().content![0].attrs?.boxFormat).toEqual(
      ed.getJSON().content![0].attrs?.boxFormat,
    );
    expect(
      (restored.view.dom.querySelector("h2") as HTMLElement).style
        .borderBottomWidth,
    ).toBe("3px");
    ed.commands.undo();
    expect(ed.getJSON()).toEqual(before);
  });
  it("keeps non-selected table cells unchanged for a rectangular column selection", () => {
    const ed = editor(
      "<table><tr><th>A</th><th>B</th></tr><tr><td>C</td><td>D</td></tr></table>",
    );
    const cells: number[] = [];
    ed.state.doc.descendants((n, pos) => {
      if (["tableCell", "tableHeader"].includes(n.type.name)) cells.push(pos);
    });
    ed.view.dispatch(
      ed.state.tr.setSelection(
        CellSelection.create(ed.state.doc, cells[0], cells[2]),
      ),
    );
    updateBoxFormat(ed, "cells", { edges: "all", color: "#112233" });
    const formats = cells.map(
      (pos) => ed.state.doc.nodeAt(pos)!.attrs.boxFormat,
    );
    expect(formats[0]).toMatchObject({ edges: "all" });
    expect(formats[2]).toMatchObject({ edges: "all" });
    expect(formats[1]).toBeNull();
    expect(formats[3]).toBeNull();
  });
  it("distinguishes no borders from style defaults and rejects unsafe CSS", () => {
    const ed = editor("<h1>Chapter</h1>");
    updateBoxFormat(ed, "text", { edges: "none" });
    expect(
      (ed.view.dom.querySelector("h1") as HTMLElement).style.borderBottomWidth,
    ).toBe("0px");
    updateBoxFormat(ed, "text", null);
    expect(ed.getJSON().content![0].attrs?.boxFormat).toBeNull();
    expect(
      cleanBoxFormat({
        color: "red;display:none",
        padding: 900,
        style: "url(x)",
      }),
    ).toEqual({ padding: 60 });
    expect(boxCss({ background: "transparent" })).toEqual({
      backgroundColor: "transparent",
    });
  });
});
