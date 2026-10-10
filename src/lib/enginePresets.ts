import { ENGINE_SETTING_BOUNDS } from "./engineSettings";
import type { EngineOption, UciOptionValue } from "./engineTypes";
import { isSettableOption } from "./uciEngine";

/**
 * **Engine option presets** (CTA-179) — named sets of UCI option values, one
 * library shared by every engine, each engine with its own selected preset
 * (Settings → Engine). What the boards and the job runner send beside their
 * own options: Move Overhead, nodestime, UCI_ShowWDL, Skill Level outside
 * Play, the Syzygy options, … — anything the running engine declares.
 *
 * Pure: the records, their normalisers, which preset an engine runs, and how
 * a preset's values meet what one engine declares ({@link resolveEnginePreset})
 * — held to that engine's bounds, or skipped, each with its reason. The store
 * is `lib/enginePresetStore.ts`; the reference `docs/engine.md` §9.
 *
 * - **A preset keeps only what the reader set.** An option it does not name
 *   stays at the engine's own default, so one preset serves every engine:
 *   each takes the values it declares and skips the rest.
 * - **The boards' own options win.** Threads, Hash and MultiPV are set on
 *   every board (and by a job) from its own settings — {@link BOARD_OWNED_OPTIONS};
 *   a preset never sends them. Play with Engine and Masked Pieces set the
 *   strength too ({@link PLAY_OWNED_OPTIONS}), so there a preset's Skill
 *   Level or Elo gives way; on an analysis board it is what the engine runs.
 * - **Default always exists.** It is the one a new reader and every engine
 *   start on, it cannot be deleted, and until it is edited it is not stored
 *   at all ({@link withDefaultPreset}).
 */

/** The preset that always exists — the one every engine starts on. */
export const DEFAULT_PRESET_ID = "default";

/** Its name until the reader renames it (a screen shows it in the reader's language). */
export const DEFAULT_PRESET_NAME = "Default";

/** How many presets the library keeps — an import past it is refused. */
export const MAX_ENGINE_PRESETS = 50;

/** The longest name a preset keeps. */
export const MAX_PRESET_NAME_LENGTH = 60;

/** The most options one preset names — a hand-edited record past it is cut. */
const MAX_PRESET_VALUES = 200;

/** The longest words a `string` option's value keeps. */
const MAX_STRING_VALUE_LENGTH = 1000;

/** One named set of option values. */
export type EnginePreset = {
  id: string;
  name: string;
  /** Option name → the value the reader set. Only what they set. */
  values: Readonly<Record<string, UciOptionValue>>;
  /** ISO 8601. `""` for the Default that was never stored. */
  savedAt: string;
  updatedAt: string;
};

/** Which preset one engine runs — one row per engine, keyed by its registry id. */
export type EnginePresetSelection = {
  /** The engine's registry id (`stockfish-19-lite-single`, `hosted:sf19`). */
  id: string;
  presetId: string;
  updatedAt: string;
};

/**
 * **Set on every board, never by a preset** — each board's own Threads, Hash
 * and lines (and a job's), shown read-only in the form.
 */
export const BOARD_OWNED_OPTIONS: readonly string[] = ["Threads", "Hash", "MultiPV"];

/**
 * **Set by Play with Engine and Masked Pieces from their own strength** — a
 * preset's value reaches every other board, and gives way there.
 */
export const PLAY_OWNED_OPTIONS: readonly string[] = ["Skill Level", "UCI_Elo", "UCI_LimitStrength"];

/**
 * **A file-path option** — `EvalFile`, `EvalFileSmall`, `SyzygyPath`,
 * `Debug Log File`: a `string` named for a file or a path. The page's own
 * WebAssembly builds have no file system — `setoption name EvalFile` kills
 * the worker — so none is ever sent to one (their descriptors refuse them,
 * `lib/engines/builtin.ts`).
 */
export const isFilePathOption = (option: EngineOption): boolean =>
  option.type === "string" && /file|path/i.test(option.name);

/** No values — one object, so a reader keyed on a preset's values sees no change between reads. */
const NO_VALUES: Readonly<Record<string, UciOptionValue>> = Object.freeze({});

/** The Default preset as it is before the reader edits it: no values, never stored. */
export const defaultEnginePreset = (): EnginePreset => ({
  id: DEFAULT_PRESET_ID,
  name: DEFAULT_PRESET_NAME,
  values: NO_VALUES,
  savedAt: "",
  updatedAt: "",
});

/** The presets with Default first — the stored one, or the unstored one when it never was. */
export const withDefaultPreset = (presets: readonly EnginePreset[]): EnginePreset[] => {
  const stored = presets.find((preset) => preset.id === DEFAULT_PRESET_ID);
  return [stored ?? defaultEnginePreset(), ...presets.filter((preset) => preset.id !== DEFAULT_PRESET_ID)];
};

/**
 * The preset `engineId` runs: its selection when that preset exists, else
 * Default — a deleted preset's engines fall back, as a new engine starts.
 */
export const selectedPresetOf = (
  presets: readonly EnginePreset[],
  selections: readonly EnginePresetSelection[],
  engineId: string,
): EnginePreset => {
  const all = withDefaultPreset(presets);
  const presetId = selections.find((selection) => selection.id === engineId)?.presetId;
  return all.find((preset) => preset.id === presetId) ?? all[0];
};

/**
 * **The values `engineId` runs** — its selected preset's, the same object
 * from read to read until that preset changes (the engine module keys its
 * effects on it), and none while either store has not been read.
 */
export const selectedPresetValues = (
  presets: readonly EnginePreset[] | undefined,
  selections: readonly EnginePresetSelection[] | undefined,
  engineId: string,
): Readonly<Record<string, UciOptionValue>> =>
  presets === undefined || selections === undefined ? NO_VALUES : selectedPresetOf(presets, selections, engineId).values;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** A preset's name, trimmed and cut to {@link MAX_PRESET_NAME_LENGTH} — `""` for none. */
export const presetNameOf = (name: string): string => name.trim().slice(0, MAX_PRESET_NAME_LENGTH).trim();

/** A value a preset can keep: a finite number, a boolean, or words on one line. */
const isPresetValue = (value: unknown): value is UciOptionValue =>
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean" ||
  (typeof value === "string" && value.length <= MAX_STRING_VALUE_LENGTH && !/[\r\n]/.test(value));

/** The values a stored record names, each one a value a preset can keep — the rest dropped. */
const presetValuesFrom = (value: unknown): Record<string, UciOptionValue> => {
  if (!isRecord(value)) return {};
  const values: Record<string, UciOptionValue> = {};
  for (const [name, entry] of Object.entries(value).slice(0, MAX_PRESET_VALUES)) {
    if (name.trim() !== "" && !/[\r\n]/.test(name) && isPresetValue(entry)) values[name] = entry;
  }
  return values;
};

/**
 * **A preset read back** — the store's normaliser and the import's: a row
 * with no id is dropped; a name that is missing reads as Default's (the
 * Default) or the id; values that cannot be sent are dropped. Never throws.
 */
export const enginePresetFrom = (value: unknown): EnginePreset | undefined => {
  if (!isRecord(value)) return undefined;
  const id = text(value.id);
  if (id === undefined || id.trim() === "") return undefined;
  const name = presetNameOf(text(value.name) ?? "") || (id === DEFAULT_PRESET_ID ? DEFAULT_PRESET_NAME : id);
  return {
    id,
    name,
    values: presetValuesFrom(value.values),
    savedAt: text(value.savedAt) ?? "",
    updatedAt: text(value.updatedAt) ?? text(value.savedAt) ?? "",
  };
};

/** **A selection read back** — an engine id and a preset id, both words. Never throws. */
export const enginePresetSelectionFrom = (value: unknown): EnginePresetSelection | undefined => {
  if (!isRecord(value)) return undefined;
  const id = text(value.id);
  const presetId = text(value.presetId);
  if (id === undefined || id === "" || presetId === undefined || presetId === "") return undefined;
  return { id, presetId, updatedAt: text(value.updatedAt) ?? "" };
};

/* ------------------------------------------------------------------ *
 * A preset against one engine
 * ------------------------------------------------------------------ */

/** Where a preset's values go — the engine that will run them. */
export type PresetEngineContext = {
  /** A page's own WebAssembly build — no file system, Hash at most {@link BROWSER_HASH_CEILING_MB}. */
  inBrowser: boolean;
  /** The names the caller sets itself — never sent from the preset. Absent: {@link BOARD_OWNED_OPTIONS}. */
  owned?: readonly string[];
};

/**
 * The most Hash an in-browser build takes: WebAssembly's memory, not the
 * engine's declared 33,554,432 — 2048 MB crashed the tab (CTA-160,
 * `ENGINE_SETTING_BOUNDS`).
 */
export const BROWSER_HASH_CEILING_MB = ENGINE_SETTING_BOUNDS.hashMb.max;

/**
 * Why a preset's value for one option is not sent as it is — what the form
 * says beside it (CTA-179, decision D).
 */
export type PresetOptionLimit =
  /** A board sets it (Threads, Hash, MultiPV) — never a preset. */
  | { kind: "board-owned" }
  /** The engine does not declare it. */
  | { kind: "absent" }
  /** Pinned by the build — one legal value. */
  | { kind: "pinned" }
  /** A `button` — an action, not a value a preset can keep. */
  | { kind: "button" }
  /** A file path, and the engine is a WebAssembly build with no file system. */
  | { kind: "browser-file" }
  /** Held to the engine's range — `browser` when the in-browser ceiling is what held it. */
  | { kind: "clamped"; to: number; max: number; min: number; browser: boolean }
  /** Not a value of the option's type (a combo's word it does not list, words for a spin). */
  | { kind: "invalid" };

/**
 * The range a `spin` is offered in on this engine — what it declares, and in
 * a browser Hash under {@link BROWSER_HASH_CEILING_MB}. `undefined` for an
 * option that is not a spin with bounds.
 */
export const presetSpinRange = (
  option: EngineOption,
  inBrowser: boolean,
): { min: number; max: number; browserCapped: boolean } | undefined => {
  if (option.type !== "spin" || option.min === undefined || option.max === undefined) return undefined;
  const browserCapped = inBrowser && option.name === "Hash" && option.max > BROWSER_HASH_CEILING_MB;
  return { min: option.min, max: browserCapped ? BROWSER_HASH_CEILING_MB : option.max, browserCapped };
};

/**
 * **The engine's default as a value of its type** — a spin's number, a
 * check's boolean, a combo's or a string's words (Stockfish writes an empty
 * string as `<empty>`). `undefined` for a button, or a default that will not
 * read.
 */
export const optionDefaultValue = (option: EngineOption): UciOptionValue | undefined => {
  const raw = option.defaultValue;
  switch (option.type) {
    case "spin": {
      const number = Number(raw);
      return raw !== undefined && raw !== "" && Number.isFinite(number) ? number : undefined;
    }
    case "check":
      return raw === "true" ? true : raw === "false" ? false : undefined;
    case "combo":
    case "string":
      return raw === undefined || raw === "<empty>" ? "" : raw;
    default:
      return undefined;
  }
};

/**
 * A preset's value as the option takes it — `{ value }`, held to `range` for
 * a spin (with `clamped`), or `undefined` for one it cannot take.
 */
const typedValue = (
  option: EngineOption,
  value: UciOptionValue,
  range: { min: number; max: number } | undefined,
): { value: UciOptionValue; clamped: boolean } | undefined => {
  switch (option.type) {
    case "spin": {
      const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
      if (!Number.isFinite(number)) return undefined;
      const whole = Math.round(number);
      const held = range === undefined ? whole : Math.min(Math.max(whole, range.min), range.max);
      return { value: held, clamped: held !== whole };
    }
    case "check":
      if (typeof value === "boolean") return { value, clamped: false };
      if (value === "true" || value === 1 || value === "1") return { value: true, clamped: false };
      if (value === "false" || value === 0 || value === "0") return { value: false, clamped: false };
      return undefined;
    case "combo": {
      const word = String(value).toLowerCase();
      const match = option.vars?.find((choice) => choice.toLowerCase() === word);
      return match === undefined ? undefined : { value: match, clamped: false };
    }
    case "string":
      return typeof value === "boolean" ? undefined : { value: String(value), clamped: false };
    default:
      return undefined;
  }
};

/** A preset met by one engine: what is sent, and why anything is not sent as written. */
export type ResolvedEnginePreset = {
  /** Option name → the value to send, in the option's type, within its bounds. */
  send: Record<string, UciOptionValue>;
  /** Option name → why the preset's value is held or skipped. A name sent as written has none. */
  limits: Record<string, PresetOptionLimit>;
};

/** One option's verdict: `send` its value, or a `limit` — or both, for a clamped spin. */
const verdictOf = (
  option: EngineOption | undefined,
  value: UciOptionValue,
  context: PresetEngineContext,
): { send?: UciOptionValue; limit?: PresetOptionLimit } => {
  if (option === undefined) return { limit: { kind: "absent" } };
  if ((context.owned ?? BOARD_OWNED_OPTIONS).includes(option.name)) return { limit: { kind: "board-owned" } };
  if (option.type === "button") return { limit: { kind: "button" } };
  if (!isSettableOption(option)) return { limit: { kind: "pinned" } };
  if (context.inBrowser && isFilePathOption(option)) return { limit: { kind: "browser-file" } };
  const range = presetSpinRange(option, context.inBrowser);
  const typed = typedValue(option, value, range);
  if (typed === undefined) return { limit: { kind: "invalid" } };
  if (typed.clamped && range !== undefined && typeof typed.value === "number") {
    return {
      send: typed.value,
      limit: { kind: "clamped", to: typed.value, min: range.min, max: range.max, browser: range.browserCapped },
    };
  }
  return { send: typed.value };
};

const declaredMap = (declared: ReadonlyMap<string, EngineOption> | readonly EngineOption[]): ReadonlyMap<string, EngineOption> =>
  declared instanceof Map ? declared : new Map((declared as readonly EngineOption[]).map((option) => [option.name, option]));

/**
 * **A preset's values against what one engine declares** — the values it
 * sends, each in its option's type and held to the engine's bounds (a spin
 * clamped, Hash under the browser's ceiling), and for every value not sent as
 * written its reason: not declared, a board's own, pinned, a button, a file
 * path a WebAssembly build cannot take, not of the option's type.
 */
export const resolveEnginePreset = (
  values: Readonly<Record<string, UciOptionValue>>,
  declared: ReadonlyMap<string, EngineOption> | readonly EngineOption[],
  context: PresetEngineContext,
): ResolvedEnginePreset => {
  const options = declaredMap(declared);
  const send: Record<string, UciOptionValue> = {};
  const limits: Record<string, PresetOptionLimit> = {};
  for (const [name, value] of Object.entries(values)) {
    const verdict = verdictOf(options.get(name), value, context);
    if (verdict.send !== undefined) send[name] = verdict.send;
    if (verdict.limit !== undefined) limits[name] = verdict.limit;
  }
  return { send, limits };
};

/**
 * **What putting an option back takes** — `{ value }`, the engine's own
 * default as it declared it, for an option a preset set and no longer does;
 * `undefined` for one that cannot be sent at all (a button, a pinned or
 * board-owned one, a file path in a browser, no default).
 */
export const presetResetValue = (
  option: EngineOption | undefined,
  context: PresetEngineContext,
): UciOptionValue | undefined => {
  if (option === undefined || option.defaultValue === undefined) return undefined;
  const verdict = verdictOf(option, option.defaultValue === "<empty>" ? "" : option.defaultValue, context);
  return verdict.limit === undefined ? verdict.send : undefined;
};

/* ------------------------------------------------------------------ *
 * The form's rows
 * ------------------------------------------------------------------ */

/**
 * Why a row of the form cannot be edited, or what it says beside it — the
 * limits above, and the Play boards' own strength (editable, with a note).
 */
export type PresetRowNote = PresetOptionLimit["kind"] | "play-owned" | "browser-hash";

/** One option of the form (`EnginePresetForm`): the engine's declaration and the preset's value. */
export type EnginePresetRow = {
  name: string;
  /** What the engine declared; absent for a value the preset sets that this engine does not declare. */
  option?: EngineOption;
  /** The value shown: the preset's (held to the bounds), else the engine's default. */
  value: UciOptionValue | undefined;
  /** The preset sets it (a Reset puts it back to the engine's default). */
  set: boolean;
  /** Whether the reader can change it here. */
  editable: boolean;
  /** The range offered for a spin — the declared one, Hash under the browser's ceiling. */
  range?: { min: number; max: number };
  /** What the form says beside it. */
  note?: PresetRowNote;
};

/**
 * **The form's rows for one engine** — every option it declares, in its
 * order, then any value the preset sets that this engine does not declare
 * (`absent`, to be removed). Board-owned options are shown read-only, a
 * button and a pinned option too, a file path read-only in a browser; the
 * Play boards' strength editable with its note; a value held to the bounds
 * says so.
 */
export const enginePresetRows = (
  values: Readonly<Record<string, UciOptionValue>>,
  declared: readonly EngineOption[],
  context: PresetEngineContext,
): EnginePresetRow[] => {
  const { limits, send } = resolveEnginePreset(values, declared, context);
  const rows: EnginePresetRow[] = declared.map((option) => {
    const set = Object.hasOwn(values, option.name);
    const range = presetSpinRange(option, context.inBrowser);
    const fixed = verdictOf(option, optionDefaultValue(option) ?? "", context).limit;
    const blocking = fixed !== undefined && fixed.kind !== "invalid" && fixed.kind !== "clamped" ? fixed.kind : undefined;
    const limit = set ? limits[option.name] : undefined;
    const note: PresetRowNote | undefined =
      blocking ??
      limit?.kind ??
      (PLAY_OWNED_OPTIONS.includes(option.name) ? "play-owned" : range?.browserCapped ? "browser-hash" : undefined);
    return {
      name: option.name,
      option,
      value: set && blocking === undefined && send[option.name] !== undefined ? send[option.name] : optionDefaultValue(option),
      set,
      editable: blocking === undefined,
      ...(range === undefined ? {} : { range: { min: range.min, max: range.max } }),
      ...(note === undefined ? {} : { note }),
    };
  });
  const known = new Set(declared.map((option) => option.name));
  for (const [name, value] of Object.entries(values)) {
    if (known.has(name)) continue;
    rows.push({ name, value, set: true, editable: false, note: "absent" });
  }
  return rows;
};
