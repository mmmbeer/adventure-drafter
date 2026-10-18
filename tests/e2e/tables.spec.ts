import { test, expect, type Page } from "@playwright/test";

async function importTable(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Import source").fill(
    "# Table layout\n\n| Encounter | Location | Reward |\n| --- | --- | --- |\n| Wolves | Forest | Silver |\n| Bandits | Bridge | Gold |\n\nAfter the table.",
  );
  await page.getByRole("button", { name: "Import pasted text" }).click();
  await page.getByRole("button", { name: "Review the pages" }).click();
  const table = page.locator(".page-writing table").first();
  await table.getByText("Wolves", { exact: true }).click();
  return table;
}

test("tables span the page from inspector and toolbar and retain layout after reload", async ({ page }) => {
  const table = await importTable(page);
  const wrapper = table.locator("..");
  const originalWidth = (await table.boundingBox())!.width;
  await page.getByLabel("Full page width", { exact: true }).check();
  await expect(wrapper).toHaveAttribute("data-wide", "true");
  await expect(wrapper).toHaveCSS("column-span", "all");
  await expect.poll(async () => (await table.boundingBox())!.width).toBeGreaterThan(originalWidth * 1.8);
  const writingWidth = await table.evaluate((el) => el.closest(".tiptap")!.getBoundingClientRect().width);
  expect((await table.boundingBox())!.width).toBeCloseTo(writingWidth, 0);
  await expect(page.getByRole("button", { name: "Span all columns", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(wrapper).toHaveAttribute("data-wide", "true");
  await table.getByText("Wolves", { exact: true }).click();
  await page.getByRole("button", { name: "Span all columns", exact: true }).click();
  await expect(wrapper).toHaveAttribute("data-wide", "false");
  await expect(page.getByLabel("Full page width", { exact: true })).not.toBeChecked();
  await expect.poll(async () => (await table.boundingBox())!.width).toBeCloseTo(originalWidth, 0);
});

test("column boundaries show resize cursor and dragging preserves column sizes", async ({ page }) => {
  const table = await importTable(page);
  const cell = table.locator("th").first();
  const box = (await cell.boundingBox())!;
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
  await expect(table.locator("xpath=ancestor::*[contains(@class,'tiptap')]")).toHaveClass(/resize-cursor/);
  await expect(cell).toHaveCSS("cursor", "col-resize");
  await expect(cell.locator("p")).toHaveCSS("cursor", "col-resize");
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 40, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await cell.boundingBox())!.width).toBeGreaterThan(box.width + 25);
  await page.mouse.move(box.x + 10, box.y + 10);
  await expect(cell).not.toHaveCSS("cursor", "col-resize");
  const resizedWidth = (await cell.boundingBox())!.width;
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect.poll(async () => (await cell.boundingBox())!.width).toBeCloseTo(resizedWidth, 0);
});
