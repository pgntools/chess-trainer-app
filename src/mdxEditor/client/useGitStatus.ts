import { useSyncExternalStore } from "react";

import { readGitStatus, type GitStatus } from "./storageClient";

/**
 * **The articles folder's git status, kept fresh and shared** (CTA-137) —
 * one store for the editor and the sidebar's marks: read when the first
 * reader arrives, whenever the window comes back into focus (a commit made
 * in a terminal), and on `refreshGitStatus()` (after the editor writes a
 * file), every reader seeing the same answer. `undefined` until the first
 * read lands.
 */

let status: GitStatus | undefined;
const listeners = new Set<() => void>();

/** Ask the service again; every reader hears the answer. */
export const refreshGitStatus = (): void => {
  void readGitStatus().then((next) => {
    status = next;
    for (const listener of listeners) listener();
  });
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    refreshGitStatus();
    window.addEventListener("focus", refreshGitStatus);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("focus", refreshGitStatus);
  };
};

export const useGitStatus = (): { status: GitStatus | undefined; refresh: () => void } => ({
  status: useSyncExternalStore(subscribe, () => status),
  refresh: refreshGitStatus,
});
