import { ImageRun, Paragraph, type IBorderOptions } from "docx";
import type { JSONContent } from "@tiptap/core";
import type { Theme } from "./types";
import { dividerSource, validDivider } from "./dividers";

/** Match the page's cover background or the divider's centered CSS crop. */
export async function pngImage(
  url?: string,
  options: {
    opacity?: number;
    paper?: string;
    width?: number;
    height?: number;
    crop?: boolean;
  } = {},
) {
  let objectUrl: string | undefined;
  try {
    let image: HTMLImageElement | undefined;
    if (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Image unavailable");
      objectUrl = URL.createObjectURL(await response.blob());
      image = new Image();
      image.src = objectUrl;
      await image.decode();
    }
    const canvas = document.createElement("canvas");
    const width = options.width ?? image?.naturalWidth ?? 1;
    const height = options.height ?? image?.naturalHeight ?? 1;
    // Keep high-resolution ornament edges for Word and print output.
    const density = options.crop && image ? image.naturalWidth / width : 1;
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion unavailable");
    if (options.paper) {
      context.fillStyle = options.paper;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (image) {
      const scale = options.crop
        ? canvas.width / image.naturalWidth
        : Math.max(
            canvas.width / image.naturalWidth,
            canvas.height / image.naturalHeight,
          );
      const w = image.naturalWidth * scale,
        h = image.naturalHeight * scale;
      context.globalAlpha = options.opacity ?? 1;
      context.drawImage(
        image,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h,
      );
    }
    return {
      data: Uint8Array.from(
        atob(canvas.toDataURL("image/png").split(",")[1]),
        (c) => c.charCodeAt(0),
      ),
      width,
      height,
    };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function wordDivider(
  node: JSONContent,
  theme: Theme,
  width: number,
  border: IBorderOptions,
) {
  const id = node.attrs?.divider;
  if (!validDivider(id)) return new Paragraph({ border: { bottom: border } });
  const image = await pngImage(dividerSource(id, theme), {
    width,
    height: 36,
    crop: true,
  });
  return new Paragraph({
    spacing: { before: 150, after: 150 },
    children: [
      new ImageRun({
        type: "png",
        data: image.data,
        transformation: { width, height: 36 },
        altText: {
          name: "Decorative horizontal rule",
          title: "",
          description: "",
        },
      }),
    ],
  });
}
