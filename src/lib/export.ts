import type { Adventure } from "./model";

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function filename(doc: Adventure) {
  return (
    doc.title
      .replace(/[^a-z0-9\s_-]/gi, "")
      .trim()
      .replace(/\s+/g, "-") || "adventure"
  );
}
export function exportProject(doc: Adventure) {
  download(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${filename(doc)}.adventure.json`,
  );
}
