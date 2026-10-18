import { Loader2, X } from "lucide-react";
import { Toolbar } from "./components/Toolbar";
import { Inspector } from "./components/Inspector";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { PageNavigator } from "./components/PageNavigator";
import { PageCanvas } from "./components/PageCanvas";
import { WorkspaceFooter } from "./components/WorkspaceFooter";
import { FileInputs } from "./components/FileInputs";
import { WorkspaceDialogs } from "./components/WorkspaceDialogs";
import { useWorkspace } from "./state/useWorkspace";
import { WorkspaceContext } from "./state/context";
import "./style.css";
export default function App() {
  const desk = useWorkspace();
  const {
    doc,
    editor,
    tab,
    setTab,
    dialog,
    notice,
    setNotice,
    preview,
    rightOpen,
    setRightOpen,
    busy,
    fontInput,
    update,
    openDialog,
    activePage,
    splitPage,
    indexSelection,
    ready,
  } = desk;
  if (!ready)
    return (
      <div className="boot">
        <img className="boot-logo" src="/brand-mark.svg" alt="" aria-hidden="true" />
        <p>Opening your writing desk…</p>
      </div>
    );
  return (
    <WorkspaceContext.Provider value={desk}>
      <div className={`app ${preview ? "preview-mode" : ""}`}>
        <WorkspaceHeader />
        {!preview && (
          <Toolbar
            editor={editor}
            selection={desk.documentSelection}
            onDialog={openDialog}
            onInsertPage={splitPage}
            onIndex={indexSelection}
            customFonts={doc.fonts.map((f) => f.name)}
          />
        )}
        <div className="workspace">
          <PageNavigator />
          <PageCanvas />
          {rightOpen && !preview && (
            <Inspector
              doc={doc}
              page={activePage}
              editor={editor}
              selection={desk.documentSelection}
              tab={tab}
              setTab={setTab}
              update={update}
              onDialog={openDialog}
              onFont={() => fontInput.current?.click()}
              onClose={() => setRightOpen(false)}
            />
          )}
        </div>
        <WorkspaceFooter />

        <FileInputs />
        {dialog && <WorkspaceDialogs />}
        {busy && (
          <div className="busy-overlay" role="status" aria-live="polite">
            <Loader2 className="spin" size={25} />
            <b>{busy}</b>
            <span>Please keep this tab open.</span>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            <span>{notice}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}

