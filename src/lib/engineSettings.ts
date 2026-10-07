/**
 * **The engine knobs a game against Stockfish is played under** — the value the
 * Engine tab drives, and the value a saved game carries so resuming it puts the
 * engine back the way it was.
 *
 * It lives in `src/lib/` because a played game records it
 * (`lib/playedGames.ts`), and plain data cannot import a hook. (It moved here
 * out of the pre-v2 `usePlayWithEngine`, deleted with Masked Pieces' old
 * screen in CTA-79; `EngineSettings.tsx` imports it from here.)
 *
 * It is **not** a description of the running engine. Which of these knobs the
 * worker actually has is the handle's `options`' business (`.claude/rules/chessboard.md`
 * §4.1): the roster is never hardcoded, a pinned option is never posted, and the
 * hook clamps these numbers to whatever the build declared. So a stored value is
 * a *request*, and swapping the binary re-clamps it rather than breaking it.
 */

import { MAX_VARIATIONS_OFFERED } from "./engineAnalysis";
import type { EngineOption } from "./engineTypes";
import { DEFAULT_MAX_DEPTH } from "./uciEngine";

/** The engine knobs the settings tab drives. */
export type EngineSettings = {
  /**
   * UCI `Skill Level`, 0–20 — the strength control of an engine that declares
   * no `UCI_Elo` (`usesEloStrength`). No shipped engine is one; the knob stays
   * because the rule is read off what an engine declares, never off its name.
   */
  skillLevel: number;
  /**
   * UCI `UCI_Elo` — the strength control of an engine that declares it with
   * `UCI_LimitStrength`, as every shipped one does (CTA-153). A request like the
   * rest: the engine module clamps it to the bounds the running build declared
   * (1320–3190 on the Stockfish 19 builds).
   */
  elo: number;
  /** Plies per search. */
  depth: number;
  /** UCI `MultiPV` — how many lines the Variations tab shows. */
  multiPv: number;
  /** Milliseconds per search; `0` means "depth alone decides". */
  moveTimeMs: number;
  /** UCI `Threads`. */
  threads: number;
  /** UCI `Hash`, in MB. */
  hashMb: number;
  /** The colour the human plays; the engine takes the other one. */
  playAs: "white" | "black";
};

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  // `approximateElo(10)` is 2100, so an engine strengthened either way starts alike.
  skillLevel: 10,
  // A strong club player: a game a reader can win, against an engine that still punishes a blunder.
  elo: 2100,
  depth: 14,
  multiPv: 3,
  moveTimeMs: 1000,
  threads: 1,
  hashMb: 16,
  playAs: "white",
};

/**
 * The range each numeric setting is offered in **before** a running worker has
 * said otherwise — the Engine tab's fallback bounds, and the bounds a new-game
 * link (`lib/newGameLink.ts`) clamps its numbers into. Depth stops where the
 * engine wrapper clamps a search (`DEFAULT_MAX_DEPTH`); move time is 0 (no limit) to
 * 10 s. An option the build declares is re-clamped to *its* bounds by the
 * engine module, so these are never the last word on a UCI option.
 */
export const ENGINE_SETTING_BOUNDS = {
  skillLevel: { min: 0, max: 20 },
  // What the Stockfish 19 builds declare for `UCI_Elo`; the running build's own range replaces it.
  elo: { min: 1320, max: 3190 },
  depth: { min: 1, max: DEFAULT_MAX_DEPTH },
  moveTimeMs: { min: 0, max: 10000 },
  multiPv: { min: 1, max: MAX_VARIATIONS_OFFERED },
  threads: { min: 1, max: 4 },
  hashMb: { min: 1, max: 256 },
} as const satisfies Record<Exclude<keyof EngineSettings, "playAs">, { min: number; max: number }>;

/**
 * Which UCI option each numeric setting drives. The names are the engine's, and
 * whether the running build *has* them is answered by the handle's `options`
 * rather than by this table.
 */
export const SETTING_UCI_OPTION = {
  skillLevel: "Skill Level",
  elo: "UCI_Elo",
  multiPv: "MultiPV",
  threads: "Threads",
  hashMb: "Hash",
} as const satisfies Partial<Record<keyof EngineSettings, string>>;

/** The check option that makes `UCI_Elo` the strength — `Skill Level` is ignored while it is on. */
export const LIMIT_STRENGTH_OPTION = "UCI_LimitStrength";

/**
 * Whether the running engine takes its strength as an **Elo** (CTA-153): it
 * declares both `UCI_Elo` and `UCI_LimitStrength`. Read off what it declared,
 * never off its name — the same three-state rule as every other knob
 * (`.claude/rules/chessboard.md` §4.1): an engine without them is
 * strengthened by `Skill Level` alone.
 */
export const usesEloStrength = (engineOptions: ReadonlyMap<string, EngineOption>): boolean =>
  engineOptions.has(SETTING_UCI_OPTION.elo) && engineOptions.has(LIMIT_STRENGTH_OPTION);

/**
 * The option-backed settings as the engine module takes them — UCI name → requested value.
 *
 * Both strength controls are requested and the engine keeps the one it has:
 * `UCI_LimitStrength` is asked on, which an engine that has `UCI_Elo` turns
 * into "play at that Elo" (and ignores `Skill Level`), and an engine without
 * them drops both names (`UciEngine.setOption`), leaving `Skill Level` to
 * decide. The check is written as `1`; `UciEngine` puts it on the wire as `true`.
 */
export const uciOptionsOf = (
  settings: Pick<EngineSettings, keyof typeof SETTING_UCI_OPTION>,
): Record<string, number> => ({
  [SETTING_UCI_OPTION.skillLevel]: settings.skillLevel,
  [SETTING_UCI_OPTION.elo]: settings.elo,
  [LIMIT_STRENGTH_OPTION]: 1,
  [SETTING_UCI_OPTION.multiPv]: settings.multiPv,
  [SETTING_UCI_OPTION.threads]: settings.threads,
  [SETTING_UCI_OPTION.hashMb]: settings.hashMb,
});

/**
 * Settings with the values the running build clamped them to (the engine
 * module's `onUciOptionsReady`) — **the same object** when nothing moved, so
 * a caller's state setter re-runs nothing keyed on it.
 */
export const withClampedUciOptions = <T extends Pick<EngineSettings, keyof typeof SETTING_UCI_OPTION>>(
  current: T,
  clamped: Readonly<Record<string, number>>,
): T => {
  const next: T = {
    ...current,
    skillLevel: clamped[SETTING_UCI_OPTION.skillLevel] ?? current.skillLevel,
    elo: clamped[SETTING_UCI_OPTION.elo] ?? current.elo,
    multiPv: clamped[SETTING_UCI_OPTION.multiPv] ?? current.multiPv,
    threads: clamped[SETTING_UCI_OPTION.threads] ?? current.threads,
    hashMb: clamped[SETTING_UCI_OPTION.hashMb] ?? current.hashMb,
  };
  return next.skillLevel === current.skillLevel &&
    next.elo === current.elo &&
    next.multiPv === current.multiPv &&
    next.threads === current.threads &&
    next.hashMb === current.hashMb
    ? current
    : next;
};

/**
 * A rough Elo for a `Skill Level` — the label beside the strength slider, and
 * the Elo column of a game, where the engine is strengthened by `Skill Level`
 * (one that declares no `UCI_Elo`; no shipped engine since CTA-160).
 *
 * The linear reading of a range from about 1350 at level 0 to full strength at
 * 20. An **estimate**: such an engine is never sent an Elo, so the figure must
 * never be presented as a setting.
 */
export const approximateElo = (skillLevel: number): number =>
  Math.round(1350 + (skillLevel / 20) * (2850 - 1350));

const finiteNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;

/**
 * Read settings back out of stored JSON, filling in the default for anything
 * missing, mistyped or nonsensical. Never throws.
 *
 * A stored record is text another version of this app wrote, so it is treated
 * exactly as a catalog entry is: what cannot be read is replaced rather than
 * allowed to reach the engine. The bounds are not checked here — the hook clamps
 * every number to what the *running* build declares, which is the only authority
 * on what a legal value is.
 */
export const engineSettingsFrom = (value: unknown): EngineSettings => {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_ENGINE_SETTINGS };
  }
  const row = value as Record<string, unknown>;

  return {
    skillLevel: finiteNumber(row.skillLevel, DEFAULT_ENGINE_SETTINGS.skillLevel),
    // A record from before the Elo request has none: the default stands.
    elo: finiteNumber(row.elo, DEFAULT_ENGINE_SETTINGS.elo),
    depth: finiteNumber(row.depth, DEFAULT_ENGINE_SETTINGS.depth),
    multiPv: finiteNumber(row.multiPv, DEFAULT_ENGINE_SETTINGS.multiPv),
    moveTimeMs: finiteNumber(row.moveTimeMs, DEFAULT_ENGINE_SETTINGS.moveTimeMs),
    threads: finiteNumber(row.threads, DEFAULT_ENGINE_SETTINGS.threads),
    hashMb: finiteNumber(row.hashMb, DEFAULT_ENGINE_SETTINGS.hashMb),
    playAs: row.playAs === "black" ? "black" : "white",
  };
};

/** Whether two settings would drive the engine identically. */
export const sameEngineSettings = (
  a: EngineSettings,
  b: EngineSettings,
): boolean =>
  a.skillLevel === b.skillLevel &&
  a.elo === b.elo &&
  a.depth === b.depth &&
  a.multiPv === b.multiPv &&
  a.moveTimeMs === b.moveTimeMs &&
  a.threads === b.threads &&
  a.hashMb === b.hashMb &&
  a.playAs === b.playAs;
