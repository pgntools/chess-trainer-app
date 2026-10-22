/**
 * **The move sounds' settings** (CTA-260) — whether the boards play a sound
 * for a move at all, how loud, and whether stepping through a game sounds too
 * (a move played — the reader's, the engine's, the trainer's — sounds while
 * `enabled` alone is on). Set on Settings → Sounds (`views/settings/SoundsTab.tsx`),
 * read by every board as it plays a sound (`views/board/core/useMoveSounds.ts`).
 *
 * **A preference, not the reader's data** — `localStorage` beside the engine's
 * search settings, and so not in the export zip (`database.md` §2). Read back
 * field by field: a missing or unreadable one is its default, the volume held
 * to 0–100. Plain functions over a tiny subscription, as
 * `lib/engineSearchSettings.ts`; another tab's change arrives by the
 * window's `storage` event.
 */
export type SoundSettings = {
  /** The master switch — off, no board plays a sound. */
  enabled: boolean;
  /** How loud, in percent — 0 to 100. */
  volume: number;
  /** Whether stepping forward through a game (→, a move clicked, the controls) sounds too. */
  stepping: boolean;
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { enabled: true, volume: 70, stepping: true };

export const SOUND_VOLUME_BOUNDS = { min: 0, max: 100 } as const;

const FIELDS = ["enabled", "volume", "stepping"] as const;

/** Settings read back from stored JSON — a field missing or unreadable is its default. Never throws. */
export const soundSettingsFrom = (value: unknown): SoundSettings => {
  const row = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_SOUND_SETTINGS;
  const { min, max } = SOUND_VOLUME_BOUNDS;
  return {
    enabled: typeof row.enabled === "boolean" ? row.enabled : defaults.enabled,
    volume:
      typeof row.volume === "number" && Number.isFinite(row.volume)
        ? Math.min(Math.max(Math.round(row.volume), min), max)
        : defaults.volume,
    stepping: typeof row.stepping === "boolean" ? row.stepping : defaults.stepping,
  };
};

export const SOUND_SETTINGS_STORAGE_KEY = "chessapp.sounds";

const listeners = new Set<() => void>();

/** Held for the visit only when storage refuses the write — a private window still keeps its settings. */
let remembered: SoundSettings | undefined;

/** The last text read and what it read as — the same object until the text changes, as `useSyncExternalStore` needs. */
let cache: { text: string | null; settings: SoundSettings } | undefined;

const readText = (): string | null => {
  try {
    return localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY);
  } catch {
    return null;
  }
};

/** **The settings in effect** — the stored ones, else the defaults. The same object until they change. */
export const readSoundSettings = (): SoundSettings => {
  if (remembered !== undefined) return remembered;
  const text = readText();
  if (cache !== undefined && cache.text === text) return cache.settings;
  let parsed: unknown;
  try {
    parsed = text === null ? undefined : JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  cache = { text, settings: soundSettingsFrom(parsed) };
  return cache.settings;
};

/**
 * **Change some of them** and tell their subscribers — every open board plays
 * its next sound with them. A patch that changes nothing writes nothing; a
 * storage that refuses it only forgets it after this visit.
 */
export const storeSoundSettings = (patch: Partial<SoundSettings>): void => {
  const current = readSoundSettings();
  const next = soundSettingsFrom({ ...current, ...patch });
  if (FIELDS.every((field) => current[field] === next[field])) return;
  try {
    localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    remembered = undefined;
  } catch {
    // Private mode or a full quota: the settings still apply to this visit.
    remembered = next;
  }
  listeners.forEach((listener) => listener());
};

/** Call `listener` when they may have changed: this tab's write or another tab's (`storage`). Returns an unsubscribe fn. */
export const subscribeSoundSettings = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SOUND_SETTINGS_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** Forget what this visit kept — for the tests, which clear `localStorage` between them. */
export const resetSoundSettings = (): void => {
  remembered = undefined;
  cache = undefined;
};
