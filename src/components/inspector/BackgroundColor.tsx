import { useInspector } from "./context";

export function BackgroundColor() {
  const { doc, setting } = useInspector();
  return (
    <label>
      Default background color
      <input
        aria-label="Default background color"
        type="color"
        value={doc.settings.theme.paper}
        onChange={(e) =>
          setting("theme", { ...doc.settings.theme, paper: e.target.value })
        }
      />
    </label>
  );
}
