import { engineChoiceId, subscribeEngineChoice } from "./engineChoice";
import { presetSearchOf, selectedPresetOf } from "./enginePresets";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  loadEnginePresetSelections,
  loadEnginePresets,
  setEnginePresetSearch,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "./enginePresetStore";
import {
  ENGINE_SEARCH_SETTING_BOUNDS,
  readSearchPreferences,
  resetSearchPreferences,
  storeSearchPreferences,
  subscribeSearchPreferences,
  type EngineSearchSettings,
  type SearchPreferences,
} from "./engineSearchSettings";

/**
 * **The search settings in effect** (CTA-185) — what every board searches
 * with, and what the top bar's Engine menu shows and sets: the lines, Threads
 * and Hash from the preference (`lib/engineSearchSettings.ts`), and **the
 * depth and the move time from the selected preset of the engine the reader
 * chose** (`lib/enginePresets.ts`, `chessapp.enginePresets`). Switching the
 * preset or the engine switches the two; a preset that never set them reads
 * the defaults (depth 20, no time limit).
 *
 * A write of the depth or move time goes into that preset — Default's first
 * stores it — and shows **at once**: the store answers once IndexedDB has
 * committed, so until then the asked values are kept here and read in its
 * place (a slider dragged, a board re-searching, a test, all see them on
 * the next read). One object from read to read until something changes, as
 * `useSyncExternalStore` needs.
 *
 * The presets are read on first subscription; until then (and in the
 * pre-render) the depth and move time are the defaults. A route that opens a
 * record and compares its settings waits for them
 * ({@link engineSearchSettingsRead}, {@link loadEngineSearchSettings}).
 */

type Search = { depth: number; moveTimeMs: number };

/** A write not yet committed: the engine and preset it is for, and the limits asked. */
let pending: { engineId: string; presetId: string; search: Search } | undefined;

/** The last read: what it was made of, and the settings — kept while neither part changes. */
let cache: { preferences: SearchPreferences; search: Search; settings: EngineSearchSettings } | undefined;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** The preset the chosen engine runs now (Default while the stores have not been read). */
const presetInEffect = () => {
  const engineId = engineChoiceId();
  return { engineId, preset: selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], engineId) };
};

/** The depth and move time in effect — a write still landing first. */
const searchInEffect = (): Search => {
  const { engineId, preset } = presetInEffect();
  if (pending !== undefined && pending.engineId === engineId && pending.presetId === preset.id) return pending.search;
  return presetSearchOf(preset);
};

/** **The settings every board searches with.** The same object until they change. */
export const readEngineSearchSettings = (): EngineSearchSettings => {
  const preferences = readSearchPreferences();
  const search = searchInEffect();
  if (
    cache !== undefined &&
    cache.preferences === preferences &&
    cache.search.depth === search.depth &&
    cache.search.moveTimeMs === search.moveTimeMs
  ) {
    return cache.settings;
  }
  cache = { preferences, search, settings: { ...preferences, ...search } };
  return cache.settings;
};

const held = (value: number, { min, max }: { min: number; max: number }) => Math.min(Math.max(Math.round(value), min), max);

/**
 * **Change some of them** and tell every board and the top bar: the lines,
 * Threads and Hash into the preference, the depth and move time into the
 * chosen engine's selected preset. A change that changes nothing writes
 * nothing.
 */
export const storeEngineSearchSettings = (patch: Partial<EngineSearchSettings>): void => {
  const { depth, moveTimeMs, ...preferences } = patch;
  if (Object.keys(preferences).length > 0) storeSearchPreferences(preferences);
  if (depth === undefined && moveTimeMs === undefined) return;
  const current = searchInEffect();
  const search: Search = {
    depth: depth === undefined ? current.depth : held(depth, ENGINE_SEARCH_SETTING_BOUNDS.depth),
    moveTimeMs: moveTimeMs === undefined ? current.moveTimeMs : held(moveTimeMs, ENGINE_SEARCH_SETTING_BOUNDS.moveTimeMs),
  };
  if (search.depth === current.depth && search.moveTimeMs === current.moveTimeMs) return;
  const { engineId, preset } = presetInEffect();
  const mine = { engineId, presetId: preset.id, search };
  pending = mine;
  notify();
  void setEnginePresetSearch(preset.id, search).then(() => {
    // Landed (or refused — then the preset's own values come back): the store's own snapshot is the truth again.
    if (pending !== mine) return;
    pending = undefined;
    notify();
  });
};

/**
 * Call `listener` when the settings may have changed: the preference, the
 * presets, which preset an engine runs, or the engine chosen. Subscribing
 * starts the presets' first read. Returns an unsubscribe fn.
 */
export const subscribeEngineSearchSettings = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const unsubscribe = [
    subscribeSearchPreferences(listener),
    subscribeEnginePresets(listener),
    subscribeEnginePresetSelections(listener),
    subscribeEngineChoice(listener),
  ];
  return () => {
    listeners.delete(listener);
    unsubscribe.forEach((each) => each());
  };
};

/** Whether the presets have been read — before then the depth and move time are the defaults. */
export const engineSearchSettingsRead = (): boolean =>
  enginePresetsSnapshot() !== undefined && enginePresetSelectionsSnapshot() !== undefined;

/** Read the presets, so the depth and move time in effect are the preset's. */
export const loadEngineSearchSettings = (): Promise<unknown> => Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);

/** **For tests**: forget what this visit kept — a write still landing, the last read and the preference's. */
export const resetEngineSearchSettings = (): void => {
  pending = undefined;
  cache = undefined;
  resetSearchPreferences();
};
