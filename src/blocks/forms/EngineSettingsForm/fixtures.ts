import type { EngineOption } from "../../../lib/engineTypes";
import { DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "../../../lib/engineSettings";

/*
  The engine form's sample engines (CTA-109), typed with `src/lib/`'s own
  `EngineOption` and `EngineSettings`. Imported only by the block's gallery
  and its test.
*/

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/**
 * What the Stockfish 19 single-thread build declares — the default engine:
 * `Threads` pinned, `Hash` adjustable far past what a tab can hold, and an Elo
 * (`UCI_Elo` with `UCI_LimitStrength`) beside `Skill Level`.
 */
export const SHIPPED_OPTIONS: ReadonlyMap<string, EngineOption> = new Map([
  spin("Threads", 1, 1),
  spin("Hash", 1, 33554432),
  spin("MultiPV", 1, 256),
  spin("Skill Level", 0, 20),
  spin("UCI_Elo", 1320, 3190),
  ["UCI_LimitStrength", { name: "UCI_LimitStrength", type: "check", defaultValue: "false" }],
]);

/** The multi-thread build: every knob live, `Threads` to 32. */
export const ADJUSTABLE_OPTIONS: ReadonlyMap<string, EngineOption> = new Map([...SHIPPED_OPTIONS, spin("Threads", 1, 32)]);

/** An engine strengthened by `Skill Level` alone — no `UCI_Elo`; `Threads` and `Hash` pinned. */
export const SKILL_ONLY_OPTIONS: ReadonlyMap<string, EngineOption> = new Map([
  spin("Threads", 1, 1),
  spin("Hash", 16, 16),
  spin("MultiPV", 1, 500),
  spin("Skill Level", 0, 20),
]);

/** An engine with `UCI_Elo` but no `UCI_LimitStrength`: the Elo alone cannot limit it, so Skill Level stays. */
export const ELO_WITHOUT_LIMIT_OPTIONS: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 256),
  spin("Skill Level", 0, 20),
  spin("UCI_Elo", 1320, 3190),
]);

/** A build with no Threads and no Hash at all — absent, not pinned. */
export const SPARSE_OPTIONS: ReadonlyMap<string, EngineOption> = new Map([spin("MultiPV", 1, 3), spin("Skill Level", 0, 8)]);

/** Before the handshake: nothing declared yet. */
export const NO_OPTIONS: ReadonlyMap<string, EngineOption> = new Map();

export const SETTINGS: EngineSettings = DEFAULT_ENGINE_SETTINGS;
