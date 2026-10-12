import { engineChoiceId, subscribeEngineChoice } from "./engineChoice";
import {
  presetSearchFrom,
  presetSearchOf,
  presetSentValues,
  selectedPresetOf,
  selectedPresetValues,
  type EnginePreset,
  type EnginePresetSelection,
  type PresetSearch,
} from "./enginePresets";
import {
  createEnginePreset,
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  saveEnginePresetEdit,
  selectEnginePreset,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
  type EnginePresetProblem,
} from "./enginePresetStore";
import { ENGINE_SEARCH_SETTING_BOUNDS, readSearchPreferences, storeSearchPreferences } from "./engineSearchSettings";
import type { UciOptionValue } from "./engineTypes";

/**
 * **The engine preset's unsaved edit** (CTA-185) — Settings → Engine's
 * options and search limits, and the top bar's Engine menu's depth and move
 * time, no longer write as they change: they edit **one draft**, kept in
 * memory, for the engine and the preset it runs. Every board searches with it
 * at once ({@link presetValuesInEffect}, `lib/engineSearchInEffect.ts`); it is
 * written only by **Save** (into the preset) or **Save as new preset** (a new
 * one, selected for the engine; the preset edited stays as it was). A reload
 * drops it, and so — silently — does choosing another preset or another
 * engine.
 *
 * Threads and Hash are in it too: the global request (`chessapp.engineSettings`),
 * not the preset's, but held with the draft and written on either save.
 *
 * An edit that brings everything back to what is saved drops the draft: a
 * draft is always a change. The same object from read to read until an edit.
 */

/** What a draft edits of a preset. */
export type PresetEdit = Pick<EnginePreset, "values" | "groups" | "search">;

export type EnginePresetDraft = {
  /** The engine whose preset is edited (a registry id). */
  engineId: string;
  /** The preset it runs — the one Save writes. */
  presetId: string;
  edit: PresetEdit;
  /** Threads and Hash asked — the global request, written with the draft. */
  resources: { threads: number; hashMb: number };
};

let draft: (EnginePresetDraft & { choice: string }) | undefined;
/** The stores watched while a draft is held — a switch of preset or engine drops it. */
let unwatch: (() => void) | undefined;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const savedPresetOf = (engineId: string): EnginePreset =>
  selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], engineId);

/** Whether the draft still edits what the engine runs: the same engine chosen, the same preset selected for it. */
const stillValid = (held: EnginePresetDraft & { choice: string }): boolean =>
  engineChoiceId() === held.choice && savedPresetOf(held.engineId).id === held.presetId;

const set = (next: (EnginePresetDraft & { choice: string }) | undefined) => {
  if (next === draft) return;
  draft = next;
  if (draft === undefined) {
    unwatch?.();
    unwatch = undefined;
  } else if (unwatch === undefined) {
    const check = () => {
      if (draft !== undefined && !stillValid(draft)) set(undefined);
    };
    const off = [subscribeEnginePresets(check), subscribeEnginePresetSelections(check), subscribeEngineChoice(check)];
    unwatch = () => off.forEach((each) => each());
  }
  notify();
};

/** The draft as it is held — `undefined` while nothing is changed. */
export const readEnginePresetDraft = (): EnginePresetDraft | undefined => draft;

/** **The draft of `engineId`'s preset** — `undefined` when it has none (or the draft is another engine's). */
export const enginePresetDraftOf = (engineId: string): EnginePresetDraft | undefined =>
  draft !== undefined && draft.engineId === engineId && stillValid(draft) ? draft : undefined;

/** Call `listener` when the draft changes. Returns an unsubscribe fn. */
export const subscribeEnginePresetDraft = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The preset with the draft over it, made once per pair — so its sent values stay the same object between reads. */
let merged: { base: EnginePreset; edit: PresetEdit; preset: EnginePreset } | undefined;

/** **The preset `engineId` runs, its draft over it** — what the form shows and the boards send. */
export const presetInEffectOf = (
  presets: readonly EnginePreset[],
  selections: readonly EnginePresetSelection[],
  engineId: string,
): EnginePreset => {
  const base = selectedPresetOf(presets, selections, engineId);
  const held = enginePresetDraftOf(engineId);
  if (held === undefined || held.presetId !== base.id) return base;
  if (merged?.base !== base || merged.edit !== held.edit) merged = { base, edit: held.edit, preset: { ...base, ...held.edit } };
  return merged.preset;
};

/** **The values `engineId` sends** — its selected preset's with the draft over it; none while either store is unread. */
export const presetValuesInEffect = (
  presets: readonly EnginePreset[] | undefined,
  selections: readonly EnginePresetSelection[] | undefined,
  engineId: string,
): Readonly<Record<string, UciOptionValue>> =>
  presets === undefined || selections === undefined || enginePresetDraftOf(engineId) === undefined
    ? selectedPresetValues(presets, selections, engineId)
    : presetSentValues(presetInEffectOf(presets, selections, engineId));

/* ------------------------------------------------------------------ *
 * Editing
 * ------------------------------------------------------------------ */

const sameRecord = (a: Readonly<Record<string, UciOptionValue>>, b: Readonly<Record<string, UciOptionValue>>): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key]);
};

const groupsOn = (groups: Readonly<Record<string, boolean>>): Record<string, boolean> =>
  Object.fromEntries(Object.entries(groups).filter(([, on]) => on));

/** Whether a draft changes nothing of what is saved — the preset's three and the global Threads and Hash. */
const unchanged = (held: EnginePresetDraft): boolean => {
  const saved = savedPresetOf(held.engineId);
  const preferences = readSearchPreferences();
  const search = presetSearchOf(held.edit);
  const savedSearch = presetSearchOf(saved);
  return (
    sameRecord(held.edit.values, saved.values) &&
    sameRecord(groupsOn(held.edit.groups), groupsOn(saved.groups)) &&
    search.depth === savedSearch.depth &&
    search.moveTimeMs === savedSearch.moveTimeMs &&
    held.resources.threads === preferences.threads &&
    held.resources.hashMb === preferences.hashMb
  );
};

/** Edit `engineId`'s draft — started from what is saved where there is none — and drop it if it comes back to that. */
const edit = (engineId: string, change: (held: EnginePresetDraft) => EnginePresetDraft): void => {
  const current = enginePresetDraftOf(engineId);
  const saved = savedPresetOf(engineId);
  const preferences = readSearchPreferences();
  const base: EnginePresetDraft = current ?? {
    engineId,
    presetId: saved.id,
    edit: { values: saved.values, groups: saved.groups, search: saved.search },
    resources: { threads: preferences.threads, hashMb: preferences.hashMb },
  };
  const next = change(base);
  if (next === base) return;
  set(unchanged(next) ? undefined : { ...next, choice: engineChoiceId() });
};

/** **Set one option** in the draft — `undefined` puts it back to the engine's default. */
export const draftEnginePresetValue = (engineId: string, name: string, value: UciOptionValue | undefined): void =>
  edit(engineId, (held) => {
    if (value === undefined ? !Object.hasOwn(held.edit.values, name) : held.edit.values[name] === value) return held;
    const values = { ...held.edit.values };
    if (value === undefined) delete values[name];
    else values[name] = value;
    return { ...held, edit: { ...held.edit, values } };
  });

/** **Turn a group of options on or off** in the draft. */
export const draftEnginePresetGroup = (engineId: string, group: string, on: boolean): void =>
  edit(engineId, (held) => {
    if ((held.edit.groups[group] === true) === on) return held;
    const groups = { ...held.edit.groups };
    if (on) groups[group] = true;
    else delete groups[group];
    return { ...held, edit: { ...held.edit, groups } };
  });

/** **Set where the draft's searches stop** — the depth, the move time or both, held to their bounds. */
export const draftEnginePresetSearch = (engineId: string, patch: PresetSearch): void =>
  edit(engineId, (held) => {
    const was = presetSearchOf(held.edit);
    const search = presetSearchFrom({ depth: patch.depth ?? was.depth, moveTimeMs: patch.moveTimeMs ?? was.moveTimeMs });
    if (search.depth === was.depth && search.moveTimeMs === was.moveTimeMs) return held;
    return { ...held, edit: { ...held.edit, search } };
  });

const heldWhole = (value: number, { min, max }: { min: number; max: number }) => Math.min(Math.max(Math.round(value), min), max);

/** **Ask for other Threads or Hash** in the draft — the global request, written with it. */
export const draftEngineResources = (engineId: string, patch: { threads?: number; hashMb?: number }): void =>
  edit(engineId, (held) => {
    const threads = patch.threads === undefined ? held.resources.threads : heldWhole(patch.threads, ENGINE_SEARCH_SETTING_BOUNDS.threads);
    const hashMb = patch.hashMb === undefined ? held.resources.hashMb : heldWhole(patch.hashMb, ENGINE_SEARCH_SETTING_BOUNDS.hashMb);
    if (threads === held.resources.threads && hashMb === held.resources.hashMb) return held;
    return { ...held, resources: { threads, hashMb } };
  });

/* ------------------------------------------------------------------ *
 * Saving
 * ------------------------------------------------------------------ */

/** **Save** — the draft into the preset it edits, Threads and Hash into the global request; then no draft. */
export const saveEnginePresetDraft = async (): Promise<EnginePresetProblem | undefined> => {
  const held = draft;
  if (held === undefined) return undefined;
  storeSearchPreferences(held.resources);
  const problem = await saveEnginePresetEdit(held.presetId, held.edit);
  if (problem === undefined && draft === held) set(undefined);
  return problem;
};

/**
 * **Save as new preset** — the draft as a new preset named `name`, selected
 * for the engine; the preset it edited stays as it was saved. Threads and
 * Hash into the global request.
 */
export const saveEnginePresetDraftAsNew = async (name: string): Promise<EnginePresetProblem | undefined> => {
  const held = draft;
  if (held === undefined) return undefined;
  const made = await createEnginePreset(name, held.edit.values, held.edit.groups, held.edit.search);
  if ("problem" in made) return made.problem;
  storeSearchPreferences(held.resources);
  if (draft === held) set(undefined);
  return selectEnginePreset(held.engineId, made.id);
};

/** **For tests**: no draft, no watch. */
export const resetEnginePresetDraft = (): void => {
  unwatch?.();
  unwatch = undefined;
  draft = undefined;
  merged = undefined;
};
