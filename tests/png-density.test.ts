import { it, expect } from "vitest";
import { pngDensity } from "../src/lib/png-density";
it("records 300 DPI for page images and keeps the original compressed pixels", () => {
  const source = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1cAAAAASUVORK5CYII=",
    ),
    (c) => c.charCodeAt(0),
  );
  const output = pngDensity(source, 300);
  const view = new DataView(output.buffer);
  const types: string[] = [];
  for (let offset = 8; offset < output.length;) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(
      ...output.subarray(offset + 4, offset + 8),
    );
    types.push(type);
    if (type === "pHYs") {
      expect(view.getUint32(offset + 8)).toBe(11811);
      expect(view.getUint32(offset + 12)).toBe(11811);
      expect(output[offset + 16]).toBe(1);
    }
    if (type === "IDAT") {
      const original = new DataView(source.buffer);
      expect(output.subarray(offset + 8, offset + 8 + size)).toEqual(
        source.subarray(41, 41 + original.getUint32(33)),
      );
    }
    offset += size + 12;
  }
  expect(types).toEqual(["IHDR", "pHYs", "IDAT", "IEND"]);
  expect(pngDensity(output, 300)).toEqual(output);
});
