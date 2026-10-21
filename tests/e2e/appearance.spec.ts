import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  createAdventure,
  heading,
  paragraph,
  page as makePage,
} from "../../src/lib/documents";
import { colorThemes, fontPairings } from "../../src/lib/appearance";

async function openFixture(page: Page) {
  const doc = createAdventure(true);
  doc.pages = [
    makePage("body", [
      heading("The old gate"),
      paragraph("A lantern lights the road."),
    ]),
  ];
  await page.goto("/");
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({
    name: "appearance.adventure.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  if (
    await page
      .getByRole("button", { name: "Show inspector", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Show inspector", exact: true })
      .click();
  await page.getByRole("button", { name: "Style", exact: true }).click();
}

async function background(page: Page, color: string) {
  await page
    .getByLabel("Default background color", { exact: true })
    .fill(color);
}

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(", ")})`;
}

test("themes supply default paper colors while preserving font choices", async ({
  page,
}) => {
  await openFixture(page);
  await background(page, "#ddeeff");
  await page
    .getByLabel("Font pairing", { exact: true })
    .selectOption("storybook");
  for (const palette of colorThemes) {
    await page
      .getByLabel("Color theme", { exact: true })
      .selectOption(palette.id);
    await expect(page.locator(".paper")).toHaveCSS(
      "background-color",
      rgb(palette.paper),
    );
    await expect(page.locator(".paper")).toHaveCSS("color", rgb(palette.ink));
    await expect(page.locator(".paper h1")).toHaveCSS(
      "color",
      rgb(palette.accent),
    );
    await expect(page.getByLabel("Body family", { exact: true })).toHaveValue(
      "Lora",
    );
  }
  await background(page, "#ddeeff");
  await page
    .getByRole("button", {
      name: "Use theme's suggested background",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Default background color", { exact: true }),
  ).toHaveValue("#eef7f2");
  await page.getByRole("button", { name: /Gothic folio/ }).click();
  await expect(
    page.getByLabel("Default background color", { exact: true }),
  ).toHaveValue("#eee9e4");
  await page.getByRole("button", { name: "Page", exact: true }).click();
  await page.getByText("Document default color", { exact: true }).click();
  await background(page, "#fffdf0");
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await expect(
    page.getByLabel("Default background color", { exact: true }),
  ).toHaveValue("#fffdf0");
});

test("every font pairing loads and individual fonts remain editable", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByLabel("Color theme", { exact: true }).selectOption("ocean");
  for (const pairing of fontPairings) {
    await page
      .getByLabel("Font pairing", { exact: true })
      .selectOption(pairing.id);
    await expect(
      page.getByLabel("Heading family", { exact: true }),
    ).toHaveValue(pairing.headingFont);
    await expect(page.locator(".paper")).toHaveCSS(
      "font-family",
      new RegExp(pairing.bodyFont),
    );
    const loaded = await page.evaluate(async (p) => {
      const families = [p.headingFont, p.bodyFont];
      const faces = await Promise.all(
        families.map((f) => document.fonts.load(`16px "${f}"`)),
      );
      return faces.every(
        (f) => f.length > 0 && f.every((face) => face.status === "loaded"),
      );
    }, pairing);
    expect(loaded).toBe(true);
    await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue(
      "ocean",
    );
  }
  await page
    .getByLabel("Heading family", { exact: true })
    .selectOption("MedievalSharp");
  await expect(page.getByLabel("Font pairing", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.locator(".paper h1")).toHaveCSS(
    "font-family",
    /MedievalSharp/,
  );
});

test("appearance survives reload and project backup import", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByLabel("Color theme", { exact: true }).selectOption("desert");
  await background(page, "#eeddcc");
  await page.getByLabel("Font pairing", { exact: true }).selectOption("scribe");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await expect(
    page.getByLabel("Default background color", { exact: true }),
  ).toHaveValue("#eeddcc");
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue(
    "desert",
  );
  await expect(page.getByLabel("Font pairing", { exact: true })).toHaveValue(
    "scribe",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project backup · JSON", exact: true })
    .click();
  const download = await pending;
  const path = test.info().outputPath("appearance.json");
  await download.saveAs(path);
  const saved = JSON.parse(await readFile(path, "utf8"));
  expect(saved.settings.theme).toMatchObject({
    paper: "#eeddcc",
    headingFont: "Fondamento",
    bodyFont: "Vollkorn",
    accent: "#99502b",
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await background(page, "#ffffff");
  await page.locator('input[type=file][accept^=".json"]').setInputFiles(path);
  await expect(
    page.getByLabel("Default background color", { exact: true }),
  ).toHaveValue("#eeddcc");
});

test("editable Word retains background, text colors and selected fonts", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByLabel("Color theme", { exact: true }).selectOption("ocean");
  await background(page, "#eeddcc");
  await page
    .getByLabel("Font pairing", { exact: true })
    .selectOption("literary");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "DOCX · editable text", exact: true })
    .click();
  const path = test.info().outputPath("appearance.docx");
  await (await pending).saveAs(path);
  const zip = await JSZip.loadAsync(await readFile(path));
  const xml = await zip.file("word/document.xml")!.async("string");
  const styles = await zip.file("word/styles.xml")!.async("string");
  expect(xml).toMatch(/<w:background[^>]*w:color="EEDDCC"/i);
  for (const value of ["Cormorant Garamond", "EB Garamond", "203549", "285f85"])
    expect(styles.toLowerCase()).toContain(value.toLowerCase());
});

test("background and font controls fit on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  await background(page, "#f0f6fa");
  await page.getByLabel("Font pairing", { exact: true }).selectOption("modern");
  await expect(page.getByLabel("Body family", { exact: true })).toHaveValue(
    "Inter",
  );
  await page
    .getByLabel("Default background color", { exact: true })
    .scrollIntoViewIfNeeded();
  const inspector = await page.locator(".inspector").boundingBox();
  expect(inspector!.x).toBeGreaterThanOrEqual(0);
  expect(inspector!.x + inspector!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: test.info().outputPath("appearance-mobile.png"),
  });
});

test("page swatches override the theme and can return to inheritance", async ({
  page,
}) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Page", exact: true }).click();
  const colors = page.getByRole("group", {
    name: "This page's background color suggestions",
  });
  await colors.getByRole("button", { name: "Beige", exact: true }).click();
  await expect(page.getByLabel("Inherit default color")).not.toBeChecked();
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await page.getByLabel("Color theme", { exact: true }).selectOption("ocean");
  await expect(page.locator(".paper")).toHaveCSS(
    "background-color",
    rgb("#f3ead8"),
  );
  await page.getByRole("button", { name: "Page", exact: true }).click();
  await page.getByLabel("Inherit default color").check();
  await expect(page.locator(".paper")).toHaveCSS(
    "background-color",
    rgb("#f0f6fa"),
  );
});

test("headers and footers edit from the canvas with live placeholders and page overrides", async ({
  page,
}) => {
  await openFixture(page);
  await page
    .getByRole("button", { name: "Edit header text", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Header & footer" });
  await dialog
    .getByLabel("Header · left", { exact: true })
    .fill("Adventure: {title}");
  await dialog
    .getByLabel("Footer · center", { exact: true })
    .fill("Page {page} of {pages}");
  await dialog.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.locator(".page-footer b")).toHaveText("Page 1 of 1");
  await expect(page.locator(".running-header")).toContainText("Adventure:");
  await page
    .getByRole("button", { name: "Header & footer", exact: true })
    .click();
  await dialog.getByLabel("Header and footer scope").selectOption("page");
  await dialog
    .getByLabel("Header · left", { exact: true })
    .fill("Only this page");
  await dialog.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.locator(".running-header")).toContainText("Only this page");
  await page
    .getByRole("button", { name: "Edit footer text", exact: true })
    .click();
  await expect(dialog.getByLabel("Header and footer scope")).toHaveValue(
    "page",
  );
  await dialog.getByLabel("Inherit header and footer").check();
  await dialog.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.locator(".running-header")).toContainText("Adventure:");
  await page.reload();
  await expect(page.locator(".page-footer b")).toHaveText("Page 1 of 1");
});

test("theme rules follow color themes and survive reload", async ({ page }) => {
  await openFixture(page);
  await page.locator(".tiptap p").last().click();
  await page.getByLabel("Insert block", { exact: true }).selectOption("rule");
  const dialog = page.getByRole("dialog", { name: "Horizontal rules" });
  await expect(
    dialog.getByRole("button", { name: "Theme divider", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByLabel("Span all columns").check();
  await dialog.getByRole("button", { name: "Insert horizontal rule" }).click();
  const rule = page.locator('.tiptap hr[data-divider="theme"]');
  await expect(rule).toHaveCount(1);
  await expect(rule).toHaveAttribute("data-wide", "true");
  await page.getByLabel("Color theme", { exact: true }).selectOption("forest");
  await expect(rule).toHaveCSS("background-image", /forest\.png/);
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(rule).toHaveCount(1);
  await expect(rule).toHaveCSS("background-image", /forest\.png/);
});
