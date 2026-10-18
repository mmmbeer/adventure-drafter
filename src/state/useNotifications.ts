import { useCallback, useRef, useState } from "react";
export function useNotifications() {
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const report = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 8000);
  }, []);
  return { notice, setNotice, noticeTimer, report };
}
