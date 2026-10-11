/**
 * **The engine knobs a game against Stockfish is played under** — the value a
 * saved game carries: the strength Play's Engine tab sets (an Elo, or Skill
 * Level), the reader's side, and — since CTA-181 not the board's own — the
 * global search settings in effect while it was played
 * (`lib/engineSearchSettings.ts`), kept so a later look can tell how it was
 * searched, and offered back by "Engine options changed" on a resume.
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
import type { EngineDescriptor, EngineOption } from "./engineTypes";
import { isHostedEngineId } from "./engines/ids";
import { withMissingFields } from "./recordedFields";

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
  /**
   * Milliseconds per search; `0` means "depth alone decides", and `1` — the
   * slider's 0-seconds mark — is the instant reply (CTA-163): 0 was already
   * taken by "no limit", so the mark needed its own encoding.
   */
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
 * said otherwise — the strength slider's fallback bounds, the top bar's
 * Engine menu's depth and move time (`lib/engineSearchSettings.ts`, every
 * board's since CTA-181), and the bounds a new-game link
 * (`lib/newGameLink.ts`) clamps its strength into. An option the
 * build declares is re-clamped to *its* bounds by the engine module, so these
 * are never the last word on a UCI option — but they are a ceiling on one.
 *
 * Measured on the Stockfish 19 builds in headless Chromium (CTA-160): the
 * single-thread build reaches depth 20 in about 3.5 s, 24 in 14 s and 26 in
 * 34 s on a fast desktop, so **depth stopped at 40** (well past any search a
 * reader would wait for) — since CTA-185 the slider stops at 50
 * ({@link DEPTH_SLIDER_MAX}) and a depth typed goes up to 99, every shipped
 * build's own clamp (`DEFAULT_MAX_DEPTH`) and **move time at 600 s** (the snap-to-mark
 * slider's last time mark — 300 s from CTA-163, 600 s since CTA-185 — every
 * board's since CTA-181, the analysis boards' own 60 s ceiling gone with
 * their Engine tab). `Hash` took 1024 MB and
 * **2048 MB crashed the tab** — WebAssembly's memory, not the engine's
 * declared 33,554,432 — so 1024 is a hard ceiling; and **Threads stops at
 * 32**, the multi-thread build's own top. What a form offers is lower where
 * the device is smaller: {@link deviceEngineLimits}.
 *
 * Those two ceilings are the **in-browser builds'**. An engine server's
 * engine (`hosted:…`, a native binary — CTA-175) is held to
 * {@link HOSTED_ENGINE_SETTING_BOUNDS} instead: {@link engineSettingBoundsOf}.
 */
export const ENGINE_SETTING_BOUNDS = {
  skillLevel: { min: 0, max: 20 },
  // What the Stockfish 19 builds declare for `UCI_Elo`; the running build's own range replaces it.
  elo: { min: 1320, max: 3190 },
  // Up to the engines' own clamp (`DEFAULT_MAX_DEPTH`, 99) since CTA-185 — typed; the slider stops at `DEPTH_SLIDER_MAX`.
  depth: { min: 1, max: 99 },
  moveTimeMs: { min: 0, max: 600000 },
  multiPv: { min: 1, max: MAX_VARIATIONS_OFFERED },
  threads: { min: 1, max: 32 },
  hashMb: { min: 1, max: 1024 },
} as const satisfies Record<Exclude<keyof EngineSettings, "playAs">, { min: number; max: number }>;

/**
 * **Where the depth slider stops** (CTA-185) — 50; past it a depth is typed,
 * up to {@link ENGINE_SETTING_BOUNDS}' 99, and the slider shows it at its end.
 */
export const DEPTH_SLIDER_MAX = 50;

/**
 * **`Threads` and `Hash` for an engine server's engine** (CTA-175) — a native
 * binary on the reader's computer, which no WebAssembly memory limits:
 * Stockfish's own declared ranges (1–1024 threads, 1–33,554,432 MB). They
 * only keep a number sane; what the server lets one session set (its
 * `maxThreads` / `maxHashMb`, `server/engine-api/README.md`) is what the
 * engine declares, and that declaration is the last word — the engine module
 * and the job runner clamp to it.
 */
export const HOSTED_ENGINE_SETTING_BOUNDS = {
  threads: { min: 1, max: 1024 },
  hashMb: { min: 1, max: 33554432 },
} as const;

/** The range `Threads` and `Hash` are each held to — an engine's resource knobs. */
export type EngineResourceBounds = {
  threads: { min: number; max: number };
  hashMb: { min: number; max: number };
};

/**
 * The bounds `Threads` and `Hash` are held to **for the engine `engineId`
 * names** (CTA-175): an engine server's engine
 * {@link HOSTED_ENGINE_SETTING_BOUNDS}; anything else — an in-browser build,
 * or no engine named — {@link ENGINE_SETTING_BOUNDS}' own, the WebAssembly
 * ceiling. Pass the engine that will **run** (`resolveEngine(choice).id`): a
 * hosted choice whose server is gone runs the default build, which a hosted
 * hash would crash.
 */
export const engineSettingBoundsOf = (engineId?: string | null): EngineResourceBounds =>
  isHostedEngineId(engineId)
    ? HOSTED_ENGINE_SETTING_BOUNDS
    : { threads: ENGINE_SETTING_BOUNDS.threads, hashMb: ENGINE_SETTING_BOUNDS.hashMb };

/**
 * The move-time marks the engine form offers (CTA-163; 1, 5, 10, 30, 60, 300
 * and 600 since CTA-185) — lichess's snap points, in **seconds**. The
 * slider's own value is the mark's **slot** (its index), so the marks space
 * evenly however the seconds grow; the slot past the last mark is unlimited
 * (`moveTimeMs` 0).
 */
export const MOVE_TIME_MARKS_S = [1, 5, 10, 30, 60, 300, 600] as const;

/**
 * The instant reply as stored: `moveTimeMs` 0 is reserved for "no limit", so
 * 0 seconds carries its own encoding (CTA-163) — typed in the move-time box
 * since CTA-185 (no mark is 0 any more); the slider shows it on its first mark.
 */
export const MOVE_TIME_INSTANT_MS = 1;

/** The move-time slider's unlimited slot — past the last mark, the `∞` mark. */
export const MOVE_TIME_UNLIMITED_SLOT = MOVE_TIME_MARKS_S.length;

/** The move-time slider's marks — a slot per mark, labelled in seconds, `∞` for unlimited. */
export const moveTimeSliderMarks = (): ReadonlyArray<{ value: number; label: string }> => [
  ...MOVE_TIME_MARKS_S.map((seconds, slot) => ({ value: slot, label: String(seconds) })),
  { value: MOVE_TIME_UNLIMITED_SLOT, label: "∞" },
];

/**
 * A `moveTimeMs` on the move-time slider: unlimited is the `∞` slot, anything
 * up to the first mark (the instant reply too) that mark, and anything else
 * **where it falls between the marks** (CTA-163) — 7.5 s sits at slot 1.5,
 * between "5" and "10", and the next drag snaps it onto a mark.
 */
export const moveTimeSliderValueOf = (moveTimeMs: number): number => {
  if (moveTimeMs <= 0) return MOVE_TIME_UNLIMITED_SLOT;
  const seconds = moveTimeMs / 1000;
  if (seconds <= MOVE_TIME_MARKS_S[0]) return 0;
  const last = MOVE_TIME_MARKS_S.length - 1;
  for (let slot = 0; slot < last; slot += 1) {
    if (seconds <= MOVE_TIME_MARKS_S[slot + 1]) {
      const from = MOVE_TIME_MARKS_S[slot];
      return slot + (seconds - from) / (MOVE_TIME_MARKS_S[slot + 1] - from);
    }
  }
  return last;
};

/**
 * The `moveTimeMs` a slot of the move-time slider means (CTA-163): the `∞`
 * slot is 0, any other slot its mark's seconds. A slot arrives on a mark —
 * the slider's step is the slot itself — but a rounding keeps a stray
 * fraction honest.
 */
export const moveTimeOfSliderValue = (slot: number): number => {
  if (slot >= MOVE_TIME_UNLIMITED_SLOT) return 0;
  const mark = Math.max(0, Math.round(slot));
  return MOVE_TIME_MARKS_S[mark] * 1000;
};

/**
 * The most of each heavy knob a form should offer — what the device can give
 * an in-browser build ({@link deviceEngineLimits}), or what an engine server's
 * engine declares ({@link engineLimitsOf}).
 */
export type DeviceEngineLimits = { threads: number; hashMb: number };

/**
 * **What this device can give the engine** — the top of the Threads and Hash
 * sliders, read off the browser rather than fixed (CTA-160):
 *
 * - **Threads**: one fewer than the logical cores (`hardwareConcurrency`), so
 *   the page keeps one, and **at most 8** — past that the multi-thread build
 *   searched no deeper in the time measured; 4 where the browser does not say.
 * - **Hash**: by the device's memory (`deviceMemory`, in GB — Chromium only,
 *   and never more than 8): 1024 MB at 8 GB, 512 at 4, 128 below; 256 where
 *   the browser does not say.
 *
 * Each within {@link ENGINE_SETTING_BOUNDS}. Pure over the `navigator` it is
 * handed, so the pre-render (no `navigator`) and a test can call it.
 */
export const deviceEngineLimits = (
  device: { hardwareConcurrency?: number; deviceMemory?: number } | undefined = globalThis.navigator as
    | { hardwareConcurrency?: number; deviceMemory?: number }
    | undefined,
): DeviceEngineLimits => {
  const cores = device?.hardwareConcurrency;
  const threads =
    typeof cores === "number" && Number.isFinite(cores) && cores > 0 ? Math.min(Math.max(cores - 1, 1), 8) : 4;
  const memory = device?.deviceMemory;
  const hashMb =
    typeof memory !== "number" || !Number.isFinite(memory) ? 256 : memory >= 8 ? 1024 : memory >= 4 ? 512 : 128;
  return {
    threads: Math.min(threads, ENGINE_SETTING_BOUNDS.threads.max),
    hashMb: Math.min(hashMb, ENGINE_SETTING_BOUNDS.hashMb.max),
  };
};

/**
 * **The most `Threads` and `Hash` a form offers for an engine** (CTA-175) —
 * what the screens hand the engine forms as their `deviceLimits`:
 *
 * - **An in-browser build**: what this device can give it,
 *   {@link deviceEngineLimits} — unchanged.
 * - **An engine server's engine** (`hosted:…`): the device is the reader's
 *   computer and the server already measured it, so the top of each is what
 *   the engine **declares** — the server's `maxThreads` / `maxHashMb` — read
 *   off the descriptor's `options`, which the server's list carries, so the
 *   form shows the engine's range **before** its first handshake, never the
 *   browser's. An option it does not declare falls back to
 *   {@link HOSTED_ENGINE_SETTING_BOUNDS}' top (the form then calls it absent
 *   once the handshake lands).
 */
export const engineLimitsOf = (
  descriptor: Pick<EngineDescriptor, "id" | "options">,
  device?: { hardwareConcurrency?: number; deviceMemory?: number },
): DeviceEngineLimits => {
  if (!isHostedEngineId(descriptor.id)) return deviceEngineLimits(device);
  const bounds = HOSTED_ENGINE_SETTING_BOUNDS;
  const declaredMax = (name: string, { min, max }: { min: number; max: number }): number => {
    const declared = descriptor.options?.find((option) => option.name === name)?.max;
    return declared === undefined ? max : Math.min(Math.max(declared, min), max);
  };
  return {
    threads: declaredMax(SETTING_UCI_OPTION.threads, bounds.threads),
    hashMb: declaredMax(SETTING_UCI_OPTION.hashMb, bounds.hashMb),
  };
};

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

/**
 * The check option that makes `UCI_Elo` the strength — `Skill Level` is
 * ignored while it is on. Since CTA-181 the engine's selected preset sets it
 * (Settings → Engine); Play's Elo slider is live only while it is on.
 */
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
 * **The strength is Play's own, whether it applies is the preset's**
 * (CTA-181): `UCI_Elo` is always asked for — an engine that has it plays at
 * that Elo **while its `UCI_LimitStrength` is on**, which the engine's
 * selected preset decides (Settings → Engine); off, the engine plays at the
 * preset's strength and the Elo slider says so. Nothing here asks
 * `UCI_LimitStrength` on any more (until CTA-181 it was forced on). `Skill
 * Level` is asked for only `bySkill` — an engine strengthened by Skill Level
 * alone, which declares no `UCI_Elo` (`capabilities.strength === "skill"`,
 * `usesEloStrength`): on an Elo engine it would weaken the engine while the
 * preset has the limit off, so there it is the preset's too.
 *
 * `Hash` and `Threads` are held to {@link ENGINE_SETTING_BOUNDS} here, whatever
 * a stored record or an imported one says: the engine declares far more than a
 * tab can hold, and a hash past the ceiling crashes the tab. `engineId`, the
 * engine that will run, moves those ceilings to its own
 * ({@link engineSettingBoundsOf}: an engine server's engine is not held to
 * the tab's — CTA-175); absent, the in-browser ceilings.
 */
export const uciOptionsOf = (
  settings: Pick<EngineSettings, keyof typeof SETTING_UCI_OPTION>,
  engineId?: string,
  { bySkill = false }: { bySkill?: boolean } = {},
): Record<string, number> => {
  const bounds = engineSettingBoundsOf(engineId);
  return {
    ...(bySkill ? { [SETTING_UCI_OPTION.skillLevel]: settings.skillLevel } : {}),
    [SETTING_UCI_OPTION.elo]: settings.elo,
    [SETTING_UCI_OPTION.multiPv]: settings.multiPv,
    [SETTING_UCI_OPTION.threads]: Math.min(settings.threads, bounds.threads.max),
    [SETTING_UCI_OPTION.hashMb]: Math.min(settings.hashMb, bounds.hashMb.max),
  };
};

/**
 * The strength with the values the running build clamped it to (the engine
 * module's `onUciOptionsReady`) — **the same object** when nothing moved, so
 * a caller's state setter re-runs nothing keyed on it. Only the strength: the
 * search settings are the reader's global ones, never cut back (CTA-181).
 */
export const withClampedStrength = <T extends Pick<EngineSettings, "skillLevel" | "elo">>(
  current: T,
  clamped: Readonly<Record<string, number>>,
): T => {
  const skillLevel = clamped[SETTING_UCI_OPTION.skillLevel] ?? current.skillLevel;
  const elo = clamped[SETTING_UCI_OPTION.elo] ?? current.elo;
  return skillLevel === current.skillLevel && elo === current.elo ? current : { ...current, skillLevel, elo };
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
 * on what a legal value is. A field the row lacks is marked as such
 * (`missingFieldsOf`, `lib/recordedFields.ts`).
 */
export const engineSettingsFrom = (value: unknown): EngineSettings => {
  if (typeof value !== "object" || value === null) {
    return withMissingFields({ ...DEFAULT_ENGINE_SETTINGS }, Object.keys(DEFAULT_ENGINE_SETTINGS));
  }
  const row = value as Record<string, unknown>;

  // A field the stored row lacks is its default — and marked, so it never reads as a choice (CTA-181).
  return withMissingFields({
    skillLevel: finiteNumber(row.skillLevel, DEFAULT_ENGINE_SETTINGS.skillLevel),
    // A record from before the Elo request has none: the default stands.
    elo: finiteNumber(row.elo, DEFAULT_ENGINE_SETTINGS.elo),
    depth: finiteNumber(row.depth, DEFAULT_ENGINE_SETTINGS.depth),
    multiPv: finiteNumber(row.multiPv, DEFAULT_ENGINE_SETTINGS.multiPv),
    moveTimeMs: finiteNumber(row.moveTimeMs, DEFAULT_ENGINE_SETTINGS.moveTimeMs),
    threads: finiteNumber(row.threads, DEFAULT_ENGINE_SETTINGS.threads),
    hashMb: finiteNumber(row.hashMb, DEFAULT_ENGINE_SETTINGS.hashMb),
    playAs: row.playAs === "black" ? "black" : "white",
  }, Object.keys(DEFAULT_ENGINE_SETTINGS).filter((field) => row[field] === undefined));
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
