import { openDB } from "idb";
import type { DesignLibrary, LibraryEntry } from "./authoring-types";
const database = () =>
  openDB("adventure-drafter-catalog", 1, {
    upgrade(db) {
      db.createObjectStore("catalog");
    },
  });
export async function loadLibrary(): Promise<LibraryEntry[]> {
  return (await (await database()).get("catalog", "content")) ?? [];
}
export async function saveLibraryEntry(entry: LibraryEntry) {
  const db = await database(),
    tx = db.transaction("catalog", "readwrite");
  const existing: LibraryEntry[] = (await tx.store.get("content")) ?? [];
  await tx.store.put(
    [...existing.filter((e) => e.id !== entry.id), entry],
    "content",
  );
  await tx.done;
}
export async function loadDesigns(): Promise<DesignLibrary> {
  return (
    (await (await database()).get("catalog", "designs")) ?? {
      styles: [],
      masters: [],
      themes: [],
    }
  );
}
export async function saveDesigns(designs: DesignLibrary) {
  await (await database()).put("catalog", designs, "designs");
}
