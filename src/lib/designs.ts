import type { Adventure, Page } from "./types";
import type { NamedStyle, PageMaster } from "./authoring-types";
import { plainText } from "./anchors";
import { pageNumber } from "./references";
import { interpolateMergeTags } from "./merge-tags";
export const newStyle = (): NamedStyle => ({
  id: crypto.randomUUID(),
  name: "New style",
  fontFamily: "Alegreya",
  fontSize: 15,
  color: "#302b24",
  background: "#ffffff",
  lineHeight: 1.4,
  spaceBefore: 0,
  spaceAfter: 10,
  bold: false,
  italic: false,
  border: false,
});
export const newMaster = (): PageMaster => ({
  id: crypto.randomUUID(),
  name: "New page master",
  columns: 2,
  margin: 58,
  innerMargin: 72,
  mirror: false,
  headerOdd: "{title}",
  headerEven: "{chapter}",
  footer: "{author}",
  hideHeader: false,
  hideNumber: false,
  backgroundOpacity: 0.22,
});
export const builtInMasters: PageMaster[] = [
  {
    ...newMaster(),
    id: "book-body",
    name: "Book body · mirrored",
    mirror: true,
  },
  {
    ...newMaster(),
    id: "chapter-opener",
    name: "Chapter opener",
    columns: 1,
    margin: 76,
    hideHeader: true,
  },
  {
    ...newMaster(),
    id: "cover",
    name: "Cover",
    columns: 1,
    margin: 80,
    hideHeader: true,
    hideNumber: true,
    footer: "",
  },
];
export function allMasters(doc: Adventure) {
  return [
    ...builtInMasters.filter(
      (m) => !doc.pageMasters?.some((p) => p.id === m.id),
    ),
    ...(doc.pageMasters ?? []),
  ];
}
export function pageDesign(
  doc: Adventure,
  page: Page,
  index: number,
  part = 0,
) {
  const master = allMasters(doc).find(
    (m) =>
      m.id ===
      (page.masterId ||
        (page.kind === "body" ? doc.settings.defaultMasterId : undefined)),
  );
  const number = pageNumber(doc, index) + part,
    odd = number % 2 === 1;
  const margin = master?.margin ?? doc.settings.margin;
  const left = master?.mirror && odd ? master.innerMargin : margin;
  const right = master?.mirror && !odd ? master.innerMargin : margin;
  let chapter = "";
  for (const p of doc.pages.slice(0, index + 1))
    if (p.kind === "body") {
      const headings =
        p.content.content?.filter(
          (n) => n.type === "heading" && Number(n.attrs?.level) === 1,
        ) ?? [];
      if (headings.length)
        chapter = plainText(
          headings[p.id === page.id ? 0 : headings.length - 1],
        );
    }
  const resolve = (value: string) =>
    interpolateMergeTags(value.replaceAll("{chapter}", chapter), doc, number);
  return {
    master,
    number,
    margin,
    left,
    right,
    columns:
      page.kind === "title"
        ? 1
        : (page.columns ?? master?.columns ?? doc.settings.columns),
    background: page.background || master?.background,
    backgroundOpacity: page.background
      ? (page.backgroundOpacity ?? 0.22)
      : (master?.backgroundOpacity ?? 0.22),
    paper: master?.paper || doc.settings.theme.paper,
    header: resolve(
      master ? (odd ? master.headerOdd : master.headerEven) : doc.title,
    ),
    footer: resolve(master ? master.footer : doc.settings.footer || doc.author),
    hideHeader: page.kind === "title" || !!master?.hideHeader,
    hideNumber: page.hideNumber ?? master?.hideNumber ?? false,
  };
}
export function styleCss(styles: NamedStyle[]) {
  return styles
    .map(
      (s) =>
        `.paper [data-style-id="${s.id}"] {font-family:${JSON.stringify(s.fontFamily)},serif!important;font-size:${s.fontSize}px!important;color:${s.color}!important;line-height:${s.lineHeight}!important;margin-top:${s.spaceBefore}px!important;margin-bottom:${s.spaceAfter}px!important;font-weight:${s.bold ? 700 : 400}!important;font-style:${s.italic ? "italic" : "normal"}!important;${s.border ? `border:1px solid ${s.color}!important;padding:10px;background:${s.background}!important;` : ""}}`,
    )
    .join("\n");
}
