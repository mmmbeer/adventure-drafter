/** Set the PNG's physical print density without recompressing its pixels. */
export function pngDensity(bytes: Uint8Array, dpi: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a)
    throw new Error("The rendered page is not a PNG image.");
  const density = new Uint8Array(21);
  const data = new DataView(density.buffer);
  data.setUint32(0, 9);
  density.set([112, 72, 89, 115], 4); // pHYs
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  data.setUint32(8, pixelsPerMeter);
  data.setUint32(12, pixelsPerMeter);
  density[16] = 1;
  let crc = 0xffffffff;
  for (const byte of density.subarray(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  data.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const chunks: Uint8Array[] = [bytes.subarray(0, 8)];
  for (let offset = 8; offset < bytes.length;) {
    const length = view.getUint32(offset) + 12;
    if (offset + length > bytes.length)
      throw new Error("The rendered PNG is incomplete.");
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type !== "pHYs") chunks.push(bytes.subarray(offset, offset + length));
    if (type === "IHDR") chunks.push(density);
    offset += length;
  }
  const result = new Uint8Array(
    chunks.reduce((sum, chunk) => sum + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
