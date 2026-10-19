import { identifyDocument } from "../lib/anchors";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  createAdventure,
  validateAdventure,
  type Adventure,
} from "../lib/model";
import { loadLast, saveDocument } from "../lib/storage";
import { installFonts } from "../lib/fonts";
export function useLocalDraft(
  report: (message: string) => void,
  onLoaded: (id: string) => void,
) {
  const [doc, setDoc] = useState<Adventure>(() =>
    identifyDocument(createAdventure()),
  );
  const docRef = useRef(doc);
  docRef.current = doc;
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Opening…");
  const savePending = useRef(false);
  const update = useCallback((fn: (d: Adventure) => Adventure) => {
    setDoc((d) => ({
      ...identifyDocument(fn(d)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  useEffect(() => {
    loadLast()
      .then(async (saved) => {
        if (saved) {
          const valid = validateAdventure(saved);
          await installFonts(valid.fonts);
          setDoc(valid);
          onLoaded(valid.pages[0].id);
        }
        if (!saved) onLoaded(docRef.current.pages[0].id);
        setReady(true);
      })
      .catch((e) => {
        setReady(true);
        report(
          `Local storage could not be opened: ${e.message}. Download project backups while you work.`,
        );
      });
  }, []);
  useEffect(() => {
    if (!ready) return;
    setStatus("Saving…");
    savePending.current = true;
    const timer = setTimeout(
      () =>
        saveDocument(doc)
          .then(() => {
            savePending.current = false;
            setStatus("Saved on this device");
          })
          .catch(() => {
            setStatus("Save failed");
            report(
              "Local save failed. Storage may be full. Download a project backup now.",
            );
          }),
      500,
    );
    return () => clearTimeout(timer);
  }, [doc, ready]);
  useEffect(() => {
    const flush = () => {
      if (document.hidden && savePending.current)
        saveDocument(docRef.current).catch(() => {});
    };
    const leave = (e: BeforeUnloadEvent) => {
      if (savePending.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", leave);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  return {
    doc,
    setDoc,
    docRef,
    ready,
    setReady,
    status,
    setStatus,
    savePending,
    update,
  };
}
