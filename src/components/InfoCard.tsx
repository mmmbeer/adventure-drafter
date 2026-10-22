import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Info } from "lucide-react";

/** Shared non-modal information card: hover/focus to read, click/tap to keep open. */
export function InfoCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimer = () => clearTimeout(timer.current);
  const dismiss = () => {
    clearTimer();
    pinned.current = false;
    setOpen(false);
  };
  const show = () => {
    clearTimer();
    if (!open)
      document.dispatchEvent(new CustomEvent("info-card-open", { detail: id }));
    setOpen(true);
  };
  const closeSoon = () => {
    clearTimer();
    timer.current = setTimeout(() => {
      if (!pinned.current && !root.current?.contains(document.activeElement))
        setOpen(false);
    }, 140);
  };
  useEffect(() => {
    const otherCard = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) dismiss();
    };
    document.addEventListener("info-card-open", otherCard);
    return () => {
      clearTimer();
      document.removeEventListener("info-card-open", otherCard);
    };
  }, [id]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Close the information card before the containing modal handles Escape.
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    const card = panel.current!;
    if (!open) return;
    // The top layer prevents clipping by a scrollable modal body. Keep the card
    // inside the modal's DOM so its controls and text remain accessible.
    card.showPopover?.();
    const position = () => {
      const anchor = trigger.current!.getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      const margin = 12;
      const left = Math.max(
        margin,
        Math.min(
          anchor.right - bounds.width,
          window.innerWidth - bounds.width - margin,
        ),
      );
      const below = anchor.bottom + 8;
      const top =
        below + bounds.height <= window.innerHeight - margin
          ? below
          : Math.max(margin, anchor.top - bounds.height - 8);
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    };
    position();
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    return () => {
      card.hidePopover?.();
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
    };
  }, [open]);
  return (
    <span
      className="info-card"
      ref={root}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") show();
      }}
      onPointerLeave={closeSoon}
      onFocus={show}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
    >
      <button
        type="button"
        className="info-card-trigger"
        ref={trigger}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          if (pinned.current) dismiss();
          else {
            pinned.current = true;
            show();
          }
        }}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      <div
        className="info-card-panel"
        ref={panel}
        id={id}
        role="tooltip"
        popover="manual"
        data-open={open}
        aria-label={label}
      >
        <b>{label}</b>
        {children}
      </div>
    </span>
  );
}
