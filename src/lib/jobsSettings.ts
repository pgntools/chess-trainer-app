/**
 * **The Jobs settings** (CTA-193) — Jobs V2's own preferences, set on the
 * Jobs V2 view's Settings tab (`/analysis/jobs?tab=settings`):
 *
 * - **The default engine and preset for new jobs** — one pair, or `null`
 *   (the board's engine and that engine's selected preset, as before). A pair
 *   whose engine or preset is gone reads as `null` where it is used (New Job
 *   V2), and stays stored.
 *
 * The lichess evaluation API lived here too until CTA-196 made it the app's
 * (`lib/evalSources/lichess/settings.ts`, Settings → Engine), which moves an
 * old `evalApi` out of this key on its first read. A field of the stored
 * object these settings do not read is **kept** on a write, so nothing waiting
 * to be moved is lost.
 *
 * One `localStorage` key, {@link JOBS_SETTINGS_STORAGE_KEY}, as JSON; a
 * storage that refuses the write keeps the change for this visit.
 *
 * Plain functions over a small subscription; nothing runs at import.
 */
export const JOBS_SETTINGS_STORAGE_KEY = "chessapp.jobsSettings";

/** The engine and preset a new job starts with. */
export type JobsDefaultPreset = { engineId: string; presetId: string };

export type JobsSettings = {
  /** `null`: the board's engine and its selected preset. */
  defaultPreset: JobsDefaultPreset | null;
};

export const DEFAULT_JOBS_SETTINGS: JobsSettings = { defaultPreset: null };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isName = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/** Settings read leniently: what does not read is its default. */
export const jobsSettingsFrom = (raw: unknown): JobsSettings => {
  if (!isRecord(raw)) return DEFAULT_JOBS_SETTINGS;
  const preset = raw.defaultPreset;
  return {
    defaultPreset: isRecord(preset) && isName(preset.engineId) && isName(preset.presetId) ? { engineId: preset.engineId, presetId: preset.presetId } : null,
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

/** What is stored now, as an object — the fields these settings do not read kept. */
const storedObject = (): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY) ?? "{}");
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const write = (next: JobsSettings) => {
  remembered = next;
  try {
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, JSON.stringify({ ...storedObject(), ...next }));
  } catch {
    // Private mode or a full quota: it still applies to this visit.
  }
  notify();
};

/** Set the default engine and preset for new jobs — `null` for the board's. */
export const storeJobsDefaultPreset = (defaultPreset: JobsDefaultPreset | null): void =>
  write({ ...readJobsSettings(), defaultPreset });

/** **For tests**: forget this visit's settings — the teardown's, beside clearing `localStorage`. */
export const resetJobsSettings = (): void => {
  cached = undefined;
  remembered = undefined;
};

/** Call `listener` when the settings may have changed — this tab's change, or another tab's (`storage`). */
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
