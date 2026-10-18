import { Feather, Plus, BookOpen, PanelRightClose } from "lucide-react";
import { PageEditor } from "./PageEditor";
import { useDesk } from "../state/context";
export function PageCanvas() {
  const {
    doc,
    zoom,
    setZoom,
    fit,
    setFit,
    preview,
    setPreview,
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    workspace,
    report,
    selectionChanged,
    replaceSelection,
    focus,
    register,
    change,
    overflow,
    reclaim,
    activePage,
    addPage,
  } = useDesk();
  return (
    <main className="desk" ref={workspace}>
      <div className="canvas-toolbar">
        <div>
          {(!leftOpen || preview) && (
            <button
              aria-label="Show pages"
              onClick={() => {
                setLeftOpen(true);
                setPreview(false);
              }}
            >
              <BookOpen size={16} />
            </button>
          )}
          <span>{preview ? "PRINT PREVIEW" : "WRITE ON THE PAGE"}</span>
          <span className="canvas-hint">
            {preview
              ? "Your adventure, ready for the table."
              : "Click anywhere on the paper to begin."}
          </span>
        </div>
        <div>
          <select
            aria-label="Page zoom"
            value={fit ? "fit" : zoom}
            onChange={(e) => {
              if (e.target.value === "fit") setFit(true);
              else {
                setFit(false);
                setZoom(+e.target.value);
              }
            }}
          >
            <option value="fit">Fit · {zoom}%</option>
            {[40, 50, 60, 75, 82, 100, 125, 150].map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
          <button
            aria-label={rightOpen ? "Hide inspector" : "Show inspector"}
            onClick={() => setRightOpen(!rightOpen)}
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>
      <div className="canvas" style={{ zoom: zoom / 100 }}>
        {doc.pages.map((p, i) => (
          <PageEditor
            key={`${doc.id}-${p.id}`}
            doc={doc}
            page={p}
            index={i}
            active={activePage.id === p.id && !preview}
            readOnly={preview}
            onFocus={focus}
            onChange={change}
            onOverflow={overflow}
            onReclaim={reclaim}
            register={register}
            report={report}
            onSelection={selectionChanged}
            onTextInput={replaceSelection}
          />
        ))}
      </div>
      <div className="end-mark">
        <Feather size={16} />
        <span>Every adventure begins with a blank page.</span>
        <button onClick={() => addPage("body")}>
          Keep writing <Plus size={13} />
        </button>
      </div>
    </main>
  );
}

