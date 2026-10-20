/**
 * **Which tabs' boards are searching** (CTA-242): this tab's board engine
 * searching, told to every other tab, and theirs heard here — so the top
 * bar's Engine button breathes while an engine searches in any tab, not only
 * on this screen. One engine runs app-wide (CTA-237), so "a board searching
 * somewhere" is one yes / no every tab can show.
 *
 * A tab that searches says so on a `BroadcastChannel`
 * ({@link SEARCHING_TABS_CHANNEL}) — at once, again every
 * {@link SEARCHING_HEARTBEAT_MS} while it goes on, and "stopped" when it
 * stops or the page hides (`pagehide`: a tab closed, or left for another
 * page). A tab that goes quiet without a word — it crashed, was killed —
 * is forgotten {@link SEARCHING_EXPIRY_MS} after its last word: longer than
 * a minute, since a browser runs a long-hidden tab's timers once a minute at
 * most. A tab that opens asks, and every tab searching answers at once.
 *
 * The board-engine claim's channel (`lib/boardEngineClaim.ts`) treats any
 * message as a claim, so this one is beside it, not on it. Nothing at module
 * scope: the channel opens on the first use (the pre-render imports this
 * under Node); a browser without one keeps it to the tab.
 */

/** The channel the tabs tell each other on. */
export const SEARCHING_TABS_CHANNEL = "chessapp.engineSearching";

/** How often a searching tab says so again. */
export const SEARCHING_HEARTBEAT_MS = 20_000;

/** How long after a tab's last word it counts as searching — past a hidden tab's minute-long timer throttling. */
export const SEARCHING_EXPIRY_MS = 90_000;

/** What a tab says: it searches, it stopped — or, opening, it asks who searches. */
type SearchingMessage = { tab: string; searching: boolean } | { ask: true };

/** What a channel must do — `BroadcastChannel`'s part, so a test hands in its own. */
export type SearchingChannel = {
  /** Tell the other tabs. */
  postMessage: (message: unknown) => void;
  /** Hear the other tabs. */
  listen: (listener: (message: unknown) => void) => void;
};

export type SearchingTabs = {
  /** Whether this tab's board is searching — told to the other tabs. */
  setSearching: (searching: boolean) => void;
  /** Whether a board in another tab is searching. */
  othersSearching: () => boolean;
  /** Called when {@link othersSearching} may have changed. Opens the channel. */
  subscribe: (listener: () => void) => () => void;
};

export type SearchingTabsOptions = {
  /** The channel — `BroadcastChannel` by default; `undefined` keeps it to the tab. */
  openChannel?: () => SearchingChannel | undefined;
  /** Call the handler when the page goes away — `pagehide` by default. */
  onPageHide?: (handler: () => void) => void;
  /** The clock. */
  now?: () => number;
};

const defaultChannel = (): SearchingChannel | undefined => {
  if (typeof BroadcastChannel === "undefined") return undefined;
  const channel = new BroadcastChannel(SEARCHING_TABS_CHANNEL);
  // Node's channel would hold a test run open; a browser's has no `unref`.
  (channel as unknown as { unref?: () => void }).unref?.();
  return {
    postMessage: (message) => channel.postMessage(message),
    listen: (listener) => {
      channel.onmessage = (event: MessageEvent) => listener(event.data);
    },
  };
};

const defaultPageHide = (handler: () => void) => {
  if (typeof window !== "undefined") window.addEventListener("pagehide", handler);
};

/** A timer that does not hold Node open (a test run); a browser's is a number. */
const unref = (timer: ReturnType<typeof setTimeout>) => {
  (timer as unknown as { unref?: () => void }).unref?.();
  return timer;
};

const isMessage = (message: unknown): message is SearchingMessage => {
  if (typeof message !== "object" || message === null) return false;
  const m = message as Record<string, unknown>;
  return m.ask === true || (typeof m.tab === "string" && typeof m.searching === "boolean");
};

/** A tab of its own over its own channel — the page's is {@link searchingTabs}; a test makes two. */
export const createSearchingTabs = ({
  openChannel = defaultChannel,
  onPageHide = defaultPageHide,
  now = Date.now,
}: SearchingTabsOptions = {}): SearchingTabs => {
  const tab = `${now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let searching = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let channel: SearchingChannel | undefined;
  let opened = false;
  /** Each other tab searching, and when its word runs out. */
  const others = new Map<string, number>();
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  const say = (yes: boolean) => channel?.postMessage({ tab, searching: yes } satisfies SearchingMessage);

  /** Forget the tabs whose word ran out, and wake at the next one's end. */
  const prune = () => {
    if (expiry !== undefined) clearTimeout(expiry);
    expiry = undefined;
    const at = now();
    let changed = false;
    for (const [other, until] of others) {
      if (until <= at) {
        others.delete(other);
        changed = true;
      }
    }
    if (others.size > 0) {
      const next = Math.min(...others.values());
      expiry = unref(setTimeout(prune, next - at));
    }
    if (changed) emit();
  };

  const hear = (message: unknown) => {
    if (!isMessage(message)) return;
    if ("ask" in message) {
      if (searching) say(true);
      return;
    }
    const was = others.has(message.tab);
    if (message.searching) others.set(message.tab, now() + SEARCHING_EXPIRY_MS);
    else others.delete(message.tab);
    prune();
    if (was !== others.has(message.tab)) emit();
  };

  const open = () => {
    if (opened) return;
    opened = true;
    channel = openChannel();
    channel?.listen(hear);
    channel?.postMessage({ ask: true } satisfies SearchingMessage);
    onPageHide(() => {
      if (searching) say(false);
    });
  };

  return {
    setSearching: (next) => {
      if (next === searching) return;
      open();
      searching = next;
      if (heartbeat !== undefined) clearInterval(heartbeat);
      heartbeat = next ? unref(setInterval(() => say(true), SEARCHING_HEARTBEAT_MS)) : undefined;
      say(next);
    },
    othersSearching: () => others.size > 0,
    subscribe: (listener) => {
      open();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

let pageTabs: SearchingTabs | undefined;

/** **The page's** — made on the first call. */
export const searchingTabs = (): SearchingTabs => {
  pageTabs ??= createSearchingTabs();
  return pageTabs;
};
