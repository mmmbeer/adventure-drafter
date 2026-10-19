export type SrdEdition = "2014" | "2024";
export type SrdKind = "monsters" | "items";
export interface SrdEntry {
  id: string;
  edition: SrdEdition;
  kind: SrdKind;
  name: string;
  summary: string;
  markdown: string;
}
export const srdVersion = (edition: SrdEdition, kind: SrdKind = "monsters") =>
  edition === "2014" ? "5.1" : kind === "items" ? "5.2" : "5.2.1";
const cache = new Map<string, Promise<SrdEntry[]>>();
export function loadSrdCatalog(edition: SrdEdition, kind: SrdKind) {
  const key = `${edition}-${kind}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const request = fetch(`/srd/${key}.json`)
    .then(async (response) => {
      if (!response.ok)
        throw new Error("The SRD catalog could not be loaded. Please retry.");
      const entries: SrdEntry[] = await response.json();
      if (
        !Array.isArray(entries) ||
        !entries.length ||
        entries.some(
          (e) =>
            e.edition !== edition ||
            e.kind !== kind ||
            typeof e.id !== "string" ||
            typeof e.name !== "string" ||
            typeof e.summary !== "string" ||
            typeof e.markdown !== "string",
        )
      )
        throw new Error("The SRD catalog is invalid. Please reload and retry.");
      return entries;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, request);
  return request;
}
export function filterSrd(entries: SrdEntry[], query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) =>
    words.every((w) =>
      `${e.name} ${e.summary}`.toLocaleLowerCase().includes(w),
    ),
  );
}
