import { useCallback, useEffect, useState } from "react";

import { readGitStatus, type GitStatus } from "./storageClient";

/**
 * **The articles folder's git status, kept fresh** (CTA-137) — read on
 * arrival, whenever the window comes back into focus (a commit made in a
 * terminal), and on `refresh()` (after the editor writes a file).
 * `undefined` until the first read lands.
 */
export const useGitStatus = (): { status: GitStatus | undefined; refresh: () => void } => {
  const [status, setStatus] = useState<GitStatus>();
  const refresh = useCallback(() => {
    void readGitStatus().then(setStatus);
  }, []);
  useEffect(() => {
    let live = true;
    const read = () => void readGitStatus().then((next) => live && setStatus(next));
    read();
    window.addEventListener("focus", read);
    return () => {
      live = false;
      window.removeEventListener("focus", read);
    };
  }, []);
  return { status, refresh };
};
