import {
  ImageRun,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  type ParagraphChild,
} from "docx";
import { ShapeRun } from "docx/shapes";
import type { Adventure } from "./types";
import type { pageDesign } from "./designs";
import { sizes } from "./templates";
import { pngImage } from "./export-images";
import { wordColor } from "./word-format";

/** Native paper fills remain independent of editable text. Only original backdrop art is an image. */
export async function wordPaper(
  doc: Adventure,
  design: ReturnType<typeof pageDesign>,
): Promise<ParagraphChild[]> {
  const size = sizes[doc.settings.size];
  const floating = {
    horizontalPosition: {
      relative: HorizontalPositionRelativeFrom.PAGE,
      offset: 0,
    },
    verticalPosition: {
      relative: VerticalPositionRelativeFrom.PAGE,
      offset: 0,
    },
    behindDocument: true,
    wrap: { type: TextWrappingType.NONE },
    allowOverlap: true,
    layoutInCell: false,
  };
  const paper = new ShapeRun({
    type: "rectangle",
    transformation: { width: size.width, height: size.height },
    fill: wordColor(design.paper),
    line: "none",
    floating,
    altText: {
      name: "Paper color",
      title: "",
      description: "Editable Word paper shape",
    },
  });
  const result: ParagraphChild[] = [paper];
  if (design.background) {
    const image = await pngImage(design.background, {
      opacity: design.backgroundOpacity,
      paper: design.paper,
      width: size.width,
      height: size.height,
    });
    result.push(
      new ImageRun({
        type: "png",
        data: image.data,
        transformation: { width: size.width, height: size.height },
        floating,
        altText: {
          name: "Background artwork",
          title: "",
          description: "Artwork only; document text is editable.",
        },
      }),
    );
  }
  result.push(
    new ShapeRun({
      type: "rectangle",
      transformation: { width: size.width - 30, height: size.height - 30 },
      fill: "none",
      line: {
        color: wordColor(doc.settings.theme.accent),
        width: 0.75,
        transparency: 87,
      },
      floating: {
        ...floating,
        horizontalPosition: {
          relative: HorizontalPositionRelativeFrom.PAGE,
          offset: 15 * 9525,
        },
        verticalPosition: {
          relative: VerticalPositionRelativeFrom.PAGE,
          offset: 15 * 9525,
        },
      },
      altText: { name: "Page frame", title: "", description: "" },
    }),
  );
  return result;
}
