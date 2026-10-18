import "@fontsource/alegreya/latin-400.css";
import "@fontsource/alegreya/latin-400-italic.css";
import "@fontsource/alegreya/latin-700.css";
import "@fontsource/cinzel/latin-400.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/eb-garamond/latin-400.css";
import "@fontsource/crimson-pro/latin-400.css";
import "@fontsource/spectral/latin-400.css";
import "@fontsource/libre-baskerville/latin-400.css";
import "@fontsource/lora/latin-400.css";
import "@fontsource/vollkorn/latin-400.css";
import "@fontsource/cardo/latin-400.css";
import "@fontsource/almendra/latin-400.css";
import "@fontsource/im-fell-english/latin-400.css";
import "@fontsource/uncial-antiqua/latin-400.css";
import "@fontsource/pirata-one/latin-400.css";
import "@fontsource/fondamento/latin-400.css";
import "@fontsource/medievalsharp/latin-400.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/oswald/latin-400.css";
export const fonts = [
  "Alegreya",
  "Cinzel",
  "Cormorant Garamond",
  "EB Garamond",
  "Crimson Pro",
  "Spectral",
  "Libre Baskerville",
  "Lora",
  "Vollkorn",
  "Cardo",
  "Almendra",
  "IM FELL English",
  "Uncial Antiqua",
  "Pirata One",
  "Fondamento",
  "MedievalSharp",
  "Space Grotesk",
  "Inter",
  "JetBrains Mono",
  "Oswald",
  "Georgia",
  "Arial",
  "Times New Roman",
  "Courier New",
];
export async function dataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsDataURL(file);
  });
}
export async function installFonts(custom: { name: string; data: string }[]) {
  for (const font of custom) {
    const face = new FontFace(font.name, `url(${font.data})`);
    await face.load();
    document.fonts.add(face);
  }
  await document.fonts.ready;
}
