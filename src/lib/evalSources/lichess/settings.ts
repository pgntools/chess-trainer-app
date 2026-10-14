import { normalizeEngineServerUrl } from "../../engineServer";
import { clearEvalSourceBackOff } from "../backOff";
import type { EvalSourceConnection } from "../types";
import { checkLichessEvalApi } from "./api";

/**
 * **The lichess evaluation API's settings** (CTA-193; the app's, in Settings →
 * Engine, since CTA-196) — on or off, its address and whether the engine's
 * evals are sent to it:
 *
 * - **Off by default, and while off the app never contacts it.** On, every
 *   analysis search asks it first (`source.ts`, through the eval-source layer)
 *   — the boards' and Jobs V2's alike.
 * - **Write** — every engine search that finished at its target depth is sent
 *   to it (`POST /evals`, the API's write mode); what it answered never is.
 *
 * One `localStorage` key, {@link LICHESS_EVAL_API_STORAGE_KEY}, as JSON; a
 * storage that refuses the write keeps the change for this visit. **A reader
 * whose settings were the Jobs settings'** (`chessapp.jobsSettings`'s
 * `evalApi`, CTA-193) has them moved here on the first read — the new key
 * written, the old field taken out of the Jobs settings — so nobody's
 * configuration is lost. The API's status — `connecting`, `online`,
 * `offline` — is read, never stored, as the engine server's
 * (`lib/engineServer.ts`).
 *
 * Plain functions over a small subscription; nothing runs at import.
 */
export const LICHESS_EVAL_API_STORAGE_KEY = "chessapp.lichessEvalApi";

/** Where it lived before CTA-196 — the Jobs settings' `evalApi`, read once to move it here. */
const LEGACY_STORAGE_KEY = "chessapp.jobsSettings";

/** The eval source's id — the back-off's key. */
export const LICHESS_EVAL_SOURCE_ID = "lichess";

/** The API on the reader's own machine, at its default port — what the address field offers first. */
export const DEFAULT_LICHESS_EVAL_API_URL = "http://127.0.0.1:8000";

export type LichessEvalApiSettings = {
  /** Whether the reader turned it on. */
  enabled: boolean;
  /** Its address — kept while it is off, for the next time. */
  url: string;
  /** Whether the engine's evals are sent to it. */
  write: boolean;
};

export const DEFAULT_LICHESS_EVAL_API_SETTINGS: LichessEvalApiSettings = {
  enabled: false,
  url: DEFAULT_LICHESS_EVAL_API_URL,
  write: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Settings read leniently: what does not read is its default. */
export const lichessEvalApiSettingsFrom = (raw: unknown): LichessEvalApiSettings => {
  if (!isRecord(raw)) return DEFAULT_LICHESS_EVAL_API_SETTINGS;
  return {
    enabled: raw.enabled === true,
    url: (typeof raw.url === "string" ? normalizeEngineServerUrl(raw.url) : null) ?? DEFAULT_LICHESS_EVAL_API_URL,
    write: raw.write === true,
  };
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** The last stored text read, and what it reads as — the same object until the text changes (a `useSyncExternalStore` snapshot). */
let cached: { raw: string | null; settings: LichessEvalApiSettings } | undefined;
/** Held for the visit when storage refuses to be read or written. */
let remembered: LichessEvalApiSettings | undefined;

/**
 * **The move from the Jobs settings** (CTA-196): their `evalApi`, when there is
 * one and this key is not yet written — stored here, and taken out of them.
 * The text now stored here, or `null` when there was nothing to move.
 */
const migrated = (): string | null => {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(legacy);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.evalApi)) return null;
  const { evalApi, ...rest } = parsed;
  const raw = JSON.stringify(lichessEvalApiSettingsFrom(evalApi));
  try {
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, raw);
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // Storage refused: read it from where it was, and move it next time.
  }
  return raw;
};

/** The API's settings now. */
export const readLichessEvalApiSettings = (): LichessEvalApiSettings => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LICHESS_EVAL_API_STORAGE_KEY) ?? migrated();
  } catch {
    return remembered ?? DEFAULT_LICHESS_EVAL_API_SETTINGS;
  }
  if (cached?.raw !== raw) {
    let settings = DEFAULT_LICHESS_EVAL_API_SETTINGS;
    try {
      settings = raw === null ? DEFAULT_LICHESS_EVAL_API_SETTINGS : lichessEvalApiSettingsFrom(JSON.parse(raw));
    } catch {
      // Not JSON: the defaults.
    }
    cached = { raw, settings };
  }
  return cached.settings;
};

const write = (next: LichessEvalApiSettings) => {
  remembered = next;
  try {
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: it still applies to this visit.
  }
  // Changed settings are worth asking again at once.
  clearEvalSourceBackOff(LICHESS_EVAL_SOURCE_ID);
  notify();
};

/** The API's address while it is on — what a search asks — else `undefined`. */
export const lichessEvalApiUrl = (): string | undefined => {
  const settings = readLichessEvalApiSettings();
  return settings.enabled ? settings.url : undefined;
};

/** The API's address while it is on **and** writing is ticked — where the engine's evals go — else `undefined`. */
export const lichessEvalApiWriteUrl = (): string | undefined => {
  const settings = readLichessEvalApiSettings();
  return settings.enabled && settings.write ? settings.url : undefined;
};

/** Tick or untick sending the engine's evals to the API. */
export const storeLichessEvalApiWrite = (on: boolean): void => write({ ...readLichessEvalApiSettings(), write: on });

// --- The API's status, read never stored ---

type LichessEvalApiOfflineReason = "unreachable" | "not-an-eval-api";

export type LichessEvalApiStatus =
  | { state: "off" }
  | { state: "connecting"; url: string }
  | {
      state: "online";
      url: string;
      positions: number;
      /** Whether it was started in write mode (`--write`) — `POST /evals` refused otherwise. */
      writeEnabled: boolean;
      checkedAt: number;
      latencyMs: number;
    }
  | { state: "offline"; url: string; reason: LichessEvalApiOfflineReason };

let status: LichessEvalApiStatus = { state: "off" };
let attempt = 0;
let checkedOnce = false;

/** What is known of the API now. The same object until it changes. */
export const lichessEvalApiStatus = (): LichessEvalApiStatus => status;

const setStatus = (next: LichessEvalApiStatus) => {
  status = next;
  notify();
};

/**
 * Its connection at a glance (CTA-199, the dot on its tab): off — `disabled`;
 * on and answering — `connected`; on otherwise (checking, not answering, not
 * checked yet) — `not-connected`.
 */
export const lichessEvalApiConnection = (): EvalSourceConnection =>
  lichessEvalApiUrl() === undefined ? "disabled" : status.state === "online" ? "connected" : "not-connected";

/** Check the API (`GET /health`), now. Resolves once the status is known again. */
export const connectLichessEvalApi = async (): Promise<void> => {
  checkedOnce = true;
  const url = lichessEvalApiUrl();
  const mine = ++attempt;
  if (url === undefined) {
    if (status.state !== "off") setStatus({ state: "off" });
    return;
  }
  if (!(status.state === "online" && status.url === url)) setStatus({ state: "connecting", url });
  const health = await checkLichessEvalApi(url);
  if (mine !== attempt) return; // a newer check answers instead
  setStatus(
    health.ok
      ? { state: "online", url, positions: health.positions, writeEnabled: health.writeEnabled, checkedAt: Date.now(), latencyMs: health.latencyMs }
      : { state: "offline", url, reason: health.reason },
  );
};

/** The first check, once the settings show the API on — call it from an effect. */
export const ensureLichessEvalApiChecked = (): void => {
  if (!checkedOnce) void connectLichessEvalApi();
};

/**
 * Turn the API on or off, and at an address (absent: the one kept), then
 * check it. Resolves when the check has answered — Connect's feedback waits on it.
 */
export const storeLichessEvalApi = (enabled: boolean, url?: string): Promise<void> => {
  const settings = readLichessEvalApiSettings();
  write({ ...settings, enabled, url: (url === undefined ? null : normalizeEngineServerUrl(url)) ?? settings.url });
  return connectLichessEvalApi();
};

/** **For tests**: forget this visit's settings and the API's status — the teardown's, beside clearing `localStorage`. */
export const resetLichessEvalApiSettings = (): void => {
  cached = undefined;
  remembered = undefined;
  status = { state: "off" };
  attempt += 1;
  checkedOnce = false;
};

/**
 * Call `listener` when the settings or the API's status may have changed —
 * this tab's change, or another tab's (`storage`).
 */
export const subscribeLichessEvalApi = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === LICHESS_EVAL_API_STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};
