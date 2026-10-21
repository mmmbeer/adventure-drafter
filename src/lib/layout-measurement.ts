/** The same conservative tolerance is used for forward and backward flow. */
export function layoutFits(page: HTMLElement) {
  if (
    page.scrollWidth > page.clientWidth + 2 ||
    page.scrollHeight > page.clientHeight + 2
  )
    return false;
  const bounds = page.getBoundingClientRect();
  return [...page.children].every((child) =>
    [...child.getClientRects()].every(
      (rect) =>
        rect.right <= bounds.right + 2 &&
        rect.left >= bounds.left - 2 &&
        rect.bottom <= bounds.bottom + 2,
    ),
  );
}

/** Measure against the live page's exact layout without changing its editor. */
export function layoutProbe(page: HTMLElement) {
  if (!page.parentElement) return null;
  const probe = page.cloneNode(true) as HTMLElement;
  probe.setAttribute("aria-hidden", "true");
  probe.removeAttribute("contenteditable");
  probe.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none";
  page.parentElement.append(probe);
  return probe;
}
