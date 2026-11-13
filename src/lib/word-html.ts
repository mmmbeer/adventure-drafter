/** Convert Word's clipboard markup to semantic HTML before sanitization. */
export function isWordHtml(html: string) {
  return /\bMso\w+|\bmso-[\w-]+\s*:|xmlns:w\s*=|Microsoft Word/i.test(html);
}

function replaceTag(element: Element, tag: string, level?: number) {
  const next = element.ownerDocument.createElement(tag);
  if (level && level > 6) next.setAttribute("data-level", String(level));
  next.append(...element.childNodes);
  element.replaceWith(next);
  return next;
}

function officeProperty(element: Element, name: string) {
  return (
    new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]*)`, "i")
      .exec(element.getAttribute("style") ?? "")?.[1]
      .trim() ?? ""
  );
}

function headingLevel(element: HTMLElement) {
  const name =
    `${element.className} ${officeProperty(element, "mso-style-name")}`.replace(
      /["']/g,
      "",
    );
  const heading = /(?:Mso)?Heading\s*([1-9])\b/i.exec(name);
  if (heading) return Number(heading[1]);
  const outline = Number.parseInt(officeProperty(element, "mso-outline-level"));
  return outline >= 1 && outline <= 9 ? outline : undefined;
}

interface ListRun {
  id: string;
  depth: number;
  list: HTMLOListElement | HTMLUListElement;
}

function convertLists(root: HTMLElement) {
  let stack: ListRun[] = [];
  let previous: Element | null = null;
  for (const paragraph of root.querySelectorAll<HTMLElement>("p")) {
    const descriptor = /\b(l\d+)\s+level(\d+)\s+(lfo\d+)/i.exec(
      officeProperty(paragraph, "mso-list"),
    );
    if (!descriptor || paragraph.closest("li")) {
      stack = [];
      previous = null;
      continue;
    }
    const marker = [...paragraph.querySelectorAll<HTMLElement>("span")].find(
      (span) => /\bIgnore\b/i.test(officeProperty(span, "mso-list")),
    );
    const markerText = marker?.textContent?.trim() ?? "";
    // Word normally puts the marker in an mso-list:Ignore span. A pasted
    // fragment without that span still retains the item's complete text.
    const ordered = /^\(?[\dA-Za-z]+[.)]/.test(markerText);
    marker?.remove();
    const depth = Number(descriptor[2]);
    const id = `${descriptor[1]}-${descriptor[3]}`;
    if (previous?.nextElementSibling !== paragraph) stack = [];
    while (stack.length && stack.at(-1)!.depth > depth) stack.pop();
    let current = stack.at(-1);
    const tag = ordered ? "OL" : "UL";
    if (
      current?.id !== id ||
      (current.depth === depth && current.list.tagName !== tag)
    ) {
      stack = [];
      current = undefined;
    }
    if (!current || current.depth < depth) {
      const list = paragraph.ownerDocument.createElement(ordered ? "ol" : "ul");
      const start = Number.parseInt(markerText);
      if (ordered && start > 1) list.setAttribute("start", String(start));
      const parentItem = current?.list.lastElementChild;
      if (parentItem) parentItem.append(list);
      else paragraph.before(list);
      current = { id, depth, list };
      stack.push(current);
    }
    const item = paragraph.ownerDocument.createElement("li");
    // Keep the paragraph inside the list item for the editor's block schema.
    paragraph.before(item);
    item.append(paragraph);
    current.list.append(item);
    previous = stack[0].list;
  }
}

export function normalizeWordHtml(html: string) {
  // DOMParser produces an inert document. Never attach unsanitized Word nodes
  // to the live page. The caller sanitizes the returned semantic markup.
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const root = parsed.body;
  parsed
    .querySelectorAll("script,style,link,meta,iframe,object,embed")
    .forEach((el) => el.remove());
  convertLists(root);
  for (const element of root.querySelectorAll<HTMLElement>("p,div")) {
    const role = /\b(?:Mso|word-)?(Title|Subtitle|Caption)\b/i.exec(
      `${element.className} ${officeProperty(element, "mso-style-name")}`,
    );
    const level = headingLevel(element);
    if (role) {
      const paragraph =
        element.tagName === "P" ? element : replaceTag(element, "p");
      paragraph.setAttribute("data-text-role", role[1].toLowerCase());
    } else if (level)
      replaceTag(element, level <= 6 ? `h${level}` : "div", level);
    else if (/\bMso(?:Intense)?Quote\b/i.test(element.className)) {
      const quote = element.ownerDocument.createElement("blockquote");
      element.before(quote);
      quote.append(element);
    }
  }
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    // Keep inline emphasis while letting the adventure supply fonts, colors,
    // spacing, and heading sizes rather than Word's copied page appearance.
    const marks: string[] = [];
    const weight = element.style.fontWeight;
    if (weight === "bold" || Number(weight) >= 600) marks.push("strong");
    if (element.style.fontStyle === "italic") marks.push("em");
    if (/underline/.test(element.style.textDecoration)) marks.push("u");
    if (/line-through/.test(element.style.textDecoration)) marks.push("s");
    for (const tag of marks) {
      const mark = element.ownerDocument.createElement(tag);
      mark.append(...element.childNodes);
      element.append(mark);
    }
    element.removeAttribute("style");
    element.removeAttribute("class");
    element.removeAttribute("face");
    element.removeAttribute("size");
    element.removeAttribute("color");
    element.removeAttribute("width");
    element.removeAttribute("height");
    if (
      element.tagName === "IMG" &&
      /^(?:file|cid):/i.test(element.getAttribute("src") ?? "")
    ) {
      element.replaceWith(
        parsed.createTextNode(element.getAttribute("alt") || ""),
      );
    }
  }
  // Office's namespaced inline text wrappers otherwise hide their contents
  // from some HTML-to-editor parsers.
  for (const element of root.querySelectorAll("*")) {
    if (element.tagName.includes(":"))
      element.replaceWith(...element.childNodes);
  }
  return root.innerHTML;
}
