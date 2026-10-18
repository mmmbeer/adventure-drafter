import type { Adventure } from "./model";
import { sizes } from "./model";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function filename(doc: Adventure) {
  return (
    doc.title
      .replace(/[^a-z0-9\s_-]/gi, "")
      .trim()
      .replace(/\s+/g, "-") || "adventure"
  );
}
export function exportProject(doc: Adventure) {
  download(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${filename(doc)}.adventure.json`,
  );
}
async function imageBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      "An image could not be loaded. Upload it again before exporting.",
    );
  return new Uint8Array(await response.arrayBuffer());
}
async function embedImages(root: HTMLElement) {
  for (const img of root.querySelectorAll("img")) {
    if (!img.src) continue;
    try {
      const bytes = await imageBytes(img.src);
      const type = img.src.startsWith("data:")
        ? img.src.split(";")[0].slice(5)
        : "image/png";
      const blob = new Blob([bytes as BlobPart], { type });
      img.src = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      await img.decode();
    } catch {
      throw new Error(
        `Cannot export image “${img.alt || "untitled"}”. Its host may block cross-origin access. Upload the image instead.`,
      );
    }
  }
  for (const bg of root.querySelectorAll<HTMLElement>(".page-background")) {
    const match = bg.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    if (match && !match[1].startsWith("data:")) {
      try {
        const r = await fetch(match[1]);
        if (!r.ok) throw new Error();
        const blob = await r.blob();
        const data = await new Promise<string>((resolve) => {
          const f = new FileReader();
          f.onload = () => resolve(String(f.result));
          f.readAsDataURL(blob);
        });
        bg.style.backgroundImage = `url("${data}")`;
      } catch {
        throw new Error(
          "Cannot load a page background. Upload it again before exporting.",
        );
      }
    }
  }
}
let captured: { key: string; pages: string[] } | null = null;
export async function capturePages(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const key = doc.id + doc.updatedAt;
  if (captured?.key === key) return captured.pages;
  await document.fonts.ready;
  const { toPng, getFontEmbedCSS } = await import("html-to-image");
  const pages = [...document.querySelectorAll<HTMLElement>(".canvas .paper")];
  const result: string[] = [];
  const stage = document.createElement("div");
  stage.className = "export-stage";
  stage.style.cssText = "position:fixed;left:-20000px;top:0;z-index:-1;";
  document.body.append(stage);
  let fontEmbedCSS: string | undefined;
  try {
    for (let i = 0; i < pages.length; i++) {
      progress(`Rendering page ${i + 1} of ${pages.length}…`);
      const clone = pages[i].cloneNode(true) as HTMLElement;
      clone.classList.remove("active");
      clone
        .querySelectorAll(".no-print,.resize-cursor,.column-resize-handle")
        .forEach((n) => n.remove());
      clone
        .querySelectorAll(".ProseMirror-selectednode")
        .forEach((n) => n.classList.remove("ProseMirror-selectednode"));
      clone
        .querySelectorAll("[contenteditable]")
        .forEach((n) => n.setAttribute("contenteditable", "false"));
      stage.replaceChildren(clone);
      await embedImages(clone);
      await document.fonts.ready;
      if (fontEmbedCSS === undefined)
        fontEmbedCSS = await getFontEmbedCSS(clone);
      const size = sizes[doc.settings.size];
      result.push(
        await toPng(clone, {
          width: size.width,
          height: size.height,
          pixelRatio: 2.5,
          fontEmbedCSS,
          cacheBust: false,
          preferredFontFormat: "woff2",
          style: {
            boxShadow: "none",
            outline: "none",
            margin: "0",
            transform: "none",
          },
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    stage.remove();
  }
  captured = { key, pages: result };
  return result;
}
export async function exportPdf(doc: Adventure, progress: (s: string) => void) {
  const pages = await capturePages(doc, progress);
  const { jsPDF } = await import("jspdf");
  const size = sizes[doc.settings.size];
  const pdf = new jsPDF({
    unit: "px",
    format: [size.width, size.height],
    orientation: "portrait",
    hotfixes: ["px_scaling"],
    compress: true,
  });
  pdf.setProperties({
    title: doc.title,
    author: doc.author,
    creator: "Adventure Drafter",
  });
  for (let i = 0; i < pages.length; i++) {
    if (i) pdf.addPage([size.width, size.height]);
    pdf.addImage(
      pages[i],
      "PNG",
      0,
      0,
      size.width,
      size.height,
      undefined,
      "FAST",
    );
  }
  pdf.save(`${filename(doc)}.pdf`);
}
export async function exportFidelityDocx(
  doc: Adventure,
  progress: (s: string) => void,
) {
  const pages = await capturePages(doc, progress);
  const {
    Document,
    Paragraph,
    ImageRun,
    Packer,
    HorizontalPositionRelativeFrom,
    VerticalPositionRelativeFrom,
    TextWrappingType,
  } = await import("docx");
  const size = sizes[doc.settings.size];
  const file = new Document({
    title: doc.title,
    creator: doc.author,
    description:
      "Appearance-preserving edition. Each page is an image. Export editable DOCX for editable text.",
    sections: pages.map((src, i) => ({
      properties: {
        page: {
          size: { width: size.width * 15, height: size.height * 15 },
          margin: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            header: 0,
            footer: 0,
          },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: "png",
              data: Uint8Array.from(atob(src.split(",")[1]), (c) =>
                c.charCodeAt(0),
              ),
              transformation: { width: size.width, height: size.height },
              altText: {
                name: `${doc.title} — page ${i + 1}`,
                description: "Rendered adventure page",
                title: `Page ${i + 1}`,
              },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  offset: 0,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: 0,
                },
                wrap: { type: TextWrappingType.NONE },
                allowOverlap: true,
              },
            }),
          ],
        }),
      ],
    })),
  });
  download(await Packer.toBlob(file), `${filename(doc)}.docx`);
}
