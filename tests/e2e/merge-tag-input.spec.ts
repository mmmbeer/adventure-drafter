import { test, expect } from "@playwright/test";

test("typed merge tags replace their complete source token without stray braces", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".paper.body .tiptap").first();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Written by {author}", { delay: 20 });
  const tag = editor.locator('[data-merge-tag="author"]');
  const info = await editor.evaluate((el) => ({
    html: el.innerHTML.slice(-1200),
    text: el.textContent?.slice(-250),
    spans: [...el.querySelectorAll("[data-merge-tag]")].map((n) => ({
      text: n.textContent, html: n.outerHTML.slice(0, 500),
      before: n.previousSibling?.textContent,
      after: n.nextSibling?.textContent,
    })),
  }));
  console.log("MERGE DIAGNOSTIC TYPED", JSON.stringify(info));
  await expect(tag).toHaveCount(1);
  const line = tag.locator("xpath=..");
  await expect(line).toHaveText("Written by Your name");
});

test("toolbar merge insertion adds only one resolved field", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".paper.body .tiptap").first();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Written by ");
  await page.getByLabel("Insert merge tag").selectOption("author");
  const tag = editor.locator('[data-merge-tag="author"]');
  const info = await editor.evaluate((el) => ({
    html: el.innerHTML.slice(-1200),
    text: el.textContent?.slice(-250),
  }));
  console.log("MERGE DIAGNOSTIC TOOLBAR", JSON.stringify(info));
  await expect(tag).toHaveCount(1);
  await expect(tag.locator("xpath=..")).toHaveText("Written by Your name");
});
