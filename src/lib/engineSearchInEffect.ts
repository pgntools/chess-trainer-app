import { engineChoiceId, subscribeEngineChoice } from "./engineChoice";
import {
  draftEnginePresetSearch,
  draftEngineResources,
  enginePresetDraftOf,
  readEnginePresetDraft,
  resetEnginePresetDraft,
  subscribeEnginePresetDraft,
} from "./enginePresetDraft";
import { presetSearchOf, selectedPresetOf } from "./enginePresets";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  loadEnginePresetSelections,
  loadEnginePresets,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "./enginePresetStore";
import {
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
 * **An unsaved draft comes first** (CTA-185, `lib/enginePresetDraft.ts`): a
 * change of the depth, the move time, Threads or Hash is not written but
 * edits the draft of the chosen engine's preset, read here at once over what
 * is saved — until Save, Save as new preset, a reload, or a switch of preset
 * or engine. The lines alone are written as they change. One object from read
 * to read until something changes, as `useSyncExternalStore` needs.
 *
 * The presets are read on first subscription; until then (and in the
 * pre-render) the depth and move time are the defaults. A route that opens a
 * record and compares its settings waits for them
 * ({@link engineSearchSettingsRead}, {@link loadEngineSearchSettings}).
 */

type Search = { depth: number; moveTimeMs: number };

/** The last read: what it was made of, and the settings — kept while no part changes. */
let cache:
  | { preferences: SearchPreferences; search: Search; draft: ReturnType<typeof readEnginePresetDraft>; settings: EngineSearchSettings }
  | undefined;


/** The preset the chosen engine runs now (Default while the stores have not been read). */
const presetInEffect = () => {
  const engineId = engineChoiceId();
  return { engineId, preset: selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], engineId) };
};

/** The depth and move time in effect — the draft's first. */
const searchInEffect = (): Search => {
  const { engineId, preset } = presetInEffect();
  return presetSearchOf(enginePresetDraftOf(engineId)?.edit ?? preset);
};

/** **The settings every board searches with.** The same object until they change. */
export const readEngineSearchSettings = (): EngineSearchSettings => {
  const preferences = readSearchPreferences();
  const search = searchInEffect();
  const draft = enginePresetDraftOf(engineChoiceId());
  if (
    cache !== undefined &&
    cache.preferences === preferences &&
    cache.draft === draft &&
    cache.search.depth === search.depth &&
    cache.search.moveTimeMs === search.moveTimeMs
  ) {
    return cache.settings;
  }
  cache = { preferences, search, draft, settings: { ...preferences, ...draft?.resources, ...search } };
  return cache.settings;
};

/**
 * **Change some of them** and tell every board and the top bar: the lines
 * into the preference; the depth, move time, Threads and Hash into the
 * draft of the chosen engine's preset (CTA-185) — in effect at once, written
 * on Save. A change that changes nothing changes nothing.
 */
export const storeEngineSearchSettings = (patch: Partial<EngineSearchSettings>): void => {
  const { depth, moveTimeMs, threads, hashMb, ...preferences } = patch;
  if (Object.keys(preferences).length > 0) storeSearchPreferences(preferences);
  const engineId = engineChoiceId();
  if (threads !== undefined || hashMb !== undefined) draftEngineResources(engineId, { threads, hashMb });
  if (depth !== undefined || moveTimeMs !== undefined) draftEnginePresetSearch(engineId, { depth, moveTimeMs });
};

/**
 * Call `listener` when the settings may have changed: the preference, the
 * presets, which preset an engine runs, or the engine chosen. Subscribing
 * starts the presets' first read. Returns an unsubscribe fn.
 */
export const subscribeEngineSearchSettings = (listener: () => void): (() => void) => {
  const unsubscribe = [
    subscribeSearchPreferences(listener),
    subscribeEnginePresets(listener),
    subscribeEnginePresetSelections(listener),
    subscribeEngineChoice(listener),
    subscribeEnginePresetDraft(listener),
  ];
  return () => {
    unsubscribe.forEach((each) => each());
  };
};

/** Whether the presets have been read — before then the depth and move time are the defaults. */
export const engineSearchSettingsRead = (): boolean =>
  enginePresetsSnapshot() !== undefined && enginePresetSelectionsSnapshot() !== undefined;

/** Read the presets, so the depth and move time in effect are the preset's. */
export const loadEngineSearchSettings = (): Promise<unknown> => Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);

/** **For tests**: forget what this visit kept — the draft, the last read and the preference's. */
export const resetEngineSearchSettings = (): void => {
  resetEnginePresetDraft();
  cache = undefined;
  resetSearchPreferences();
};
