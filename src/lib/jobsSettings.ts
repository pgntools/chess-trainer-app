import { checkLichessEvalApi } from "./lichessEvalApi";
import { normalizeEngineServerUrl } from "./engineServer";

/**
 * **The Jobs settings** (CTA-193) — Jobs V2's own preferences, set on the
 * Jobs V2 view's Settings tab (`/analysis/jobs?tab=settings`):
 *
 * - **The default engine and preset for new jobs** — one pair, or `null`
 *   (the board's engine and that engine's selected preset, as before). A pair
 *   whose engine or preset is gone reads as `null` where it is used (New Job
 *   V2), and stays stored.
 * - **The lichess evaluation API** (`lib/lichessEvalApi.ts`) — on or off and
 *   its address. **Off by default, and while off the app never contacts it.**
 *   On, a job asks it about each position before the engine — and, with
 *   **write** ticked too, sends it what the engine found for each position
 *   it searched (`POST /evals`, the API's write mode).
 *
 * One `localStorage` key, {@link JOBS_SETTINGS_STORAGE_KEY}, as JSON; a
 * storage that refuses the write keeps the change for this visit. The API's
 * status — `connecting`, `online`, `offline` — is read, never stored, as the
 * engine server's (`lib/engineServer.ts`); and the runner's word that it did
 * not answer during a job is a signal the shell turns into a warning
 * ({@link reportLichessEvalUnreachable}).
 *
 * Plain functions over a small subscription; nothing runs at import.
 */
export const JOBS_SETTINGS_STORAGE_KEY = "chessapp.jobsSettings";

/** Where the API is served on the reader's network today — what the address field offers first. */
export const DEFAULT_LICHESS_EVAL_API_URL = "http://10.0.0.3:8000";

/** The engine and preset a new job starts with. */
export type JobsDefaultPreset = { engineId: string; presetId: string };

export type JobsSettings = {
  /** `null`: the board's engine and its selected preset. */
  defaultPreset: JobsDefaultPreset | null;
  /**
   * The lichess evaluation API — on or off, its address (kept while off, for
   * the next time), and whether a job sends it the engine's evals (`write`).
   */
  evalApi: { enabled: boolean; url: string; write: boolean };
};

export const DEFAULT_JOBS_SETTINGS: JobsSettings = {
  defaultPreset: null,
  evalApi: { enabled: false, url: DEFAULT_LICHESS_EVAL_API_URL, write: false },
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isName = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/** Settings read leniently: what does not read is its default. */
export const jobsSettingsFrom = (raw: unknown): JobsSettings => {
  if (!isRecord(raw)) return DEFAULT_JOBS_SETTINGS;
  const preset = raw.defaultPreset;
  const api = isRecord(raw.evalApi) ? raw.evalApi : {};
  return {
    defaultPreset: isRecord(preset) && isName(preset.engineId) && isName(preset.presetId) ? { engineId: preset.engineId, presetId: preset.presetId } : null,
    evalApi: {
      enabled: api.enabled === true,
      url: (typeof api.url === "string" ? normalizeEngineServerUrl(api.url) : null) ?? DEFAULT_LICHESS_EVAL_API_URL,
      write: api.write === true,
    },
  };
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** The last stored text read, and what it reads as — the same object until the text changes (a `useSyncExternalStore` snapshot). */
let cached: { raw: string | null; settings: JobsSettings } | undefined;
/** Held for the visit when storage refuses to be read or written. */
let remembered: JobsSettings | undefined;

/** The Jobs settings now. */
export const readJobsSettings = (): JobsSettings => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY);
  } catch {
    return remembered ?? DEFAULT_JOBS_SETTINGS;
  }
  if (cached?.raw !== raw) {
    let settings = DEFAULT_JOBS_SETTINGS;
    try {
      settings = raw === null ? DEFAULT_JOBS_SETTINGS : jobsSettingsFrom(JSON.parse(raw));
    } catch {
      // Not JSON: the defaults.
    }
    cached = { raw, settings };
  }
  return cached.settings;
};

const write = (next: JobsSettings) => {
  remembered = next;
  try {
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: it still applies to this visit.
  }
  notify();
};

/** Set the default engine and preset for new jobs — `null` for the board's. */
export const storeJobsDefaultPreset = (defaultPreset: JobsDefaultPreset | null): void =>
  write({ ...readJobsSettings(), defaultPreset });

/** The API's address while it is on — what a job asks — else `undefined`. */
export const lichessEvalApiUrl = (): string | undefined => {
  const { evalApi } = readJobsSettings();
  return evalApi.enabled ? evalApi.url : undefined;
};

/** The API's address while it is on **and** writing is ticked — where a job sends the engine's evals — else `undefined`. */
export const lichessEvalApiWriteUrl = (): string | undefined => {
  const { evalApi } = readJobsSettings();
  return evalApi.enabled && evalApi.write ? evalApi.url : undefined;
};

/** Tick or untick sending the engine's evals to the API. */
export const storeLichessEvalApiWrite = (on: boolean): void => {
  const settings = readJobsSettings();
  write({ ...settings, evalApi: { ...settings.evalApi, write: on } });
};

// --- The API's status, read never stored ---

export type LichessEvalApiOfflineReason = "unreachable" | "not-an-eval-api";

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

/** The first check, once the Settings tab shows the API on — call it from an effect. */
export const ensureLichessEvalApiChecked = (): void => {
  if (!checkedOnce) void connectLichessEvalApi();
};

/**
 * Turn the API on or off, and at an address (absent: the one kept), then
 * check it. Resolves when the check has answered — Connect's feedback waits on it.
 */
export const storeLichessEvalApi = (enabled: boolean, url?: string): Promise<void> => {
  const { evalApi } = readJobsSettings();
  write({
    ...readJobsSettings(),
    evalApi: { ...evalApi, enabled, url: (url === undefined ? null : normalizeEngineServerUrl(url)) ?? evalApi.url },
  });
  return connectLichessEvalApi();
};

/** **For tests**: forget this visit's settings and the API's status — the teardown's, beside clearing `localStorage`. */
export const resetJobsSettings = (): void => {
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
export const subscribeJobsSettings = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === JOBS_SETTINGS_STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

// --- A running job's word that the API did not answer ---

/**
 * The job whose run found the API of no use: it did not answer a lookup
 * (`read` — the run goes on with the engine alone), or did not take the
 * engine's evals (`write` — the run goes on without sending them).
 */
export type LichessEvalUnreachable = { jobId: string; name: string; kind: "read" | "write" };

const unreachableListeners = new Set<(event: LichessEvalUnreachable) => void>();

/** **The runner's**: the API did not answer, or took no write, during this job's run — once per run and kind. */
export const reportLichessEvalUnreachable = (event: LichessEvalUnreachable): void => {
  unreachableListeners.forEach((listener) => listener(event));
};

/** Hear {@link reportLichessEvalUnreachable} — the shell, which shows the warning. */
export const subscribeLichessEvalUnreachable = (listener: (event: LichessEvalUnreachable) => void): (() => void) => {
  unreachableListeners.add(listener);
  return () => {
    unreachableListeners.delete(listener);
  };
};
