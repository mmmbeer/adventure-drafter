import { test, expect } from "@playwright/test";

test("typing a merge tag consumes its braces and inserts one live value", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".paper.body .tiptap").first();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Written by {author}", { delay: 20 });
  const tag = editor.locator('[data-merge-tag="author"]');
  await expect(tag).toHaveCount(1);
  await expect(tag).toHaveText("Your name");
  await expect(tag.locator("xpath=../..")).toHaveText("Written by Your name");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  const saved = page.locator('.paper.body [data-merge-tag="author"]').first();
  await expect(saved).toHaveText("Your name");
  await expect(saved.locator("xpath=../..")).toHaveText("Written by Your name");
});

test("toolbar insertion keeps the editable line clean", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".paper.body .tiptap").first();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Written by ");
  await page.getByLabel("Insert merge tag").selectOption("author");
  const tag = editor.locator('[data-merge-tag="author"]');
  await expect(tag).toHaveCount(1);
  await expect(tag.locator("xpath=../..")).toHaveText("Written by Your name");
});

test("pasting tokens creates one field per occurrence without braces", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".paper.body .tiptap").first();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await editor.evaluate((el) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "Written by {author} in {title}.");
    el.dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true, cancelable: true, clipboardData,
    }));
  });
  await expect(editor.locator('[data-merge-tag="author"]')).toHaveCount(1);
  await expect(editor.locator('[data-merge-tag="title"]')).toHaveCount(1);
  await expect(editor.locator('[data-merge-tag="title"]').locator("xpath=../.."))
    .toHaveText("Written by Your name in The Bell Beneath Blackwater.");
});
