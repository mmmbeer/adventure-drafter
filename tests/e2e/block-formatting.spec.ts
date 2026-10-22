import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import {
  createAdventure,
  page as makePage,
  paragraph,
  heading,
} from "../../src/lib/documents";
// Click the rendered text rather than a fixed point in a scaled block box.
async function selectText(page: Page, selector: string, text: string) {
  const block = page.locator(selector).filter({ hasText: text });
  await block.scrollIntoViewIfNeeded();
  const point = await block.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getClientRects()[0];
    return {
      x: rect.x + Math.min(15, rect.width / 2),
      y: rect.y + rect.height / 2,
    };
  });
  await page.mouse.click(point.x, point.y);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const node = window.getSelection()?.anchorNode;
        return node?.parentElement?.closest("p,h2")?.textContent;
      }),
    )
    .toBe(text);
}
async function openFixture(page: Page) {
  const doc = createAdventure(true);
  doc.pages = [
    makePage("body", [
      paragraph("Opening words"),
      paragraph("Second paragraph"),
      heading("Chapter heading", 2),
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [paragraph("Cell A")] },
              { type: "tableCell", content: [paragraph("Cell B")] },
            ],
          },
        ],
      },
      {
        type: "callout",
        attrs: { kind: "readaloud" },
        content: [paragraph("A quiet chamber")],
      },
    ]),
  ];
  await page.goto("/");
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({
    name: "formatting.adventure.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
}
test("text styles, list controls and borders persist through reload", async ({
  page,
}) => {
  await openFixture(page);
  await selectText(page, ".tiptap p", "Opening words");
  await page
    .getByLabel("Paragraph style", { exact: true })
    .selectOption("title");
  const title = page.locator('.tiptap p[data-text-role="title"]');
  await expect(title).toHaveText("Opening words");
  await page.getByLabel("Border edges", { exact: true }).selectOption("bottom");
  await page.getByLabel("Border line style").selectOption("dashed");
  await page.getByLabel("Border width", { exact: true }).fill("3");
  await page.getByLabel("Block padding").fill("8");
  await expect(title).toHaveCSS("border-bottom-width", "3px");
  await expect(title).toHaveCSS("border-bottom-style", "dashed");
  await expect(title).toHaveCSS("padding-top", "8px");
  await selectText(page, ".tiptap p", "Second paragraph");
  await expect(page.getByLabel("Paragraph style", { exact: true })).toHaveValue(
    "p",
  );
  await page
    .getByLabel("Paragraph style", { exact: true })
    .selectOption("orderedList");
  await page.getByLabel("List markers").selectOption("lower-roman");
  await page.getByLabel("List start number").fill("4");
  await expect(page.locator(".tiptap ol")).toHaveCSS(
    "list-style-type",
    "lower-roman",
  );
  await expect(page.locator(".tiptap ol")).toHaveAttribute("start", "4");
  await expect(title).toHaveText("Opening words");
  await expect(page.locator(".tiptap ol")).toContainText("Second paragraph");
  await expect(page.locator(".save-status")).toContainText("Saved");
  await page.screenshot({ path: "/tmp/adventure-borders-desktop.png" });
  await page.reload();
  await expect(title).toHaveCSS("border-bottom-width", "3px");
  await expect(page.locator(".tiptap ol")).toHaveAttribute("start", "4");
  await page.locator(".tiptap li p").click();
  await expect(page.getByLabel("Paragraph style", { exact: true })).toHaveValue(
    "orderedList",
  );
  await page.getByLabel("Paragraph style", { exact: true }).selectOption("p");
  await expect(page.locator(".tiptap ol")).toHaveCount(0);
  await expect(page.locator(".tiptap")).toContainText("Second paragraph");
});
test("border targets affect cells, the table outline and layout boxes", async ({
  page,
}) => {
  await openFixture(page);
  await page.locator(".tiptap th p").click();
  await expect(page.getByLabel("Border target")).toHaveValue("cells");
  await page.getByLabel("Border edges", { exact: true }).selectOption("none");
  await expect(page.locator(".tiptap th")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".tiptap td")).toHaveCSS("border-top-width", "1px");
  await page.getByLabel("Border target").selectOption("table");
  await page.getByLabel("Border edges", { exact: true }).selectOption("all");
  await page.getByLabel("Border width", { exact: true }).fill("4");
  await expect(page.locator(".tiptap table")).toHaveCSS(
    "border-top-width",
    "4px",
  );
  await page.locator(".tiptap aside p").click();
  await expect(page.getByLabel("Border target")).toHaveValue("callout");
  await page.getByLabel("Border edges", { exact: true }).selectOption("left");
  await page.getByLabel("Border line style").selectOption("double");
  await page.getByLabel("Border width", { exact: true }).fill("6");
  await expect(page.locator(".tiptap aside")).toHaveCSS(
    "border-left-width",
    "6px",
  );
  await expect(page.locator(".tiptap aside")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await page
    .getByRole("button", { name: "Reset borders and shading", exact: true })
    .click();
  await expect(page.locator(".tiptap aside")).toHaveCSS(
    "border-top-width",
    "2px",
  );
});

test("editable Word export retains title, code and list formatting", async ({
  page,
}) => {
  await openFixture(page);
  await selectText(page, ".tiptap p", "Opening words");
  await page
    .getByLabel("Paragraph style", { exact: true })
    .selectOption("title");
  await page.getByLabel("Border edges", { exact: true }).selectOption("bottom");
  await page.getByLabel("Border line style").selectOption("dashed");
  await selectText(page, ".tiptap p", "Second paragraph");
  await expect(page.getByLabel("Paragraph style", { exact: true })).toHaveValue(
    "p",
  );
  await page
    .getByLabel("Paragraph style", { exact: true })
    .selectOption("codeBlock");
  await expect(page.locator(".tiptap pre")).toContainText("Second paragraph");
  await selectText(page, ".tiptap h2", "Chapter heading");
  await expect(page.getByLabel("Paragraph style", { exact: true })).toHaveValue(
    "2",
  );
  await page
    .getByLabel("Paragraph style", { exact: true })
    .selectOption("orderedList");
  await page.getByLabel("List markers").selectOption("upper-alpha");
  await page.getByLabel("List start number").fill("5");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Word document" }).click();
  const download = await pending;
  const path = test.info().outputPath("formatting.docx");
  await download.saveAs(path);
  const zip = await JSZip.loadAsync(await readFile(path));
  const xml = await zip.file("word/document.xml")!.async("string");
  const numbering = await zip.file("word/numbering.xml")!.async("string");
  expect(xml).toContain('w:pStyle w:val="AdventureTitle"');
  expect(xml).toContain('w:pStyle w:val="AdventureCode"');
  expect(xml).toContain("Second paragraph");
  expect(xml).toContain('w:val="dashed"');
  expect(numbering).toContain('w:start w:val="5"');
  expect(numbering).toContain('w:numFmt w:val="upperLetter"');
});
