import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  createAdventure,
  heading,
  paragraph,
  page as makePage,
} from "../../src/lib/documents";
import { identifyDocument } from "../../src/lib/anchors";
import { newMaster, newStyle } from "../../src/lib/designs";
async function openFixture(page: Page) {
  const doc = identifyDocument(createAdventure(true));
  doc.title = "Authoring verification";
  const one = {
    ...heading("Chapter One"),
    attrs: { level: 1, refId: "chapter-one" },
  };
  const two = {
    ...heading("Chapter Two"),
    attrs: { level: 1, refId: "chapter-two" },
  };
  doc.pages = [
    makePage("body", [
      one,
      paragraph("Mara carries a lantern."),
      heading("First room", 2),
      paragraph("A quiet room."),
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Continue to " },
          {
            type: "crossReference",
            attrs: {
              targetId: "chapter-two",
              fallback: "Chapter Two",
              format: "title-page",
            },
          },
        ],
      },
    ]),
    makePage("body", [
      two,
      paragraph("Éowyn’s café — treasure worth 50 gold."),
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "External source",
            marks: [{ type: "link", attrs: { href: "https://example.com/" } }],
          },
        ],
      },
    ]),
  ];
  doc.namedStyles = [
    { ...newStyle(), id: "custom-style", name: "Adventure lead", fontSize: 20 },
  ];
  doc.pageMasters = [
    {
      ...newMaster(),
      id: "custom-master",
      name: "Custom book",
      mirror: true,
      headerOdd: "ODD · {title}",
      headerEven: "EVEN · {chapter}",
    },
  ];
  await page.goto("/");
  await page.locator('input[type=file][accept^=".json"]').setInputFiles({
    name: "suite.adventure.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await expect(page.getByLabel("Adventure title")).toHaveValue(doc.title);
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
}
test("outline reorders and duplicates complete sections and keeps references live", async ({
  page,
}) => {
  await openFixture(page);
  await expect(page.locator(".cross-reference")).toHaveText(
    "Chapter Two, page 2",
  );
  await page.getByRole("tab", { name: "Outline", exact: true }).click();
  await page
    .getByRole("button", { name: "Collapse Chapter One", exact: true })
    .click();
  await expect(
    page.locator(".outline-jump", { hasText: "First room" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Expand Chapter One", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move Chapter One down", exact: true })
    .click();
  await expect(page.locator(".outline-jump").first()).toHaveText("Chapter Two");
  await expect(page.locator(".cross-reference")).toHaveText(
    "Chapter Two, page 1",
  );
  await page
    .getByRole("button", { name: "Duplicate section Chapter One", exact: true })
    .click();
  await expect(
    page.locator(".outline-jump", { hasText: "Chapter One" }),
  ).toHaveCount(2);
  await expect(page.locator(".page-writing")).toContainText([
    "Mara carries a lantern.",
    "",
  ]);
  const ids = await page
    .locator(".canvas [data-ref-id]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-ref-id")));
  expect(new Set(ids).size).toBe(ids.length);
});
test("reference picker tracks renamed targets and reloads without breaking links", async ({
  page,
}) => {
  await openFixture(page);
  const heading = page.locator("#ref-chapter-two");
  await heading.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+End");
  await page.keyboard.type("Renamed chapter");
  await expect(page.locator(".cross-reference")).toHaveText(
    "Renamed chapter, page 2",
  );
  await page
    .locator(".paper.body .tiptap")
    .first()
    .locator("p")
    .first()
    .click();
  await page.keyboard.press("End");
  await page.getByLabel("Insert block").selectOption("reference");
  await page.getByLabel("Find reference target").fill("Renamed chapter");
  await page.locator(".reference-results button").click();
  await page.getByLabel("Reference format").selectOption("title");
  await page
    .getByRole("button", { name: "Insert reference", exact: true })
    .click();
  await expect(page.locator(".cross-reference")).toHaveCount(2);
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(page.locator(".cross-reference").first()).toHaveText(
    "Renamed chapter",
  );
});
test("library creates copies and linked instances and previews replacements", async ({
  page,
}) => {
  await openFixture(page);
  await page
    .locator(".paper.body .tiptap")
    .first()
    .locator("p")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Content library", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save current content", exact: true })
    .click();
  await page.getByLabel("Library entry name").fill("Lantern NPC");
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save and update 0 instances", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insert linked", exact: true })
    .click();
  await expect(page.locator(".canvas [data-reusable]")).toHaveCount(1);
  await page.locator(".paper.body .tiptap").last().locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Content library", exact: true })
    .click();
  await page
    .locator(".reference-results button", { hasText: "Lantern NPC" })
    .click();
  await page.getByRole("button", { name: "Insert copy", exact: true }).click();
  await page
    .getByRole("button", { name: "Content library", exact: true })
    .click();
  await page
    .locator(".reference-results button", { hasText: "Lantern NPC" })
    .click();
  await page.getByRole("button", { name: "Edit entry", exact: true }).click();
  await page
    .getByLabel("Library content editor")
    .fill("Mara now carries a silver lantern.");
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(page.locator(".library-review")).toContainText(
    "1 linked instance",
  );
  await expect(page.locator(".library-review")).toContainText(
    "Mara carries a lantern.",
  );
  await page
    .getByRole("button", { name: "Save and update 1 instances", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".canvas [data-reusable]")).toContainText(
    "silver lantern",
  );
  await expect(page.locator(".paper.body").last()).toContainText(
    "Mara carries a lantern.",
  );
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(page.locator(".canvas [data-reusable]")).toContainText(
    "silver lantern",
  );
});
test("named styles and mirrored page masters persist and custom designs can be edited", async ({
  page,
}) => {
  await openFixture(page);
  const paragraph = page
    .locator(".paper.body .tiptap")
    .first()
    .locator("p")
    .first();
  await paragraph.click();
  await page
    .getByLabel("Named style", { exact: true })
    .selectOption("custom-style");
  await expect(paragraph).toHaveCSS("font-size", "20px");
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.getByLabel("Default page master").selectOption("custom-master");
  await expect(
    page.locator(".paper.body").first().locator(".running-header"),
  ).toContainText("ODD · Authoring verification");
  await expect(
    page.locator(".paper.body").last().locator(".running-header"),
  ).toContainText("EVEN · Chapter Two");
  await expect(page.locator(".paper.body").first()).toHaveCSS(
    "padding-left",
    "72px",
  );
  await expect(page.locator(".paper.body").last()).toHaveCSS(
    "padding-right",
    "72px",
  );
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Manage styles and page masters",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Saved design", { exact: true })
    .selectOption("custom-style");
  await page.getByLabel("Style font size").fill("22");
  await page.getByRole("button", { name: "Save design", exact: true }).click();
  await expect(paragraph).toHaveCSS("font-size", "22px");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status")).toContainText("Saved on this device.");
  await page.reload();
  await expect(paragraph).toHaveCSS("font-size", "22px");
  await page.getByRole("tab", { name: "Outline", exact: true }).click();
  await page.screenshot({ path: "/tmp/adventure-authoring-workspace.png" });
});
test("searchable PDF contains text mapping, bookmarks, internal destinations and external links", async ({
  page,
}, testInfo) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download").catch(() => null);
  await page
    .getByRole("button", { name: "PDF · searchable with links", exact: true })
    .click();
  await expect(page.locator(".busy-overlay")).toHaveCount(0, {
    timeout: 60000,
  });
  await expect(page.locator(".toast")).toContainText("Your export is ready.", {
    timeout: 1000,
  });
  const download = await downloaded;
  if (!download) throw new Error("No searchable PDF was downloaded");
  const path = testInfo.outputPath("searchable.pdf");
  await download.saveAs(path);
  const bytes = await readFile(path),
    raw = bytes.toString("latin1");
  expect(raw).toContain("/ToUnicode");
  expect(raw).toContain("/Outlines");
  expect(raw).toContain("/Subtype /Link");
  expect(raw).toContain("/Dest");
  expect(raw).toContain("https://example.com/");
  await download.saveAs("/tmp/adventure-searchable.pdf");
});
