/** Embed artwork so exports never depend on a remote image being available later. */
export async function exportAsset(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Artwork could not be loaded.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Artwork could not be read."));
    reader.readAsDataURL(blob);
  });
}

export async function embedExportArtwork(root: HTMLElement) {
  const assets = new Map<string, Promise<string>>();
  const load = (url: string) => {
    if (!assets.has(url)) assets.set(url, exportAsset(url));
    return assets.get(url)!;
  };
  for (const image of root.querySelectorAll("img")) {
    if (!image.src) continue;
    try {
      image.src = await load(image.src);
      image.removeAttribute("srcset");
      image.loading = "eager";
      await image.decode();
    } catch {
      throw new Error(
        `Cannot export image “${image.alt || "untitled"}”. Upload the image if its host blocks access.`,
      );
    }
  }
  // Decorative rules use CSS backgrounds, including the theme's CSS variable.
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    let background = getComputedStyle(element).backgroundImage;
    for (const match of background.matchAll(/url\(["']?(.*?)["']?\)/g)) {
      try {
        background = background.replace(
          match[0],
          `url("${await load(match[1])}")`,
        );
      } catch {
        throw new Error(
          "Cannot export a paper background or horizontal rule. Upload the artwork again or try when the app is online.",
        );
      }
    }
    if (background !== "none") element.style.backgroundImage = background;
  }
}
