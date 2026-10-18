import { DialogActions } from "../Modal";
import { useDesk } from "../../state/context";
export function ImportReportDialog() {
  const { setDialog, warnings } = useDesk();
  return (
    <>
      <p>
        Your adventure is imported. Review these conversion notes before
        publishing.
      </p>
      <ul>
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>

      <DialogActions>
        <button className="primary" onClick={() => setDialog("")}>
          Review the pages
        </button>
      </DialogActions>
    </>
  );
}
