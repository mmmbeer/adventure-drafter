import { test, expect, type Page } from "@playwright/test";
import {
  createAdventure,
  page as makePage,
  paragraph,
} from "../../src/lib/documents";
async function start(page: Page, fontSize?: number) {
  const doc = createAdventure(true);
  if (fontSize) doc.settings.fontSize = fontSize;
  doc.pages = [
    makePage("body", [
      paragraph("Before reference."),
      paragraph("After reference."),
    ]),
  ];
  await page.goto("/");
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({
    name: "srd.adventure.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.locator(".canvas")).toContainText("Before reference.");
  await page.locator(".canvas .tiptap p").first().click();
  await page.keyboard.press("End");
}
async function choose(page: Page, edition: string, kind: string, name: string) {
  await page
    .getByRole("button", { name: "SRD references", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("SRD edition").selectOption(edition);
  await page.getByLabel("SRD reference type").selectOption(kind);
  await page.getByLabel("Search SRD references").fill(name);
  await page
    .locator(".srd-results button")
    .filter({ has: page.locator("b", { hasText: new RegExp(`^${name}$`) }) })
    .click();
  await expect(page.locator(".srd-preview h2")).toHaveText(name);
}
test("both editions insert editable monster and magic-item copies with persistent attribution", async ({
  page,
}) => {
  await start(page);
  await choose(page, "2014", "monsters", "Goblin");
  await expect(page.locator(".srd-preview")).toContainText("Nimble Escape");
  await page
    .getByRole("button", { name: "Insert stat block", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const goblin = page.locator('.canvas [data-srd-id="2014-monsters-goblin"]');
  await expect(goblin).toContainText("Armor Class");
  await expect(goblin).toContainText("SRD 5.1");
  await page.locator(".canvas .tiptap").last().locator("p").last().click();
  await choose(page, "2024", "items", "Bag of Holding");
  await expect(page.locator(".srd-preview")).toContainText(
    "bag weighs 5 pounds",
  );
  await page
    .getByRole("button", { name: "Insert magic item", exact: true })
    .click();
  const bag = page.locator('.canvas [data-srd-id="2024-items-bag-of-holding"]');
  await expect(bag).toContainText("Utilize action");
  await expect(bag).toContainText("SRD 5.2");
  await expect(page.locator(".overflow-note")).toHaveCount(0, {
    timeout: 30000,
  });
  await expect(page.locator(".save-status")).toContainText("Saved");
  await page.reload();
  await expect(goblin).toContainText("Goblin");
  await expect(bag).toContainText("Creative Commons Attribution 4.0");
  await expect(page.locator(".canvas")).toContainText("Before reference.");
  await expect(page.locator(".canvas")).toContainText("After reference.");
});
test("large 2024 stat blocks paginate without losing actions or source text", async ({
  page,
}) => {
  await start(page, 22);
  await choose(page, "2024", "monsters", "Aboleth");
  await expect(page.locator(".srd-preview")).toContainText("Initiative +7");
  await expect(page.locator(".srd-preview")).toContainText(
    "Legendary Action Uses: 3 (4 in Lair)",
  );
  await page.screenshot({ path: "/tmp/adventure-srd-picker.png" });
  await page
    .getByRole("button", { name: "Insert stat block", exact: true })
    .click();
  await expect
    .poll(
      () =>
        page.locator('.canvas [data-srd-id="2024-monsters-aboleth"]').count(),
      { timeout: 30000 },
    )
    .toBeGreaterThan(1);
  await expect(page.locator(".overflow-note")).toHaveCount(0, {
    timeout: 60000,
  });
  const text = await page.locator(".canvas").innerText();
  for (const value of [
    "Eldritch Restoration",
    "Dominate Mind",
    "Psychic Drain",
    "SRD 5.2.1",
    "Initiative +7",
  ])
    expect(text).toContain(value);
  await page.screenshot({ path: "/tmp/adventure-srd-pages.png" });
});
test("catalog failure can be retried and cancel does not change the adventure", async ({
  page,
}) => {
  await start(page);
  const before = await page.locator(".canvas .tiptap").allTextContents();
  let fail = true;
  await page.route("**/srd/2024-monsters.json", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "SRD references", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  fail = false;
  await page.getByRole("button", { name: "Retry catalog" }).click();
  await page.getByLabel("Search SRD references").fill("Goblin Warrior");
  await page
    .locator(".srd-results button")
    .filter({ has: page.locator("b", { hasText: /^Goblin Warrior$/ }) })
    .click();
  await page.getByLabel("Search SRD references").fill("nothing-matches-xyz");
  await expect(
    page.getByRole("button", { name: "Insert stat block", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.locator(".canvas .tiptap").allTextContents()).toEqual(
    before,
  );
});
test("mobile picker keeps its title and insertion actions visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await start(page);
  await choose(page, "2014", "items", "Bag of Beans");
  const dialog = page.getByRole("dialog");
  await dialog.locator(".modal-content").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const head = await dialog.locator("header").boundingBox();
  const foot = await dialog.locator("footer").boundingBox();
  expect(head!.y).toBeGreaterThanOrEqual(0);
  expect(foot!.y + foot!.height).toBeLessThanOrEqual(700);
  await expect(
    page.getByRole("button", { name: "Insert magic item", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "/tmp/adventure-srd-mobile.png" });
});
