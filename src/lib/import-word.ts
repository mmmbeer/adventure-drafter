import { normalizeWordHtml } from "./word-html";

/** Explicit mappings avoid merging adjacent paragraphs with the same style. */
export const wordStyleMap = [
  ...Array.from({ length: 9 }, (_, i) => {
    const level = i + 1;
    const target = `${level <= 6 ? `h${level}` : `div.heading-level-${level}`}:fresh`;
    return [
      `p[style-name='Heading ${level}'] => ${target}`,
      `p[style-name='heading ${level}'] => ${target}`,
      `p.Heading${level} => ${target}`,
    ];
  }).flat(),
  "p[style-name='Title'] => p.word-title:fresh",
  "p[style-name='Subtitle'] => p.word-subtitle:fresh",
  "p[style-name='Caption'] => p.word-caption:fresh",
  ...Array.from({ length: 9 }, (_, i) => [
    `p:unordered-list(${i + 1}) => ${"ul|ol > li > ".repeat(i)}ul > li:fresh`,
    `p:ordered-list(${i + 1}) => ${"ul|ol > li > ".repeat(i)}ol > li:fresh`,
  ]).flat(),
  "p[style-name='Normal'] => p:fresh",
  "p[style-name='Body Text'] => p:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
];

export async function readWordFile(file: File) {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      styleMap: wordStyleMap,
      includeDefaultStyleMap: true,
      externalFileAccess: false,
    },
  );
  // Convert non-HTML heading levels before removing Word's visual formatting.
  const html = result.value.replace(
    /<div class="heading-level-([789])">/g,
    '<div data-level="$1">',
  );
  return {
    html: normalizeWordHtml(html),
    warnings: result.messages.map((message) => message.message),
  };
}
