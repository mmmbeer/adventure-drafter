export const paperColors = [
  { name: "White", color: "#ffffff" },
  { name: "Beige", color: "#f3ead8" },
  { name: "Parchment", color: "#f7f1df" },
  { name: "Light gray", color: "#f0f1f2" },
  { name: "Ivory", color: "#fffdf5" },
  { name: "Mist blue", color: "#f0f6fa" },
  { name: "Soft sage", color: "#eef7f2" },
  { name: "Blush", color: "#fff4f2" },
];
export const validPaperColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
