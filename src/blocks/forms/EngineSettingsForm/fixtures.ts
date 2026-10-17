import type { EngineOption } from "../../../lib/engineTypes";
import { DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "../../../lib/engineSettings";

/*
  The strength form's sample engines (CTA-109; the strength alone since
  CTA-181), typed with `src/lib/`'s own `EngineOption` and `EngineSettings`.
  Imported only by the block's gallery and its test.
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

/** A build whose Skill Level is pinned — one strength, said so. */
export const PINNED_SKILL_OPTIONS: ReadonlyMap<string, EngineOption> = new Map([spin("MultiPV", 1, 3), spin("Skill Level", 8, 8)]);

/** Before the handshake: nothing declared yet. */
export const NO_OPTIONS: ReadonlyMap<string, EngineOption> = new Map();

/** The strength the form sets — the defaults'. */
export const SETTINGS: Pick<EngineSettings, "skillLevel" | "elo"> = {
  skillLevel: DEFAULT_ENGINE_SETTINGS.skillLevel,
  elo: DEFAULT_ENGINE_SETTINGS.elo,
};

/** Settings → Engine, as a plain link — where the preset's UCI_LimitStrength is turned on. */
export const SETTINGS_LINK = { href: "/settings/engine" } as const;
