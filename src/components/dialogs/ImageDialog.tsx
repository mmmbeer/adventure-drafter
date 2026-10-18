import { useState } from "react";
import { DialogActions } from "../Modal";
import { Upload } from "lucide-react";
import { useDesk } from "../../state/context";
export function ImageDialog() {
  const [error, setError] = useState("");
  const {
    dialog,
    busy,
    setBusy,
    imageUrl,
    setImageUrl,
    alt,
    setAlt,
    caption,
    setCaption,
    imageFlow,
    setImageFlow,
    imageWidth,
    setImageWidth,
    imageInput,
    addImage,
  } = useDesk();
  return (
    <>
      <p>
        {dialog === "background"
          ? "Place art behind this page. Adjust its opacity in the Page panel."
          : "Upload, paste or link an illustration. Images are embedded in your saved project."}
      </p>

      <label>
        Image URL
        <input
          type="url"
          placeholder="https://example.com/map.png"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setError("");
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "image-url-error" : undefined}
        />
      </label>
      {error && (
        <p className="field-error" id="image-url-error" role="alert">
          {error}
        </p>
      )}
      {dialog === "image" && (
        <>
          <label>
            Alternative text
            <input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </label>
          <label>
            Caption (optional)
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          <div className="field-pair">
            <label>
              Width · {imageWidth}%
              <input
                type="range"
                min="10"
                max="100"
                value={imageWidth}
                onChange={(e) => setImageWidth(+e.target.value)}
              />
            </label>
            <label>
              Text flow
              <select
                value={imageFlow}
                onChange={(e) => setImageFlow(e.target.value)}
              >
                <option value="block">Separate block</option>
                <option value="left">Wrap on right</option>
                <option value="right">Wrap on left</option>
              </select>
            </label>
          </div>
        </>
      )}

      <p className="help">
        PNG, JPEG, WebP and GIF. Up to 15 MB per image. You can also paste
        images directly onto a writing page.
      </p>
      <DialogActions>
        <button
          className="wide-button"
          onClick={() => imageInput.current?.click()}
        >
          <Upload size={17} /> Upload image
        </button>
        <button
          className="primary"
          disabled={!imageUrl || !!busy}
          onClick={async () => {
            setBusy("Loading image…");
            try {
              await addImage(imageUrl);
            } catch (e) {
              setError(
                `${(e as Error).message} Upload the image if the host blocks cross-origin access.`,
              );
            } finally {
              setBusy("");
            }
          }}
        >
          Add from URL
        </button>
      </DialogActions>
    </>
  );
}
