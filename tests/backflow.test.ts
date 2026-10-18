import { describe, expect, it } from "vitest";
import { appendFlow, splitParagraph } from "../src/lib/backflow";

describe("backward page flow", () => {
  it("splits paragraphs without losing text or inline formatting", () => {
    const source = { type: "paragraph", content: [
      { type: "text", text: "A sudden ", marks: [{ type: "bold" }] },
      { type: "text", text: "storm strikes.", marks: [{ type: "italic" }] },
    ] };
    const parts = splitParagraph(source, 9)!;
    expect(parts[0].content?.map((n) => n.text).join("")).toBe("A sudden ");
    expect(parts[1].content?.map((n) => n.text).join("")).toBe("storm strikes.");
    expect(parts[0].content?.[0].marks?.[0].type).toBe("bold");
    expect(parts[1].content?.[0].marks?.[0].type).toBe("italic");
    expect(parts[0].attrs?.flowGroup).toBe(parts[1].attrs?.flowGroup);
    expect(appendFlow([parts[0]], [parts[1]])[0].content).toEqual(source.content);
  });
  it("does not join unrelated paragraphs or split non-paragraph boxes", () => {
    const first = { type: "paragraph", content: [{ type: "text", text: "One" }] };
    const next = { type: "paragraph", content: [{ type: "text", text: "Two" }] };
    expect(appendFlow([first], [next])).toHaveLength(2);
    expect(splitParagraph({ type: "statBlock", content: [first] }, 1)).toBeNull();
  });
});
