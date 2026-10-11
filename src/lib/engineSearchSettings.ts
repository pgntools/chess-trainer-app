import { MAX_VARIATIONS_OFFERED } from "./engineAnalysis";
import { ENGINE_SETTING_BOUNDS, engineLimitsOf, HOSTED_ENGINE_SETTING_BOUNDS } from "./engineSettings";
import type { EngineDescriptor } from "./engineTypes";
import { missingFieldsOf } from "./recordedFields";

/**
 * **The engine's search settings, one set for every board** (CTA-181) — how
 * many lines, how deep, how long, infinite analysis, and the two resource
 * knobs, `Threads` and `Hash`. Set from the top bar's Engine menu
 * (`views/main/EngineMenu.tsx`) and read by every board: the Analysis Board,
 * the Library's game, the Openings explorer, the repertoire player, Play with
 * Engine and Masked Pieces. A change applies from the next search. (Until
 * CTA-181 each board kept its own, on its Engine tab.)
 *
 * **A preference, not the reader's data** — `localStorage` beside the engine
 * choice (`lib/engineChoice.ts`), and so **not in the export zip**
 * (`settings.md`, `database.md` §2). Plain functions over a tiny
 * subscription, as the engine choice; `views/shared/useEngineSearchSettings.ts`
 * binds it to React.
 *
 * **Requests, never cut back in the store** (`docs/engine.md` §5): `Threads`
 * and `Hash` are kept as asked, within the widest bounds any engine takes (an
 * engine server's, `HOSTED_ENGINE_SETTING_BOUNDS`), and held to the running
 * engine's when used (`analysisUciOptionsOf` and the engine module's clamp) —
 * so a choice made for the engine server's engine comes back by itself when
 * the reader returns to it. The menu shows each held to the engine running.
 *
 * Records keep the settings they ran with: a saved analysis its
 * `AnalysisSettings`, a played game its `EngineSettings` — the values in
 * effect when they were saved. {@link searchSettingsChanges} is what opening
 * one compares ("Engine options changed").
 */
export type EngineSearchSettings = {
  /** UCI `MultiPV` — how many lines the boards show. */
  multiPv: number;
  /** Plies per search — where a search stops while {@link infinite} is off, and always for Play. */
  depth: number;
  /**
   * Milliseconds per search; `0` means "depth alone decides", and `1` — the
   * slider's 0-seconds mark — is the instant reply (CTA-163).
   */
  moveTimeMs: number;
  /**
   * **Infinite analysis** (CTA-160): the engine keeps deepening the position
   * on screen until it changes or the engine is switched off. Not for Play,
   * which needs a search that ends with a move: while Play is on, the depth
   * and move time decide (`infinite && !playing`).
   */
  infinite: boolean;
  /** UCI `Threads` — a request, held to the running engine's top when used. */
  threads: number;
  /** UCI `Hash`, in MB — a request, held to the running engine's top when used. */
  hashMb: number;
};

/** The settings, in the order the menu and the "changed" dialog list them. */
const ENGINE_SEARCH_FIELDS = ["multiPv", "depth", "moveTimeMs", "infinite", "threads", "hashMb"] as const;

export type EngineSearchField = (typeof ENGINE_SEARCH_FIELDS)[number];

/**
 * **The Analysis Board's own defaults** — depth 20, three lines, no time
 * limit, infinite off, one thread and 16 MB — so a saved analysis kept
 * under the old defaults opens without a "changed" dialog.
 */
export const DEFAULT_ENGINE_SEARCH_SETTINGS: EngineSearchSettings = {
  multiPv: 3,
  depth: 20,
  moveTimeMs: 0,
  infinite: false,
  threads: 1,
  hashMb: 16,
};

/**
 * The bounds a stored value is held to — the menu's offer for depth, move
 * time and lines (Play with Engine's marked move-time slider, 0–300 s and ∞,
 * for every board: CTA-163's, which replaced the analysis boards' 0–60 s),
 * and the widest any engine takes for Threads and Hash.
 */
export const ENGINE_SEARCH_SETTING_BOUNDS = {
  multiPv: { min: 1, max: MAX_VARIATIONS_OFFERED },
  depth: ENGINE_SETTING_BOUNDS.depth,
  moveTimeMs: ENGINE_SETTING_BOUNDS.moveTimeMs,
  threads: HOSTED_ENGINE_SETTING_BOUNDS.threads,
  hashMb: HOSTED_ENGINE_SETTING_BOUNDS.hashMb,
} as const;

const heldNumber = (value: unknown, fallback: number, { min, max }: { min: number; max: number }): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(Math.round(value), min), max) : fallback;

/**
 * Settings read back from stored JSON — a field missing or unreadable is its
 * default, a number held to {@link ENGINE_SEARCH_SETTING_BOUNDS}. Never throws.
 */
export const engineSearchSettingsFrom = (value: unknown): EngineSearchSettings => {
  const row = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_ENGINE_SEARCH_SETTINGS;
  const bounds = ENGINE_SEARCH_SETTING_BOUNDS;
  return {
    multiPv: heldNumber(row.multiPv, defaults.multiPv, bounds.multiPv),
    depth: heldNumber(row.depth, defaults.depth, bounds.depth),
    moveTimeMs: heldNumber(row.moveTimeMs, defaults.moveTimeMs, bounds.moveTimeMs),
    infinite: row.infinite === true,
    threads: heldNumber(row.threads, defaults.threads, bounds.threads),
    hashMb: heldNumber(row.hashMb, defaults.hashMb, bounds.hashMb),
  };
};

/** Whether two settings would search alike. */
const sameEngineSearchSettings = (a: EngineSearchSettings, b: EngineSearchSettings): boolean =>
  ENGINE_SEARCH_FIELDS.every((field) => a[field] === b[field]);

/* ------------------------------------------------------------------ *
 * The engine running
 * ------------------------------------------------------------------ */

/**
 * **The most `Threads` and `Hash` the engine running takes** — what the menu
 * offers and what "Use these settings" holds a record's values to: a
 * single-thread build one thread, a multi-thread build what this device can
 * give it, an engine server's engine what it declares (`engineLimitsOf`).
 */
export const searchSettingLimitsOf = (
  descriptor: Pick<EngineDescriptor, "id" | "options" | "capabilities">,
  device?: { hardwareConcurrency?: number; deviceMemory?: number },
): { threads: number; hashMb: number } => {
  const limits = engineLimitsOf(descriptor, device);
  return { threads: descriptor.capabilities.multiThread ? limits.threads : 1, hashMb: limits.hashMb };
};

/**
 * Settings held to what the engine running takes — `Threads` and `Hash` to
 * {@link searchSettingLimitsOf} — with the fields that moved, so the reader
 * can be told.
 */
export const heldToEngine = (
  settings: EngineSearchSettings,
  limits: { threads: number; hashMb: number },
): { settings: EngineSearchSettings; held: readonly ("threads" | "hashMb")[] } => {
  const held: ("threads" | "hashMb")[] = [];
  const threads = Math.min(settings.threads, limits.threads);
  if (threads !== settings.threads) held.push("threads");
  const hashMb = Math.min(settings.hashMb, limits.hashMb);
  if (hashMb !== settings.hashMb) held.push("hashMb");
  return { settings: held.length === 0 ? settings : { ...settings, threads, hashMb }, held };
};

/* ------------------------------------------------------------------ *
 * A record's settings against the ones in effect
 * ------------------------------------------------------------------ */

/** One setting a record ran with that differs from the one in effect now. */
export type EngineSearchChange<F extends EngineSearchField = EngineSearchField> = {
  field: F;
  /** The record's value. */
  recorded: EngineSearchSettings[F];
  /** The value in effect now. */
  current: EngineSearchSettings[F];
};

/**
 * **What a record's engine settings say that the ones in effect do not** —
 * the "Engine options changed" dialog's rows, in {@link ENGINE_SEARCH_FIELDS}'
 * order. Only the settings the menu owns are compared; a field the record has
 * no such setting for (a played game has no infinite analysis) is skipped, and
 * so is one its stored row **did not carry** — read as its default by its
 * normaliser (`missingFieldsOf`, `lib/recordedFields.ts`): the record never
 * chose it.
 */
export const searchSettingsChanges = (
  recorded: Partial<Record<EngineSearchField, number | boolean>>,
  current: EngineSearchSettings,
): EngineSearchChange[] => {
  const missing = missingFieldsOf(recorded);
  const changes: EngineSearchChange[] = [];
  for (const field of ENGINE_SEARCH_FIELDS) {
    const value = recorded[field];
    if (value === undefined || missing.has(field) || value === current[field]) continue;
    changes.push({ field, recorded: value, current: current[field] } as EngineSearchChange);
  }
  return changes;
};

/** The settings in effect with a record's changed values put back. */
export const withRecordedSettings = (
  current: EngineSearchSettings,
  changes: readonly EngineSearchChange[],
): EngineSearchSettings => {
  const next: Record<string, number | boolean> = { ...current };
  for (const change of changes) next[change.field] = change.recorded;
  return engineSearchSettingsFrom(next);
};

/* ------------------------------------------------------------------ *
 * The preference
 * ------------------------------------------------------------------ */

export const ENGINE_SEARCH_SETTINGS_STORAGE_KEY = "chessapp.engineSettings";

const listeners = new Set<() => void>();

/** Held for the visit only when storage refuses the write — a private window still keeps its settings. */
let remembered: EngineSearchSettings | undefined;

/** The last text read and what it read as — the same object until the text changes, as `useSyncExternalStore` needs. */
let cache: { text: string | null; settings: EngineSearchSettings } | undefined;

const readText = (): string | null => {
  try {
    return localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY);
  } catch {
    return null;
  }
};

/** **The settings in effect** — the stored ones, else the defaults. The same object until they change. */
export const readEngineSearchSettings = (): EngineSearchSettings => {
  if (remembered !== undefined) return remembered;
  const text = readText();
  if (cache !== undefined && cache.text === text) return cache.settings;
  let parsed: unknown;
  try {
    parsed = text === null ? undefined : JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  cache = { text, settings: engineSearchSettingsFrom(parsed) };
  return cache.settings;
};

/**
 * **Change some of the settings** and tell every board and the top bar. A
 * patch that changes nothing writes nothing. A storage that refuses it only
 * forgets it after this visit.
 */
export const storeEngineSearchSettings = (patch: Partial<EngineSearchSettings>): void => {
  const current = readEngineSearchSettings();
  const next = engineSearchSettingsFrom({ ...current, ...patch });
  if (sameEngineSearchSettings(current, next)) return;
  try {
    localStorage.setItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    remembered = undefined;
  } catch {
    // Private mode or a full quota: the settings still apply to this visit.
    remembered = next;
  }
  listeners.forEach((listener) => listener());
};

/**
 * Call `listener` when the settings may have changed: this tab's write or
 * another tab's (`storage`). Returns an unsubscribe fn.
 */
export const subscribeEngineSearchSettings = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ENGINE_SEARCH_SETTINGS_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** Forget what this visit kept — for the tests, which clear `localStorage` between them. */
export const resetEngineSearchSettings = (): void => {
  remembered = undefined;
  cache = undefined;
};
