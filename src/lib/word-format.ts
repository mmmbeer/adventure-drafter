import { BorderStyle, type IBorderOptions } from "docx";

/** Convert resolved browser colors, compositing transparent fills onto the paper. */
export function wordColor(
  value: string,
  paper = "#ffffff",
): string | undefined {
  if (!value || value === "transparent") return undefined;
  if (/^#[\da-f]{6}$/i.test(value)) return value.slice(1).toUpperCase();
  if (/^#[\da-f]{3}$/i.test(value))
    return value
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase();
  const numbers = value.match(/[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 3) return undefined;
  const rgb = numbers
    .slice(0, 3)
    .map((n) => (value.startsWith("color(") ? n * 255 : n));
  const alpha = numbers[3] ?? 1;
  if (alpha === 0) return undefined;
  const base = wordColor(paper) || "FFFFFF";
  return rgb
    .map((n, i) =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(
            n * alpha +
              parseInt(base.slice(i * 2, i * 2 + 2), 16) * (1 - alpha),
          ),
        ),
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}
export const twips = (px: string | number) =>
  Math.round((parseFloat(String(px)) || 0) * 15);
export const wordSize = (px: string | number): `${number}pt` =>
  `${(parseFloat(String(px)) || 0) * 0.75}pt`;
export const wordFont = (family: string) =>
  family
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "");

export function wordBorders(css: CSSStyleDeclaration, paper: string) {
  const borders: Record<string, IBorderOptions> = {};
  for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
    const style = css[`border${side}Style`];
    const width = parseFloat(css[`border${side}Width`]);
    if (!width || style === "none" || style === "hidden") continue;
    borders[side.toLowerCase()] = {
      style:
        (
          {
            dashed: BorderStyle.DASHED,
            dotted: BorderStyle.DOTTED,
            double: BorderStyle.DOUBLE,
          } as Record<string, (typeof BorderStyle)[keyof typeof BorderStyle]>
        )[style] || BorderStyle.SINGLE,
      size: Math.round(width * 6),
      color: wordColor(css[`border${side}Color`], paper),
      space: Math.round((parseFloat(css[`padding${side}`]) || 0) * 0.75),
    };
  }
  return Object.keys(borders).length ? borders : undefined;
}
export function wordFill(css: CSSStyleDeclaration, paper: string) {
  const fill = wordColor(css.backgroundColor, paper);
  return fill ? { fill } : undefined;
}
