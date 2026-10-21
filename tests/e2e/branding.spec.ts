import { test, expect } from "@playwright/test";

test("the transparent manuscript logo is wired into the header and browser tab", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator(".brand-icon img");
  await expect(logo).toHaveAttribute("src", "/brand-mark.svg");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveJSProperty("complete", true);
  expect(
    await logo.evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);

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

test("the reduced-width header keeps the logo visible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".brand-icon img")).toBeVisible();
  const image = await page.locator(".brand-icon img").boundingBox();
  expect(image!.width).toBeGreaterThanOrEqual(40);
  expect(image!.x).toBeGreaterThanOrEqual(0);
});

test("the visible logo artwork is centered beside the wordmark", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator(".brand-icon img");
  await expect(logo).toHaveJSProperty("complete", true);
  const centers = await logo.evaluate((element: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(element, 0, 0, 256, 256);
    const pixels = ctx.getImageData(0, 0, 256, 256).data;
    let top = 256,
      bottom = 0;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        if (pixels[(y * 256 + x) * 4 + 3] > 20) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    const image = element.getBoundingClientRect();
    const wordmark = element
      .closest(".brand")!
      .lastElementChild!.getBoundingClientRect();
    // object-fit: cover scales this square SVG to the image element's width.
    return {
      art:
        image.y +
        image.height / 2 +
        (((top + bottom) / 2 - 127.5) / 256) * image.width,
      text: wordmark.y + wordmark.height / 2,
      height: image.height,
    };
  });
  expect(Math.abs(centers.art - centers.text)).toBeLessThan(2);
  expect(centers.height).toBeLessThanOrEqual(44);
});
