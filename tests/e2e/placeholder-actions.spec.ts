import { test, expect } from "@playwright/test";
import { createAdventure } from "../../src/lib/documents";
import { MERGE_TAGS } from "../../src/lib/merge-tags";

async function openFixture(page: import("@playwright/test").Page) {
  const doc = createAdventure(true);
  doc.title = "The Lantern";
  doc.pages[1].content.content = [
    {
      type: "paragraph",
      content: MERGE_TAGS.flatMap(({ name }) => [
        { type: "mergeTag", attrs: { name } },
        { type: "text", text: " " },
      ]),
    },
  ];
  await page.goto("/");
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({
    name: "placeholders.adventure.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
}

test("every placeholder opens and focuses its source in the inspector", async ({
  page,
}) => {
  await openFixture(page);
  for (const { name } of MERGE_TAGS) {
    if (
      await page
        .getByRole("button", { name: "Hide inspector", exact: true })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "Hide inspector", exact: true })
        .click();
    await page
      .locator(".paper.body")
      .getByRole("button", { name: `Edit source for {${name}}`, exact: true })
      .click();
    const input = page.locator(
      `.inspector [data-placeholder-source="${name}"]`,
    );
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    if (name === "pages") await expect(input).toHaveAttribute("readonly", "");
  }
});

test("unlink removes one field and leaves its literal name after save and reload", async ({
  page,
}) => {
  await openFixture(page);
  const title = page.locator('.paper.title [data-merge-tag="title"]');
  await title.hover();
  await title
    .getByRole("button", { name: "Convert {title} to plain text", exact: true })
    .click();
  await expect(title).toHaveCount(0);
  await expect(page.locator(".paper.title h1")).toHaveText("title");
  await page.keyboard.press("Control+z");
  await expect(title).toHaveCount(1);
  await title.hover();
  await title
    .getByRole("button", { name: "Convert {title} to plain text", exact: true })
    .click();
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(page.locator(".paper.title h1")).toHaveText("title");
  await expect(title).toHaveCount(0);
});

test("new title-page placeholders update from their inspector sources", async ({
  page,
}) => {
  await openFixture(page);
  await page
    .locator(".paper.title")
    .getByRole("button", { name: "Edit source for {title}", exact: true })
    .click();
  await page
    .getByLabel("Document title", { exact: true })
    .fill("The Winter Gate");
  await expect(page.locator(".paper.title h1")).toHaveText("The Winter Gate");
  await expect(
    page.locator('.paper.title hr[data-divider="theme"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.paper.title [data-merge-tag="author"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.paper.title [data-merge-tag="subtitle"]'),
  ).toHaveCount(1);
});
