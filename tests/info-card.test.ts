// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { InfoCard } from "../src/components/InfoCard";

let root: Root;
let host: HTMLDivElement;
let outside: HTMLButtonElement;
const information = (label: string) =>
  createElement(InfoCard, {
    label,
    children: createElement("p", null, "Fonts must be installed."),
  });
function pointer(element: Element, type: string) {
  act(() => {
    element.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(HTMLElement.prototype, "showPopover", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "hidePopover", {
    configurable: true,
    value: vi.fn(),
  });
  host = document.createElement("div");
  outside = document.createElement("button");
  document.body.replaceChildren(host, outside);
  root = createRoot(host);
  act(() => {
    root.render(information("Word export information"));
  });
});
afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;
  delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;
});
describe("shared information cards", () => {
  it("opens on hover and allows the pointer to cross into the card before dismissing", () => {
    const trigger = host.querySelector("button")!;
    const card = host.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    pointer(trigger, "pointerover");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBe(card.id);
    expect(card.showPopover).toHaveBeenCalled();
    pointer(trigger, "pointerout");
    pointer(card, "pointerover");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    pointer(card, "pointerout");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
  it("keeps a clicked card open until toggled or clicked outside", () => {
    const trigger = host.querySelector("button")!;
    pointer(trigger, "pointerover");
    act(() => trigger.click());
    pointer(trigger, "pointerout");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    act(() => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    act(() => trigger.click());
    pointer(outside, "pointerdown");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
  it("supports keyboard focus and consumes Escape before the containing dialog", () => {
    const trigger = host.querySelector("button")!;
    act(() => trigger.focus());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    act(() => trigger.dispatchEvent(escape));
    expect(escape.defaultPrevented).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    act(() => {
      outside.focus();
      trigger.focus();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    act(() => outside.focus());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
  it("keeps only one information card open at a time", () => {
    act(() =>
      root.render(
        createElement(Fragment, null, information("Word"), information("PDF")),
      ),
    );
    const [word, pdf] = host.querySelectorAll("button");
    act(() => word.click());
    pointer(pdf, "pointerover");
    expect(word.getAttribute("aria-expanded")).toBe("false");
    expect(pdf.getAttribute("aria-expanded")).toBe("true");
  });
});
