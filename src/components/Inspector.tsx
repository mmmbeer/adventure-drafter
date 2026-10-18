import { Palette, Settings2, BookOpen, X, ScanSearch } from "lucide-react";
import {
  InspectorContext,
  useInspectorState,
  type InspectorProps,
} from "./inspector/context";
import { StylePanel } from "./inspector/StylePanel";
import { PagePanel } from "./inspector/PagePanel";
import { DocumentPanel } from "./inspector/DocumentPanel";
import { SelectionPanel } from "./inspector/SelectionPanel";
export function Inspector(props: InspectorProps) {
  const state = useInspectorState(props);
  const { tab, setTab, onClose } = state;
  return (
    <InspectorContext.Provider value={state}>
      <aside className="inspector">
        <div className="inspector-tabs">
          {[
            ["inspect", ScanSearch, "Inspect"],
            ["page", Settings2, "Page"],
            ["style", Palette, "Style"],
            ["document", BookOpen, "Document"],
          ].map(([id, Icon, label]) => {
            const I = Icon as typeof Palette;
            return (
              <button
                key={String(id)}
                className={tab === id ? "current" : ""}
                onClick={() => setTab(String(id))}
              >
                <I size={15} />
                {String(label)}
              </button>
            );
          })}
          <button
            aria-label="Close inspector"
            className="inspector-close"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
        {tab === "inspect" ? (
          <SelectionPanel />
        ) : tab === "page" ? (
          <PagePanel />
        ) : tab === "style" ? (
          <StylePanel />
        ) : (
          <DocumentPanel />
        )}
      </aside>
    </InspectorContext.Provider>
  );
}
