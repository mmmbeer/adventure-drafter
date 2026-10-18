import { test, expect, type Page } from "@playwright/test";

async function selectAll(page: Page, modifier = "Control") {
  await page
    .locator(".page-writing .tiptap")
    .nth(1)
    .locator("p")
    .first()
    .click();
  await page.keyboard.press(`${modifier}+a`);
  await expect(
    page.locator('.page-writing .tiptap[data-document-selected="true"]'),
  ).toHaveCount(3);
}

async function copySelection(page: Page, cut = false) {
  return page
    .locator(".page-writing .tiptap")
    .nth(1)
    .evaluate((element, cut) => {
      const clipboardData = new DataTransfer();
      element.dispatchEvent(
        new ClipboardEvent(cut ? "cut" : "copy", {
          clipboardData,
          bubbles: true,
          cancelable: true,
        }),
      );
      return {
        text: clipboardData.getData("text/plain"),
        html: clipboardData.getData("text/html"),
      };
    }, cut);
}

test("Select All spans pages and copies only document content in order", async ({
  page,
}) => {
  await page.goto("/");
  await selectAll(page);
  const copy = await copySelection(page);
  expect(copy.text).toContain("AN ADVENTURE IN THE BORDERLANDS");
  expect(copy.text).toContain("At dusk, a bell rings");
  expect(copy.text).toContain("Bellkeeper");
  expect(copy.text.indexOf("AN ADVENTURE")).toBeLessThan(
    copy.text.indexOf("At dusk"),
  );
  expect(copy.text).not.toContain("WRITE ON THE PAGE");
  expect(copy.html).toContain("<h1");
  expect(copy.html).toContain("<table");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-document-selected="true"]')).toHaveCount(0);
  await selectAll(page, "Meta");
});

test("document selection formats every page and undo/redo restores the whole operation", async ({
  page,
}) => {
  await page.goto("/");
  await selectAll(page);
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  for (const editor of await page.locator(".page-writing .tiptap").all())
    await expect(editor.locator("p").first().locator("strong")).toBeVisible();
  await page.keyboard.press("Control+z");
  await expect(
    page
      .locator(".page-writing .tiptap")
      .first()
      .locator("p")
      .first()
      .locator("strong"),
  ).toHaveCount(0);
  await page.keyboard.press("Control+Shift+z");
  await expect(
    page
      .locator(".page-writing .tiptap")
      .first()
      .locator("p")
      .first()
      .locator("strong"),
  ).toHaveCount(1);
});

test("typing replaces all selected pages and undo restores them", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".page-writing .tiptap")).toHaveCount(3);
  const original = await page
    .locator(".page-writing .tiptap")
    .allTextContents();
  await selectAll(page);
  await page.keyboard.type("Replacement adventure");
  await expect
    .poll(async () =>
      (await page.locator(".page-writing .tiptap").allTextContents()).join(""),
    )
    .toBe("Replacement adventure");
  // Undo normal typing after the initial document-wide replacement first.
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect
    .poll(() => page.locator(".page-writing .tiptap").allTextContents())
    .toEqual(original);
});

test("cut and paste replace the complete selection while input fields stay local", async ({
  page,
}) => {
  await page.goto("/");
  await selectAll(page);
  const cut = await copySelection(page, true);
  expect(cut.text).toContain("Bellkeeper");
  await expect
    .poll(async () =>
      (await page.locator(".page-writing .tiptap").allTextContents()).join(""),
    )
    .toBe("");
  await page.keyboard.press("Control+z");
  await selectAll(page);
  await page
    .locator(".page-writing .tiptap")
    .nth(1)
    .evaluate((element) => {
      const data = new DataTransfer();
      data.setData("text/html", "<p><em>Pasted adventure</em></p>");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  await expect(
    page.locator(".page-writing .tiptap").first().locator("em"),
  ).toHaveText("Pasted adventure");
  await expect
    .poll(async () =>
      (await page.locator(".page-writing .tiptap").allTextContents()).join(""),
    )
    .toBe("Pasted adventure");
  await page.getByLabel("Adventure title", { exact: true }).click();
  await page.keyboard.press("Control+a");
  await expect(page.locator('[data-document-selected="true"]')).toHaveCount(0);
  await page.keyboard.type("New title");
  await expect(page.getByLabel("Adventure title", { exact: true })).toHaveValue(
    "New title",
  );
  await expect(page.locator(".page-writing .tiptap").first()).toContainText(
    "Pasted adventure",
  );
});
