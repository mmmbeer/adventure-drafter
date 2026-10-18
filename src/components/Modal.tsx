import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
const ActionTarget = createContext<HTMLElement | null>(null);
/** Feature actions are rendered into the shared pinned footer. */
export function DialogActions({ children }: { children: ReactNode }) {
  const target = useContext(ActionTarget);
  return target ? createPortal(children, target) : null;
}
export function Modal({
  title,
  children,
  onClose,
  size = "normal",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "small" | "normal" | "wide";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      (previous as HTMLElement)?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal modal-${size}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <ActionTarget.Provider value={target}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
        <footer className="modal-footer">
          <div className="dialog-actions" ref={setTarget} />
          <button className="cancel-action" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </ActionTarget.Provider>
    </dialog>
  );
}
