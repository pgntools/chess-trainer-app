import { hostedEnginesFrom, type HostedEngineInfo } from "./hostedEngine";

/**
 * **The engine server** — native Stockfish binaries on the reader's own
 * computer (`yarn api:start`, [`server/engine-api/README.md`](../../server/engine-api/README.md)),
 * whose engines join the list in Settings → Engine ([`docs/engine.md`](../../docs/engine.md) §8).
 *
 * - **Off unless the reader turns it on.** The address is a preference in
 *   `localStorage` (`chessapp.engineServer`), absent by default — so the app
 *   never reaches for `127.0.0.1` on its own: a deployed site that did would
 *   probe every visitor's machine (and Chrome would ask each of them for
 *   local-network access). The pre-render reads nothing and asks nothing.
 * - **Its status is read, never stored**: `connecting`, `online` with the
 *   engines `GET /v1/engines` lists, when it answered and how fast, or
 *   `offline` with the reason. The first
 *   check runs when a board or the Engine tab first asks
 *   ({@link ensureEngineServerChecked}, from an effect); another on a new
 *   address, on Retry, and when a hosted engine's request fails
 *   ({@link reportEngineServerFailure}) — **keeping its engines listed while
 *   it re-checks**, so a hiccup does not swap every board's engine twice.
 * - The registry turns `online`'s engines into descriptors
 *   (`lib/engines/hosted.ts`); offline, they are gone and a choice of one
 *   reads as the default — and stays stored, like any choice that cannot run
 *   here (`lib/engineChoice.ts`), so it returns with the server.
 *
 * Plain functions over a small subscription, like `engineChoice.ts`.
 */
export const ENGINE_SERVER_STORAGE_KEY = "chessapp.engineServer";

/** Where `yarn api:start` serves — what the field offers first. */
export const DEFAULT_ENGINE_SERVER_URL = "http://127.0.0.1:8800";

/** How long a check waits for the server's list before calling it unreachable. */
export const ENGINE_SERVER_TIMEOUT_MS = 5000;

export type EngineServerOfflineReason = "unreachable" | "not-an-engine-server";

export type EngineServerStatus =
  | { state: "off" }
  | { state: "connecting"; url: string }
  | {
      state: "online";
      url: string;
      engines: readonly HostedEngineInfo[];
      /** When the check answered (ms since the epoch). */
      checkedAt: number;
      /** How long it took to answer — the round trip of `GET /v1/engines`, in ms. */
      latencyMs: number;
    }
  | { state: "offline"; url: string; reason: EngineServerOfflineReason };

/**
 * The address as the app keeps it — `http(s)://host[:port][/path]`, no query,
 * no fragment, no trailing slash — or `null` for text that is not one.
 */
export const normalizeEngineServerUrl = (text: string): string | null => {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
  if (url.search || url.hash) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Held for the visit when storage refuses the write. `null`: turned off this visit. */
let remembered: string | null | undefined;

/** The stored address, or `undefined` while the reader has not turned the server on. */
export const readEngineServerUrl = (): string | undefined => {
  try {
    const stored = localStorage.getItem(ENGINE_SERVER_STORAGE_KEY);
    return (stored === null ? undefined : normalizeEngineServerUrl(stored)) ?? undefined;
  } catch {
    return remembered ?? undefined;
  }
};

let status: EngineServerStatus = { state: "off" };
let checkedOnce = false;
let attempt = 0;

const setStatus = (next: EngineServerStatus) => {
  status = next;
  notify();
};

/** What is known of the server now. The same object until it changes — a `useSyncExternalStore` snapshot. */
export const engineServerStatus = (): EngineServerStatus => status;

/** Ask the server for its engines, now. Resolves once the status is known again. */
export const connectEngineServer = async (): Promise<void> => {
  checkedOnce = true;
  const url = readEngineServerUrl();
  const mine = ++attempt;
  if (url === undefined) {
    if (status.state !== "off") setStatus({ state: "off" });
    return;
  }
  // Online at this address: stay listed while re-checking.
  if (!(status.state === "online" && status.url === url)) setStatus({ state: "connecting", url });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENGINE_SERVER_TIMEOUT_MS);
  let next: EngineServerStatus;
  try {
    const sent = performance.now();
    const response = await fetch(`${url}/v1/engines`, { signal: controller.signal });
    const engines = response.ok ? hostedEnginesFrom(await response.json().catch(() => null)) : null;
    const latencyMs = Math.round(performance.now() - sent);
    next = engines
      ? { state: "online", url, engines, checkedAt: Date.now(), latencyMs }
      : { state: "offline", url, reason: "not-an-engine-server" };
  } catch {
    next = { state: "offline", url, reason: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
  if (mine !== attempt) return; // a newer check (a new address) answers instead
  // Every check is news (its time, which Connect shows); the same engines keep their descriptors (`hosted.ts`).
  setStatus(next);
};

/** The first check, once a board or the Engine tab wants to know — call it from an effect. */
export const ensureEngineServerChecked = (): void => {
  if (!checkedOnce) void connectEngineServer();
};

/** A hosted engine's request failed: check whether the server is still there. */
export const reportEngineServerFailure = (): void => {
  if (status.state === "online") void connectEngineServer();
};

/**
 * Turn the server on at `url`, or off (`undefined`), and check it at once. A
 * storage that refuses the write keeps it for this visit. Resolves when the
 * check has answered — Connect's own feedback waits on it.
 */
export const storeEngineServerUrl = (url: string | undefined): Promise<void> => {
  const normalized = url === undefined ? undefined : (normalizeEngineServerUrl(url) ?? undefined);
  remembered = normalized ?? null;
  try {
    if (normalized === undefined) localStorage.removeItem(ENGINE_SERVER_STORAGE_KEY);
    else localStorage.setItem(ENGINE_SERVER_STORAGE_KEY, normalized);
  } catch {
    // Private mode or a full quota: it still applies to this visit.
  }
  return connectEngineServer();
};

/**
 * Call `listener` when the status may have changed — this tab's check, or
 * another tab's change of the address (`storage`, which also re-checks).
 */
export const subscribeEngineServer = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ENGINE_SERVER_STORAGE_KEY) void connectEngineServer();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};
