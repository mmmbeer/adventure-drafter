import { type ChangeEvent } from "react";
import { paragraph } from "../lib/model";
import { installFonts, dataUrl } from "../lib/fonts";
import { safeImageUrl } from "../lib/editor";
import type { WorkspaceState } from "./useWorkspaceState";
export function useMediaActions(state: WorkspaceState) {
  const {
    active,
    editor,
    setTab,
    dialog,
    setDialog,
    setRightOpen,
    alt,
    caption,
    imageFlow,
    imageWidth,
    report,
    update,
  } = state;
  const addImage = async (source: string) => {
    if (!safeImageUrl(source))
      throw new Error(
        "Use a PNG, JPEG, WebP or GIF image, or an http(s) image URL.",
      );
    let embedded = source;
    if (!source.startsWith("data:")) {
      const r = await fetch(source);
      if (!r.ok) throw new Error("The image URL could not be loaded.");
      const blob = await r.blob();
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(blob.type))
        throw new Error(
          "This URL must point directly to a PNG, JPEG, WebP or GIF.",
        );
      if (blob.size > 15 * 1024 * 1024)
        throw new Error("Use an image smaller than 15 MB.");
      embedded = await dataUrl(blob);
    }
    if (dialog === "background")
      update((d) => ({
        ...d,
        pages: d.pages.map((p) =>
          p.id === active ? { ...p, background: embedded } : p,
        ),
      }));
    else if (editor) {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "image",
            attrs: { src: embedded, alt, width: imageWidth, flow: imageFlow },
          },
          ...(caption ? [paragraph(caption)] : []),
          paragraph(),
        ])
        .run();
      setTab("page");
      setRightOpen(true);
    } else
      throw new Error("Click in a writing page before inserting an image.");
    setDialog("");
  };
  const imageFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type))
        throw new Error("Choose a PNG, JPEG, WebP or GIF.");
      if (file.size > 15 * 1024 * 1024)
        throw new Error("Choose an image smaller than 15 MB.");
      await addImage(await dataUrl(file));
    } catch (e) {
      report((e as Error).message);
    }
    e.target.value = "";
  };
  const addFont = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (f.size > 8 * 1024 * 1024)
        throw new Error("Use a font smaller than 8 MB.");
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9 _-]/gi, "");
      const font = { name, data: await dataUrl(f) };
      await installFonts([font]);
      update((d) => ({
        ...d,
        fonts: [...d.fonts.filter((x) => x.name !== name), font],
      }));
      report(`${name} added to the font library.`);
    } catch (e) {
      report((e as Error).message);
    }
    e.target.value = "";
  };
  return { addImage, imageFile, addFont };
}
