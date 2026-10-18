import { test, expect } from "@playwright/test";

test("loaded fields stay live after reload and subsequent metadata changes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Adventure page · 2/ }).click();
  const editor = page.locator(".paper.body .tiptap").first();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("By {author} in {title} · {page} of {pages}", { delay: 6 });
  for (const name of ["author", "title", "page", "pages"]) {
    await expect(editor.locator(`[data-merge-tag="${name}"]`)).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByLabel("Document author").fill("First Author");
  await page.getByLabel("Document title").fill("First Title");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  const loaded = page.locator(".paper.body .tiptap").first();
  await expect(loaded.locator('[data-merge-tag="author"]')).toHaveText("First Author");
  await expect(loaded.locator('[data-merge-tag="title"]')).toHaveText("First Title");
  await expect(loaded.locator('[data-merge-tag="page"]')).toHaveText("2");
  await expect(loaded.locator('[data-merge-tag="pages"]')).toHaveText("3");
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByLabel("Document author").fill("Second Author");
  await page.getByLabel("Document title").fill("Second Title");
  await expect(loaded.locator('[data-merge-tag="author"]')).toHaveText("Second Author");
  await expect(loaded.locator('[data-merge-tag="title"]')).toHaveText("Second Title");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(page.locator('[data-merge-tag="author"]')).toHaveText("Second Author");
  await expect(page.locator('[data-merge-tag="title"]')).toHaveText("Second Title");
});

test("legacy saved literal fields become live on reload without affecting ordinary text", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".save-status")).toHaveText("Saved on this device");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("adventure-drafter", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const id = await new Promise<string>((resolve, reject) => {
      const request = db.transaction("preferences").objectStore("preferences").get("last");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const doc = await new Promise<any>((resolve, reject) => {
      const request = db.transaction("documents").objectStore("documents").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    doc.pages.find((p: any) => p.kind === "body").content.content.push({
      type: "paragraph",
      content: [{
        type: "text",
        text: "Author: {author}, title: {title}. Page {page} of {pages}. And {unknown} remains.",
      }],
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite");
      tx.objectStore("documents").put(doc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  const target = page.locator(".paper.body .tiptap").first();
  await expect(target.locator('[data-merge-tag="author"]')).toHaveCount(1);
  await expect(target.locator('[data-merge-tag="title"]')).toHaveCount(1);
  await expect(target.locator('[data-merge-tag="page"]')).toHaveCount(1);
  await expect(target.locator('[data-merge-tag="page"]')).toHaveText("2");
  await expect(target.locator('[data-merge-tag="pages"]')).toHaveText("3");
  await expect(target).toContainText("{unknown}");
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByLabel("Document title").fill("Live Title");
  await expect(target.locator('[data-merge-tag="title"]')).toHaveText("Live Title");
});
