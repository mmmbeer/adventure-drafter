import { openDB } from "idb";
import type { Adventure } from "./model";
const db = () =>
  openDB("adventure-drafter", 1, {
    upgrade(d) {
      d.createObjectStore("documents", { keyPath: "id" });
      d.createObjectStore("versions", { keyPath: "key" });
      d.createObjectStore("preferences");
    },
  });
export async function saveDocument(document: Adventure) {
  const d = await db();
  const tx = d.transaction(["documents", "preferences"], "readwrite");
  await tx.objectStore("documents").put(structuredClone(document));
  await tx.objectStore("preferences").put(document.id, "last");
  await tx.done;
}
export async function loadLast(): Promise<Adventure | undefined> {
  const d = await db();
  const id = await d.get("preferences", "last");
  return id ? d.get("documents", id) : undefined;
}
export async function listDocuments(): Promise<Adventure[]> {
  return (await (await db()).getAll("documents")).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
export async function saveVersion(document: Adventure, label: string) {
  const d = await db();
  await d.put("versions", {
    key: crypto.randomUUID(),
    document: structuredClone(document),
    label,
    date: new Date().toISOString(),
    documentId: document.id,
  });
}
export async function listVersions(id: string) {
  return (await (await db()).getAll("versions"))
    .filter((x) => x.documentId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export async function removeDocument(id: string) {
  const d = await db();
  const tx = d.transaction(["documents", "versions"], "readwrite");
  await tx.objectStore("documents").delete(id);
  for (const v of await tx.objectStore("versions").getAll())
    if (v.documentId === id) await tx.objectStore("versions").delete(v.key);
  await tx.done;
}
export async function requestPersistence() {
  return navigator.storage?.persist?.();
}
