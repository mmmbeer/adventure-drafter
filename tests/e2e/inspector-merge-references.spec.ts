import { test, expect } from "@playwright/test";

test("right rail follows the caret and separates page, style and document settings", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator(".inspector-tabs button:not(.inspector-close)");
  await expect(tabs).toHaveText(["Inspect", "Page", "Style", "Document"]);
  await page.locator(".paper.body .tiptap h1").first().click();
  await expect(page.locator(".inspector")).toContainText("Heading");
  await expect(page.getByLabel("Selected heading level")).toBeVisible();
  await page.getByRole("button", { name: "Page", exact: true }).click();
  await expect(page.getByText("Page columns")).toBeVisible();
  await expect(page.getByLabel("Selected heading level")).toHaveCount(0);
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await expect(page.getByRole("button", { name: /Field notes/ })).toBeVisible();
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await expect(page.getByLabel("Contents heading depth")).toBeVisible();
  await expect(page.getByLabel("Index heading depth")).toBeVisible();
});

test("merge tags stay live after metadata changes and survive reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Adventure page · 2/ }).click();
  await page.locator(".paper.body .tiptap").first().click();
  await page.keyboard.press("Control+End");
  await page.getByLabel("Insert merge tag").selectOption("author");
  await expect(page.locator('.paper.body [data-merge-tag="author"]').first())
    .toHaveText("Your name");
  await page.getByLabel("Insert merge tag").selectOption("page");
  await expect(page.locator('.paper.body [data-merge-tag="page"]').first())
    .toHaveText("2");
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByLabel("Document author").fill("New Author");
  await expect(page.locator('.paper.body [data-merge-tag="author"]').first())
    .toHaveText("New Author");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(page.locator('.paper.body [data-merge-tag="author"]').first())
    .toHaveText("New Author");
});

test("contents and index regenerate with configurable depth and live headings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByRole("button", { name: "Add automatic contents page" }).click();
  await page.getByRole("button", { name: "Add automatic index page" }).click();
  await expect(page.locator(".paper.toc")).toContainText("Adventure overview");
  await expect(page.locator(".paper.index")).toContainText("Into the drowned chapel");
  await page.getByLabel("Contents heading depth").selectOption("1");
  await expect(page.locator(".paper.toc")).not.toContainText("Adventure overview");
  await page.getByLabel("Contents heading depth").selectOption("2");
  await expect(page.locator(".paper.toc")).toContainText("Adventure overview");
  await page.getByLabel("Index heading depth").selectOption("1");
  await expect(page.locator(".paper.index")).not.toContainText("Adventure overview");
  await page.getByLabel("Index heading depth").selectOption("2");
  await expect(page.locator(".paper.index")).toContainText("Adventure overview");
});
