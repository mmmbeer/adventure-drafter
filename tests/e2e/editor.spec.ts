import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("page editing, templates, generated references, local save, backup and restore", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".paper")).toHaveCount(3);
  await page
    .getByLabel("Adventure title", { exact: true })
    .fill("The Ember Archive");
  await page.getByRole("button", { name: /Adventure page · 2/ }).click();
  const editor = page.locator(".tiptap").nth(1);
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" A secret about the Ember Archive.");
  await page.getByRole("button", { name: /Field notes/ }).click();
  await expect(editor).toContainText("A secret about the Ember Archive.");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page
    .getByRole("button", { name: "Table of contents", exact: true })
    .click();
  await expect(page.locator(".generated")).toContainText("Adventure overview");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page
    .getByRole("button", { name: "Keyword index", exact: true })
    .click();
  await expect(page.locator(".paper.index")).toContainText("Mara Voss");
  await expect(page.locator(".save-status")).toHaveText("Saved on this device");
  await page.reload();
  await expect(page.getByLabel("Adventure title", { exact: true })).toHaveValue(
    "The Ember Archive",
  );
  await expect(page.locator(".tiptap").nth(1)).toContainText(
    "A secret about the Ember Archive.",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Project backup/ }).click();
  const file = await downloadPromise;
  const path = test.info().outputPath("project.json");
  await file.saveAs(path);
  const saved = JSON.parse(await fs.readFile(path, "utf8"));
  expect(saved.settings.theme.id).toBe("field");
  expect(saved.pages.some((p: any) => p.kind === "toc")).toBe(true);
  await page.getByLabel("Close dialog").click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator("input[type=file]").first().setInputFiles(path);
  await expect(page.getByLabel("Adventure title", { exact: true })).toHaveValue(
    "The Ember Archive",
  );
  expect(errors).toEqual([]);
});
test("Homebrewery import and long text pagination preserve all text", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const paras = Array.from(
    { length: 45 },
    (_, i) =>
      `Paragraph ${i}: The mist settles over the water. ${"Every villager carries a secret. ".repeat(7)}`,
  );
  await page
    .getByLabel("Import source")
    .fill("# The Long Road\n\n" + paras.join("\n\n") + "\n\nEND_OF_ADVENTURE");
  await page.getByRole("button", { name: "Import pasted text" }).click();
  await page.getByRole("button", { name: "Review the pages" }).click();
  await expect
    .poll(async () => page.locator(".paper").count(), { timeout: 30000 })
    .toBeGreaterThan(3);
  await expect
    .poll(async () => page.locator(".overflow-note").count(), {
      timeout: 60000,
    })
    .toBe(0);
  const text = (await page.locator(".tiptap").allTextContents()).join("");
  expect(text).toContain("END_OF_ADVENTURE");
  for (let i = 0; i < 45; i++) expect(text).toContain(`Paragraph ${i}:`);
});
test("all publishing downloads are produced and editable DOCX imports back", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  for (const [label, name] of [
    ["PDF · exact appearance", "out.pdf"],
    ["DOCX · exact appearance", "out.docx"],
    ["DOCX · editable text", "editable.docx"],
  ]) {
    const pending = page.waitForEvent("download", { timeout: 60000 });
    await page
      .getByRole("button", {
        name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    const file = await pending;
    const path = test.info().outputPath(name);
    await file.saveAs(path);
    expect((await fs.stat(path)).size).toBeGreaterThan(5000);
  }
  await page.getByLabel("Close dialog").click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(test.info().outputPath("editable.docx"));
  await page.getByRole("button", { name: "Review the pages" }).click();
  await expect(page.locator(".canvas")).toContainText("Bellkeeper");
  await expect(page.locator(".canvas table").first()).toBeVisible();
});
test("clipboard image and high heading levels remain editable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Adventure page · 2/ }).click();
  await page.locator(".tiptap").nth(1).click();
  await page.keyboard.press("Control+Home");
  await page.getByLabel("Paragraph style").selectOption("9");
  await expect(page.locator('.tiptap [data-level="9"]').first()).toBeVisible();
  await page.getByLabel("Insert block").selectOption("image");
  await page
    .locator('input[accept="image/png,image/jpeg,image/webp,image/gif"]')
    .setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1cAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(page.locator(".canvas img")).toHaveCount(1);
  await page.locator(".canvas img").click();
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Text flow", exact: true })
    .selectOption("left");
  await expect(page.locator(".canvas img")).toHaveAttribute(
    "data-flow",
    "left",
  );
});

test("pasted images, URL art, custom fonts and named versions survive a publishing pass", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Adventure page · 2/ }).click();
  await page.locator(".tiptap").nth(1).click();
  await page
    .locator(".tiptap")
    .nth(1)
    .evaluate((el) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 40;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#7a4a25";
      ctx.fillRect(0, 0, 64, 40);
      const bytes = Uint8Array.from(
        atob(canvas.toDataURL().split(",")[1]),
        (c) => c.charCodeAt(0),
      );
      const data = new DataTransfer();
      data.items.add(new File([bytes], "map.png", { type: "image/png" }));
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  await expect(page.locator(".canvas img")).toHaveCount(1);
  const data = await page.locator(".canvas img").getAttribute("src");
  await page.route("**/test-map.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(data!.split(",")[1], "base64"),
    }),
  );
  await page.getByRole("button", { name: "Page", exact: true }).click();
  await page
    .getByRole("button", { name: "Background image", exact: true })
    .click();
  await page.getByLabel("Image URL").fill("http://127.0.0.1:5173/test-map.png");
  await page.getByRole("button", { name: "Add from URL", exact: true }).click();
  await expect(page.locator(".page-background")).toHaveCount(1);
  await page
    .locator('input[accept=".woff,.woff2,.ttf,.otf"]')
    .setInputFiles(
      "node_modules/@fontsource/almendra/files/almendra-latin-400-normal.woff2",
    );
  await expect(page.getByRole("status")).toContainText(
    "added to the font library",
  );
  await page.getByLabel("Saved versions").click();
  await page
    .getByPlaceholder("Before the final encounter rewrite")
    .fill("With map and custom font");
  await page.getByRole("button", { name: "Save version", exact: true }).click();
  await page.getByLabel("Close dialog").click();
  await page
    .getByLabel("Adventure title", { exact: true })
    .fill("A different title");
  await page.getByLabel("Saved versions").click();
  await page
    .getByRole("button", { name: "Restore", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Adventure title", { exact: true })).toHaveValue(
    "The Bell Beneath Blackwater",
  );
  await expect(page.locator(".canvas img")).toHaveCount(1);
  await expect(page.locator(".page-background")).toHaveCount(1);
  await expect(page.locator(".overflow-note")).toHaveCount(0, { timeout: 30000 });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 70000 });
  await page.getByRole("button", { name: /PDF · exact appearance/ }).click();
  const error = page.locator(".toast").filter({ hasText: /overflow|could not|failed|cannot|unavailable/i });
  const output = await Promise.race([
    download,
    error.waitFor({ state: "visible", timeout: 70000 }).then(async () => {
      throw new Error(`PDF export error: ${await error.innerText()}`);
    }),
  ]);
  await output.saveAs(test.info().outputPath("illustrated.pdf"));
  expect(
    (await fs.stat(test.info().outputPath("illustrated.pdf"))).size,
  ).toBeGreaterThan(5000);
});

test("mobile writing desk keeps the page and inspector close control accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".paper")).toHaveCount(3);
  await expect(page.locator(".inspector")).toHaveCount(0);
  await page.getByLabel("Show inspector", { exact: true }).click();
  await expect(page.locator(".inspector")).toBeVisible();
  await page.getByLabel("Close inspector", { exact: true }).click();
  await expect(page.locator(".inspector")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
});

test("shared dialog sizes retain visible headers and actions, and native file selection works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("/");
  const check = async (size: string) => {
    const modal = page.locator(`.modal-${size}`);
    await expect(modal).toBeVisible();
    const header = await modal.locator("header").boundingBox();
    const footer = await modal.locator(".modal-footer").boundingBox();
    expect(header!.y).toBeGreaterThanOrEqual(0);
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(600);
    await modal.locator(".modal-content").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect((await modal.locator("header").boundingBox())!.y).toBe(header!.y);
    await expect(
      modal.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
  };
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await check("normal");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Choose a file/ }).click();
  const picker = await chooser;
  await picker.setFiles({
    name: "picker-test.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Picker import\n\nThe file selection works."),
  });
  await expect(page.locator(".canvas")).toContainText(
    "The file selection works.",
  );
  await page.getByLabel("Show pages", { exact: true }).click();
  await page
    .getByRole("button", { name: "Writing desk guide", exact: true })
    .click();
  await check("wide");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator(".tiptap").first().click();
  await page.getByLabel("Link", { exact: true }).click();
  await check("small");
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal")).toHaveCount(0);
});
