import { useState } from "react";
import { DialogActions } from "../Modal";
import { useDesk } from "../../state/context";
export function LinkDialog() {
  const [error, setError] = useState("");
  const { editor, setDialog, link, setLink } = useDesk();
  return (
    <>
      <label>
        Link URL
        <input
          autoFocus
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setError("");
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "link-error" : undefined}
          placeholder="https://… or #page-id"
        />
      </label>
      {error && (
        <p className="field-error" id="link-error" role="alert">
          {error}
        </p>
      )}
      <DialogActions>
        <button
          className="primary"
          onClick={() => {
            if (!/^(https?:\/\/|mailto:|#)/i.test(link)) {
              setError("Use an https://, mailto: or #anchor link.");
              return;
            }
            editor
              ?.chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: link })
              .run();
            setDialog("");
          }}
        >
          Apply link
        </button>
        <button
          onClick={() => {
            editor?.chain().focus().unsetLink().run();
            setDialog("");
          }}
        >
          Remove link
        </button>
      </DialogActions>
    </>
  );
}
