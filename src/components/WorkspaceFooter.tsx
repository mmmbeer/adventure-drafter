import { sizes, physicalPageCount } from "../lib/model";
import { useDesk } from "../state/context";
export function WorkspaceFooter() {
  const { doc, words } = useDesk();
  return (
    <footer className="app-footer">
      <span>
        <span className="green-dot" /> LOCAL-FIRST WORKSPACE
      </span>
      <span>
        {physicalPageCount(doc)} pages <i /> {words.toLocaleString()} words{" "}
        <i /> {sizes[doc.settings.size].label} <i /> {doc.settings.columns}{" "}
        columns
      </span>
      <span>Made for the stories you’ll tell.</span>
    </footer>
  );
}
