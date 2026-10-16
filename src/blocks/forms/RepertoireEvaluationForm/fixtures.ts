import type { EngineOption } from "../../../lib/engineTypes";
import { DEFAULT_REPERTOIRE_EVALUATION_SETTINGS, type RepertoireEvaluationSettings } from "../../../lib/jobs/kinds/repertoireEvaluation/core";

/*
  The repertoire evaluation form's samples (CTA-219), typed with
  `lib/jobs/kinds/repertoireEvaluation/core.ts`'s own. Imported only by the
  block's gallery and its test.
*/

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/** The default build, Stockfish 19 single-thread: Threads pinned at 1. */
export const SINGLE_THREAD: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 256),
  spin("Threads", 1, 1),
  spin("Hash", 1, 33554432),
]);

/** The multi-thread build: Threads 1–32. */
export const MULTI_THREAD: ReadonlyMap<string, EngineOption> = new Map([...SINGLE_THREAD, spin("Threads", 1, 32)]);

export const BEFORE_HANDSHAKE: ReadonlyMap<string, EngineOption> = new Map();

/** A White repertoire as New job prefills it: depth 18, 5 s a move, the report alone. */
export const WHITE: RepertoireEvaluationSettings = {
  ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  search: { ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search, depth: 18, moveTimeMs: 5000 },
};

/** A Black repertoire, 30 plies, both outputs ticked, stricter thresholds. */
export const BLACK_EVERYTHING: RepertoireEvaluationSettings = {
  ...WHITE,
  side: "b",
  maxPlies: 30,
  thresholds: { inaccuracy: 30, mistake: 80, blunder: 200 },
  outputs: { repertoire: true, pgnFile: true },
};

/** Depth 30 with no time limit. */
export const NO_TIME_LIMIT: RepertoireEvaluationSettings = { ...WHITE, search: { ...WHITE.search, depth: 30, moveTimeMs: 0 } };

/** The engine and preset selects' presets. */
export const PRESETS: readonly { id: string; name: string }[] = [
  { id: "default", name: "Default" },
  { id: "deep", name: "Deep analysis" },
];

/** A repertoire's name, long, with its own punctuation. */
export const LONG_NAME = "Catalan, Open — the 5... dxc4 lines with 6. Qa4+ and everything after";
