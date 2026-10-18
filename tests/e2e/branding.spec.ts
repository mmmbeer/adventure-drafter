import { test, expect } from "@playwright/test";

test("the transparent manuscript logo is wired into the header and browser tab", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator(".brand-icon img");
  await expect(logo).toHaveAttribute("src", "/brand-mark.svg");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveJSProperty("complete", true);
  expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  const favicon = page.locator('head link[rel="icon"]');
  await expect(favicon).toHaveAttribute("href", "/brand-mark.svg");
  const image = await page.request.get("/brand-mark.svg");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/svg+xml");

  const svg = await image.text();
  expect(svg).toContain('viewBox="0 0 1254 1254"');
  expect(svg).toContain("manuscript lines");
  expect(svg).not.toMatch(/<rect|<image|background(?:-color)?=/i);
});

test("the reduced-width header keeps the logo visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".brand-icon img")).toBeVisible();
  const image = await page.locator(".brand-icon img").boundingBox();
  expect(image!.width).toBeGreaterThanOrEqual(40);
  expect(image!.x).toBeGreaterThanOrEqual(0);
});
