import { PaperColorPicker } from "../PaperColorPicker";
import { useInspector } from "./context";
export function BackgroundColor() {
  const { doc, setting } = useInspector();
  return (
    <PaperColorPicker
      label="Default background color"
      value={doc.settings.theme.paper}
      onChange={(paper) => setting("theme", { ...doc.settings.theme, paper })}
    />
  );
}
