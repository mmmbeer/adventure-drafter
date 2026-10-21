import type { pageDesign } from "../lib/designs";
import { useDesk } from "../state/context";
export function PageRunningText({
  design,
  position,
  isTitle,
  readOnly,
  onActivate,
}: {
  design: ReturnType<typeof pageDesign>;
  position: "header" | "footer";
  isTitle: boolean;
  readOnly: boolean;
  onActivate: () => void;
}) {
  const { openDialog } = useDesk();
  const edit = !readOnly && (
    <button
      type="button"
      className="running-edit-target no-print"
      aria-label={`Edit ${position} text`}
      title={`Edit ${position} and placeholders`}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
        openDialog("running-text");
      }}
    />
  );
  if (position === "header")
    return (
      <div
        className="running-header"
        style={design.hideHeader ? { display: "none" } : undefined}
      >
        <span>{design.header}</span>
        <span>{design.headerRight}</span>
        {edit}
      </div>
    );
  return (
    <footer className="page-footer">
      <span>{design.footer}</span>
      {!design.hideNumber && !isTitle && <b>{design.footerCenter}</b>}
      <span>{design.footerRight}</span>
      {edit}
    </footer>
  );
}
