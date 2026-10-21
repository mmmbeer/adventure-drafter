import { test, expect, type Page } from "@playwright/test";

async function settledRows(page: Page, count: number) {
  await expect(page.locator(".overflow-note")).toHaveCount(0, {
    timeout: 60000,
  });
  const cells = page.locator(".page-writing table tr td:first-child");
  await expect(cells).toHaveCount(count);
  expect(await cells.allTextContents()).toEqual(
    Array.from({ length: count }, (_, i) => `Result ${i + 1}`),
  );
  const pages = await page.locator(".paper").count();
  // Repeated samples must survive several forward/backward pagination timers.
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    expect(await page.locator(".paper").count()).toBe(pages);
    await expect(cells).toHaveCount(count);
    await expect(page.locator(".overflow-note")).toHaveCount(0);
  }
  for (const table of await page.locator(".page-writing table").all()) {
    await expect(table.locator("tr").first()).toContainText(
      "ResultDescription",
    );
    expect(await table.locator("td").count()).toBeGreaterThan(0);
  }
  const inside = await page
    .locator(".page-writing table tr")
    .evaluateAll((rows) =>
      rows.every((row) => {
        const bounds = row.closest(".tiptap")!.getBoundingClientRect();
        const rect = row.getBoundingClientRect();
        return (
          rect.bottom <= bounds.bottom + 2 &&
          rect.left >= bounds.left - 2 &&
          rect.right <= bounds.right + 2
        );
      }),
    );
  expect(inside).toBe(true);
  return pages;
}

for (const wide of [false, true]) {
  test(`${wide ? "full-width" : "two-column"} tables paginate once and preserve rows after resize and reload`, async ({
    page,
  }) => {
    const count = 70;
    await page.goto("/");
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const rows = Array.from(
      { length: count },
      (_, i) =>
        `<tr><td>Result ${i + 1}</td><td>${"A strange magical effect follows the adventurers. ".repeat((i % 3) + 1)}</td></tr>`,
    ).join("");
    await page
      .getByLabel("Import source")
      .fill(
        `<p>Encounter results</p><table data-wide="${wide}"><tr><th>Result</th><th>Description</th></tr>${rows}</table><p>End of results.</p>`,
      );
    await page.getByRole("button", { name: "Import pasted text" }).click();
    await page.getByRole("button", { name: "Review the pages" }).click();
    await expect
      .poll(() => page.locator(".paper").count(), { timeout: 60000 })
      .toBeGreaterThan(1);
    const before = await settledRows(page, count);
    await page.getByRole("button", { name: "Style", exact: true }).click();
    await page.getByLabel("Body size").fill("10");
    await expect
      .poll(() => page.locator(".paper").count(), { timeout: 60000 })
      .toBeLessThan(before);
    await settledRows(page, count);
    await page.keyboard.press("Control+s");
    await expect(page.getByRole("status")).toContainText(
      "Saved on this device.",
    );
    await page.reload();
    await settledRows(page, count);
    await expect(
      page
        .locator(".page-writing")
        .getByText("End of results.", { exact: true }),
    ).toHaveCount(1);
  });
}
