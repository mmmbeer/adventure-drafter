import { test, expect } from "@playwright/test";

test("formatted Actions in a template modal persist through direct editing and reload", async ({ page }) => {
  await page.goto("/");
  const creature = page.locator(".tiptap section[data-statblock]").first();
  await creature.hover();
  await creature.getByRole("button", { name: "Edit template fields" }).click();
  const actions = page.getByRole("textbox", { name: "Actions" });
  await actions.click();
  await actions.press("Control+a");
  await page.getByRole("toolbar", { name: "Actions formatting" })
    .getByRole("button", { name: "Bold" }).click();
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(creature.locator("strong")).toContainText("Tolling grasp");
  await creature.hover();
  await creature.getByRole("button", { name: "Edit template fields" }).click();
  await expect(page.getByRole("textbox", { name: "Actions" }).locator("strong"))
    .toContainText("Tolling grasp");
  await page.getByLabel("Armor Class").fill("Armor Class 17");
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(creature.locator("strong")).toContainText("Tolling grasp");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(page.locator("section[data-statblock] strong")).toContainText("Tolling grasp");
});

test("shrinking document type pulls auto-continued paragraphs into earlier pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const paragraphs = Array.from({ length: 35 }, (_, i) =>
    `Passage ${i}: ${"The torchlight reveals another hidden passage. ".repeat(9)}`);
  await page.getByLabel("Import source").fill("# The Labyrinth\n\n" + paragraphs.join("\n\n"));
  await page.getByRole("button", { name: "Import pasted text" }).click();
  await page.getByRole("button", { name: "Review the pages" }).click();
  await expect.poll(() => page.locator(".paper").count(), { timeout: 60000 }).toBeGreaterThan(4);
  await expect(page.locator(".overflow-note")).toHaveCount(0, { timeout: 60000 });
  const before = await page.locator(".paper").count();
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await page.getByLabel("Body size").fill("10");
  await expect.poll(() => page.locator(".paper").count(), { timeout: 60000 }).toBeLessThan(before);
  await expect(page.locator(".overflow-note")).toHaveCount(0, { timeout: 60000 });
  const full = (await page.locator(".tiptap").allTextContents()).join(" ");
  for (let i = 0; i < paragraphs.length; i++) expect(full).toContain(`Passage ${i}:`);
  expect(full).toContain("The torchlight reveals another hidden passage.");
  // Compaction is deliberately incremental. Require repeated stable samples
  // rather than assuming all downstream continuation pages collapse at once.
  let last = await page.locator(".paper").count();
  let stableSamples = 0;
  for (let i = 0; i < 20 && stableSamples < 4; i++) {
    await page.waitForTimeout(1000);
    const count = await page.locator(".paper").count();
    stableSamples = count === last ? stableSamples + 1 : 0;
    last = count;
  }
  expect(stableSamples).toBe(4);
  expect(last).toBeLessThan(before);
});
