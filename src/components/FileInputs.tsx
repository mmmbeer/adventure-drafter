import { useDesk } from "../state/context";
export function FileInputs() {
  const {
    fileInput,
    imageInput,
    fontInput,
    importAdventure,
    imageFile,
    addFont,
  } = useDesk();
  return (
    <>
      <input
        hidden
        ref={fileInput}
        type="file"
        accept=".json,.adventure,.md,.markdown,.txt,.brew,.homebrewery,.docx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importAdventure(f);
        }}
      />
      <input
        hidden
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={imageFile}
      />
      <input
        hidden
        ref={fontInput}
        type="file"
        accept=".woff,.woff2,.ttf,.otf"
        onChange={addFont}
      />
    </>
  );
}
