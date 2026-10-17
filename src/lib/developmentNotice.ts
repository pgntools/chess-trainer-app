/**
 * **The in-development notice's dismissal** (CTA-155, a month since CTA-210) —
 * kept in `localStorage` as the time it was dismissed (epoch milliseconds): the
 * notice opens on the first load of any route and, once dismissed, stays closed
 * for {@link DEVELOPMENT_NOTICE_DISMISSAL_MS} — in every tab and window, after a
 * restart — then opens again on the next load, and a new dismissal starts a new
 * month. A missing, unreadable or future-dated value is not a dismissal, and the
 * `"1"` the notice once kept in `sessionStorage` is not read at all
 * ([`database.md`](../../.claude/rules/database.md) §2).
 *
 * Nothing here runs at module scope, so the pre-render imports it under Node.
 */
export const DEVELOPMENT_NOTICE_KEY = "chessapp.developmentNoticeDismissed";

/** How long a dismissal keeps the notice closed: 30 days. */
export const DEVELOPMENT_NOTICE_DISMISSAL_MS = 30 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

/** Where `localStorage` is refused (a locked-down browser) the dismissal lasts the page's life instead. */
let remembered = false;

const storage = (): Storage | undefined => {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

/** When the notice was last dismissed, if the stored value reads as a time. */
const dismissedAt = (): number | undefined => {
  try {
    const value = storage()?.getItem(DEVELOPMENT_NOTICE_KEY);
    if (value == null || !/^\d+$/.test(value)) return undefined;
    const at = Number(value);
    return Number.isSafeInteger(at) ? at : undefined;
  } catch {
    return undefined;
  }
};

/** Whether the notice was dismissed less than {@link DEVELOPMENT_NOTICE_DISMISSAL_MS} ago. */
export const isDevelopmentNoticeDismissed = (): boolean => {
  if (remembered) return true;
  const at = dismissedAt();
  if (at === undefined) return false;
  const elapsed = Date.now() - at;
  return elapsed >= 0 && elapsed < DEVELOPMENT_NOTICE_DISMISSAL_MS;
};

/** Dismisses the notice for the next 30 days, and tells every reader of it. */
export const dismissDevelopmentNotice = (): void => {
  const local = storage();
  if (local === undefined) remembered = true;
  else {
    try {
      local.setItem(DEVELOPMENT_NOTICE_KEY, String(Date.now()));
    } catch {
      remembered = true;
    }
  }
  for (const listener of listeners) listener();
};

/**
 * For `useSyncExternalStore` — woken by a dismissal in this page, and by the
 * window's `storage` event, so a dismissal in another tab closes the notice here.
 */
export const subscribeToDevelopmentNotice = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    // A `null` key is the other tab's `localStorage.clear()`.
    if (event.key === DEVELOPMENT_NOTICE_KEY || event.key === null) listener();
  };
  const target = typeof window === "undefined" ? undefined : window;
  target?.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    target?.removeEventListener("storage", onStorage);
  };
};

/** Forgets the in-memory fallback — a test's reset. */
export const resetDevelopmentNotice = (): void => {
  remembered = false;
  for (const listener of listeners) listener();
};
