import {
  DEFAULT_PRESET_ID,
  MAX_ENGINE_PRESETS,
  defaultEnginePreset,
  enginePresetFrom,
  enginePresetSelectionFrom,
  presetNameOf,
  type EnginePreset,
  type EnginePresetSelection,
} from "./enginePresets";
import type { UciOptionValue } from "./engineTypes";
import { idbDatabase } from "./idb";
import { idbRecordStore } from "./idbRecordStore";
import { newRecordId } from "./recordId";

/**
 * Where the engine option presets live (CTA-179): **IndexedDB** —
 * `chessapp.enginePresets`, with two object stores: `presets` (one record per
 * {@link EnginePreset}, oldest first) and `selections` (one per engine, the
 * preset it runs). The reader's data, not a preference: it travels in the
 * Export zip (`import-export.md`). One database for both, over the shared
 * [`idbRecordStore.ts`](./idbRecordStore.ts), one `BroadcastChannel`; the
 * records and the rules are `lib/enginePresets.ts`, the storage as a whole
 * `.claude/rules/database.md`.
 *
 * Every read is the kept snapshot — `undefined` until the first read lands —
 * and every write a promise of `undefined` or a {@link EnginePresetProblem}.
 * Nothing here throws, and a write that changes nothing writes nothing.
 * **Default is never missing**: until it is edited it is not stored at all,
 * and the readers add it (`withDefaultPreset`); its first edit stores it.
 */

/** The database the presets live in. */
export const ENGINE_PRESETS_DB_NAME = "chessapp.enginePresets";
const DB_VERSION = 1;
const PRESETS_STORE = "presets";
const SELECTIONS_STORE = "selections";

const presetsDb = idbDatabase(ENGINE_PRESETS_DB_NAME, DB_VERSION, [PRESETS_STORE, SELECTIONS_STORE]);

/** **For tests**: close the connection and delete the database. */
export const deleteEnginePresetsDb = presetsDb.remove;

/** What went wrong: storage refused the write, the library is full, or (Default) it cannot be deleted. */
export type EnginePresetProblem = "storage" | "too-many" | "default";

const presets = idbRecordStore<EnginePreset>({
  db: presetsDb.open,
  store: PRESETS_STORE,
  normalise: enginePresetFrom,
  order: "oldest-first",
  channel: ENGINE_PRESETS_DB_NAME,
});

const selections = idbRecordStore<EnginePresetSelection>({
  db: presetsDb.open,
  store: SELECTIONS_STORE,
  normalise: enginePresetSelectionFrom,
  order: "oldest-first",
  channel: ENGINE_PRESETS_DB_NAME,
});

/** The stored presets, oldest first — `undefined` until read. Default only once it was edited. */
export const enginePresetsSnapshot = presets.snapshot;
export const subscribeEnginePresets = presets.subscribe;
export const loadEnginePresets = presets.load;
export const settledEnginePresets = presets.settled;
/** **For tests**: forget what was read. */
export const resetEnginePresetStore = presets.reset;

/** Which preset each engine runs — `undefined` until read. */
export const enginePresetSelectionsSnapshot = selections.snapshot;
export const subscribeEnginePresetSelections = selections.subscribe;
export const loadEnginePresetSelections = selections.load;
export const settledEnginePresetSelections = selections.settled;
/** **For tests**: forget what was read. */
export const resetEnginePresetSelectionStore = selections.reset;

const iso = () => new Date().toISOString();

/** The preset `id` from rows that may not hold Default yet. */
const presetIn = (rows: readonly EnginePreset[], id: string): EnginePreset | undefined =>
  rows.find((row) => row.id === id) ?? (id === DEFAULT_PRESET_ID ? defaultEnginePreset() : undefined);

/** `rows` with `next` in place of the preset of its id — or added at the end (Default's first edit). */
const withPreset = (rows: readonly EnginePreset[], next: EnginePreset): readonly EnginePreset[] =>
  rows.some((row) => row.id === next.id) ? rows.map((row) => (row.id === next.id ? next : row)) : [...rows, next];

/** Whether two presets' values are the same, whatever the order they were written in. */
const sameValues = (a: Readonly<Record<string, UciOptionValue>>, b: Readonly<Record<string, UciOptionValue>>): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key]);
};

/**
 * **Set one option of a preset** — `value`, or `undefined` to put it back to
 * the engine's default (the preset no longer names it). The same value is a
 * no-op; Default's first change stores it.
 */
export const setEnginePresetValue = (
  presetId: string,
  name: string,
  value: UciOptionValue | undefined,
): Promise<EnginePresetProblem | undefined> =>
  presets.write((rows) => {
    const preset = presetIn(rows, presetId);
    if (preset === undefined) return rows;
    const values = { ...preset.values };
    if (value === undefined) delete values[name];
    else values[name] = value;
    if (sameValues(values, preset.values)) return rows;
    const at = iso();
    return withPreset(rows, { ...preset, values, savedAt: preset.savedAt || at, updatedAt: at });
  });

/**
 * **A new preset** — named, holding `values` (a duplicate's) or none, at the
 * end of the list. Its id, or `"too-many"` past {@link MAX_ENGINE_PRESETS}.
 */
export const createEnginePreset = async (
  name: string,
  values: Readonly<Record<string, UciOptionValue>> = {},
): Promise<{ id: string } | { problem: EnginePresetProblem }> => {
  const at = iso();
  const id = newRecordId(new Date(at));
  let full = false;
  const problem = await presets.write((rows) => {
    // Default counts, stored or not: it is always one of the library's.
    const count = rows.length + (rows.some((row) => row.id === DEFAULT_PRESET_ID) ? 0 : 1);
    if (count >= MAX_ENGINE_PRESETS) {
      full = true;
      return rows;
    }
    return [...rows, { id, name: presetNameOf(name) || id, values: { ...values }, savedAt: at, updatedAt: at }];
  });
  if (problem !== undefined) return { problem };
  return full ? { problem: "too-many" } : { id };
};

/** **A copy of a preset**, under a new name, with every value it sets. */
export const duplicateEnginePreset = async (
  presetId: string,
  name: string,
): Promise<{ id: string } | { problem: EnginePresetProblem }> => {
  const source = presetIn((await presets.load()) ?? [], presetId);
  return createEnginePreset(name, source?.values ?? {});
};

/** **Rename a preset** — Default too. A blank name, or the same one, is a no-op. */
export const renameEnginePreset = (presetId: string, name: string): Promise<EnginePresetProblem | undefined> =>
  presets.write((rows) => {
    const preset = presetIn(rows, presetId);
    const next = presetNameOf(name);
    if (preset === undefined || next === "" || next === preset.name) return rows;
    const at = iso();
    return withPreset(rows, { ...preset, name: next, savedAt: preset.savedAt || at, updatedAt: at });
  });

/**
 * **Delete a preset** — never Default (`"default"`). Every engine that ran it
 * goes back to Default: its selection is removed.
 */
export const deleteEnginePreset = async (presetId: string): Promise<EnginePresetProblem | undefined> => {
  if (presetId === DEFAULT_PRESET_ID) return "default";
  const problem = await presets.write((rows) => {
    const kept = rows.filter((row) => row.id !== presetId);
    return kept.length === rows.length ? rows : kept;
  });
  if (problem !== undefined) return problem;
  return selections.write((rows) => {
    const kept = rows.filter((row) => row.presetId !== presetId);
    return kept.length === rows.length ? rows : kept;
  });
};

/** **Run `presetId` on `engineId`** — that engine alone; every other keeps its own. */
export const selectEnginePreset = (engineId: string, presetId: string): Promise<EnginePresetProblem | undefined> =>
  selections.write((rows) => {
    const current = rows.find((row) => row.id === engineId);
    if (current?.presetId === presetId) return rows;
    const next = { id: engineId, presetId, updatedAt: iso() };
    return current === undefined ? [...rows, next] : rows.map((row) => (row.id === engineId ? next : row));
  });

/**
 * **The import's write** (`lib/dataImportTarget.ts`): the presets to remove
 * and to add (an id already here replaced), then the selections — each
 * engine's added or replaced. Past {@link MAX_ENGINE_PRESETS} nothing is
 * written (`"too-many"`).
 */
export const importEnginePresets = async ({
  add,
  remove,
  select,
}: {
  add: readonly EnginePreset[];
  remove: readonly string[];
  select: readonly EnginePresetSelection[];
}): Promise<EnginePresetProblem | undefined> => {
  let full = false;
  const problem = await presets.write((rows) => {
    if (add.length === 0 && remove.length === 0) return rows;
    const gone = new Set([...remove, ...add.map((preset) => preset.id)]);
    const next = [...rows.filter((row) => !gone.has(row.id)), ...add];
    if (next.length > MAX_ENGINE_PRESETS) {
      full = true;
      return rows;
    }
    return next;
  });
  if (problem !== undefined) return problem;
  if (full) return "too-many";
  return selections.write((rows) => {
    if (select.length === 0) return rows;
    const engines = new Set(select.map((selection) => selection.id));
    return [...rows.filter((row) => !engines.has(row.id)), ...select];
  });
};
