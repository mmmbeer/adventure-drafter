import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { NodeViewProps } from "@tiptap/react";

export function useNodeResize({ editor, node, updateAttributes }: Pick<NodeViewProps, "editor" | "node" | "updateAttributes">) {
  const cleanup = useRef<(() => void) | null>(null);
  const begin = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    cleanup.current?.();
    const surface = event.currentTarget.closest<HTMLElement>(".layout-node");
    const paper = surface?.closest<HTMLElement>(".paper");
    if (!surface || !paper) return;
    const style = getComputedStyle(paper);
    const count = Math.max(1, Number(style.getPropertyValue("--columns")) || 1);
    const gutter = parseFloat(style.getPropertyValue("--gutter")) || 0;
    const area = editor.view.dom.clientWidth;
    const columnWidth = (area - (count - 1) * gutter) / count;
    const wide = !!node.attrs.wide;
    const base = wide ? area : columnWidth;
    const start = event.clientX;
    const original = Number(node.attrs.width ?? 100);
    const nodeElement = surface;
    const pointerId = event.pointerId;
    let percentage = original;
    let newWide = wide;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const delta = e.clientX - start;
      if (!wide && count > 1 && original * columnWidth / 100 + delta > columnWidth + gutter / 2) {
        newWide = true;
        percentage = Math.min(100, Math.max(20, Math.round((original * columnWidth / 100 + delta) / area * 100)));
      } else {
        newWide = wide;
        percentage = Math.min(100, Math.max(20, Math.round(original + (delta / base) * 100)));
      }
      nodeElement.style.width = `${percentage}%`;
    };
    const done = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      release();
      nodeElement.style.removeProperty("width");
      if (e.type !== "pointercancel" && (percentage !== original || newWide !== wide))
        updateAttributes({ width: percentage, wide: newWide, flow: newWide ? "block" : node.attrs.flow });
    };
    const release = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
      cleanup.current = null;
    };
    cleanup.current = release;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
  }, [editor, node.attrs, updateAttributes]);
  return begin;
}
