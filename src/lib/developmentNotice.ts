/**
 * **The in-development notice's dismissal** (CTA-155) — the one thing the app
 * keeps in `sessionStorage`: the notice opens on the first load of any route
 * and, once dismissed, stays closed for the rest of the browser session
 * (a reload, another screen, a change of language); a new tab or window is a
 * new session and shows it again. It is not the reader's data and not a
 * preference to carry between visits, so it is neither IndexedDB nor
 * `localStorage` ([`database.md`](../../.claude/rules/database.md) §2).
 *
 * Nothing here runs at module scope, so the pre-render imports it under Node.
 */
export const DEVELOPMENT_NOTICE_KEY = "chessapp.developmentNoticeDismissed";

const listeners = new Set<() => void>();

/** Where `sessionStorage` is refused (a locked-down browser) the dismissal lasts the page's life instead. */
let remembered = false;

const storage = (): Storage | undefined => {
  try {
    return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
};

/** Whether the notice was dismissed in this session. */
export const isDevelopmentNoticeDismissed = (): boolean => {
  if (remembered) return true;
  try {
    return storage()?.getItem(DEVELOPMENT_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
};

/** Dismisses the notice for the rest of the session, and tells every reader of it. */
export const dismissDevelopmentNotice = (): void => {
  try {
    storage()?.setItem(DEVELOPMENT_NOTICE_KEY, "1");
  } catch {
    remembered = true;
  }
  if (storage() === undefined) remembered = true;
  for (const listener of listeners) listener();
};

/** For `useSyncExternalStore`. */
export const subscribeToDevelopmentNotice = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Forgets the in-memory fallback — a test's reset. */
export const resetDevelopmentNotice = (): void => {
  remembered = false;
  for (const listener of listeners) listener();
};
