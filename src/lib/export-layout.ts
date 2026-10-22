import type { Adventure } from "./types";
import { layoutFits } from "./layout-measurement";

export function renderedPapers() {
  return [...document.querySelectorAll<HTMLElement>(".desk .canvas .paper")];
}

/** Pagination runs after a debounce. Wait for its final result, not a fixed delay. */
export async function settledExportDocument(read: () => Adventure) {
  await document.fonts.ready;
  await Promise.all(
    renderedPapers().flatMap((p) =>
      [...p.querySelectorAll("img")].map((image) =>
        image.decode().catch(() => {}),
      ),
    ),
  );
  let previous = "";
  let stableSince = performance.now();
  const deadline = performance.now() + 30000;
  while (performance.now() < deadline) {
    const doc = read();
    const papers = renderedPapers();
    const fingerprint =
      JSON.stringify(doc) + papers.map((p) => p.innerHTML).join("");
    const fits =
      papers.length > 0 &&
      papers.every((paper) => {
        const editor = paper.querySelector<HTMLElement>(
          ".page-writing .tiptap",
        );
        if (editor && !layoutFits(editor)) return false;
        const generated = paper.querySelector<HTMLElement>(".generated");
        const footer = paper.querySelector<HTMLElement>(".page-footer");
        return (
          !generated ||
          !footer ||
          generated.getBoundingClientRect().bottom <=
            footer.getBoundingClientRect().top - 10
        );
      });
    if (fingerprint !== previous || !fits) {
      previous = fingerprint;
      stableSince = performance.now();
    } else if (performance.now() - stableSince >= 1100) {
      return structuredClone(doc);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    "Page flow has not finished or a block exceeds the paper. Reduce oversized content and try exporting again.",
  );
}

/** Remove editing chrome without changing the content's geometry. */
export function cleanExportPage(source: HTMLElement) {
  const page = source.cloneNode(true) as HTMLElement;
  page.classList.remove("active");
  page
    .querySelectorAll(
      ".no-print,.node-tools,.node-resize,.column-resize-handle,.ProseMirror-separator,.reusable-label",
    )
    .forEach((element) => element.remove());
  for (const element of [page, ...page.querySelectorAll<HTMLElement>("*")]) {
    element.classList.remove(
      "document-selection-text",
      "document-selection-node",
      "resize-cursor",
      "ProseMirror-selectednode",
      "selectedCell",
      "is-selected",
    );
    element.removeAttribute("data-document-selected");
    if (element.hasAttribute("contenteditable"))
      element.setAttribute("contenteditable", "false");
  }
  // Dynamic values are buttons in editing mode, but must remain searchable text.
  page.querySelectorAll(".merge-tag-value").forEach((button) => {
    const value = document.createElement("span");
    value.className = "merge-tag-value";
    value.style.cssText = (button as HTMLElement).style.cssText;
    value.append(...button.childNodes);
    button.replaceWith(value);
  });
  return page;
}
