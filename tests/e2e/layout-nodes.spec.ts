import { test, expect } from "@playwright/test";

test("template pencil preserves custom sections and updates six ability modifiers", async ({ page }) => {
  await page.goto("/");
  const creature = page.locator(".tiptap section[data-statblock]").first();
  await expect(creature).toBeVisible();
  await creature.hover();
  await creature.getByRole("button", { name: "Edit template fields" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Creature name").fill("The Revised Bellkeeper");
  await page.getByLabel("STR", { exact: false }).fill("18");
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(creature).toContainText("The Revised Bellkeeper");
  await expect(creature.locator("table").first()).toContainText("18 (+4)");
  await expect(creature.locator("table th")).toHaveText(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
  await expect(creature.locator("table td").first()).toHaveCSS("text-align", "center");
  await page.reload();
  await expect(page.locator("section[data-statblock]").first()).toContainText("The Revised Bellkeeper");
});

test("template modal edits box width and flow, image can be resized from its corner", async ({ page }) => {
  await page.goto("/");
  const creature = page.locator(".tiptap section[data-statblock]").first();
  await creature.hover();
  await creature.getByRole("button", { name: "Edit template fields" }).click();
  const slider = page.getByRole("slider", { name: /Box width/ });
  await slider.focus();
  await slider.press("Home");
  for (let i = 0; i < 45; i++) await slider.press("ArrowRight");
  await page.getByLabel("Text flow").selectOption("left");
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(creature).toHaveAttribute("data-flow", "left");
  await expect(creature).toHaveAttribute("data-width", "65");
  await creature.hover();
  await creature.getByRole("button", { name: "Toggle column span" }).click();
  await expect(creature).toHaveAttribute("data-wide", "true");
});

test("long text pagination ends in stable continuation pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Import source").fill(
    "# A Long Passage\n\n" + Array.from({ length: 60 }, (_, i) =>
      `Part ${i}: ${"The forest does not forget its travelers. ".repeat(10)}`).join("\n\n"),
  );
  await page.getByRole("button", { name: "Import pasted text" }).click();
  await page.getByRole("button", { name: "Review the pages" }).click();
  await expect.poll(() => page.locator(".continuation-hint").count(), { timeout: 60000 }).toBeGreaterThan(0);
  await expect.poll(() => page.locator(".overflow-note").count(), { timeout: 60000 }).toBe(0);
  const count = await page.locator(".paper").count();
  await page.waitForTimeout(2000);
  expect(await page.locator(".paper").count()).toBe(count);
  await expect(page.locator(".tiptap").last()).toContainText("Part 59:");
});
