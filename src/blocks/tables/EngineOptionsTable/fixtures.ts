import type { EngineOption } from "../../../lib/engineTypes";

/*
  What engines declare in their `uci` reply, typed with `src/lib/engineTypes.ts`'s
  own `EngineOption`. Imported only by the block's gallery and its test.
*/

/** Stockfish 19 (native) as the engine server lists it — `Threads` and `Hash` under its ceilings. */
export const STOCKFISH_19_NATIVE: readonly EngineOption[] = [
  { name: "Debug Log File", type: "string", defaultValue: "<empty>" },
  { name: "NumaPolicy", type: "string", defaultValue: "auto" },
  { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 19 },
  { name: "Hash", type: "spin", defaultValue: "16", min: 1, max: 4096 },
  { name: "Clear Hash", type: "button" },
  { name: "Ponder", type: "check", defaultValue: "false" },
  { name: "MultiPV", type: "spin", defaultValue: "1", min: 1, max: 256 },
  { name: "Skill Level", type: "spin", defaultValue: "20", min: 0, max: 20 },
  { name: "Move Overhead", type: "spin", defaultValue: "10", min: 0, max: 5000 },
  { name: "nodestime", type: "spin", defaultValue: "0", min: 0, max: 10000 },
  { name: "UCI_Chess960", type: "check", defaultValue: "false" },
  { name: "UCI_LimitStrength", type: "check", defaultValue: "false" },
  { name: "UCI_Elo", type: "spin", defaultValue: "1320", min: 1320, max: 3190 },
  { name: "UCI_ShowWDL", type: "check", defaultValue: "false" },
  { name: "SyzygyPath", type: "string", defaultValue: "<empty>" },
  { name: "SyzygyProbeDepth", type: "spin", defaultValue: "1", min: 1, max: 100 },
  { name: "Syzygy50MoveRule", type: "check", defaultValue: "true" },
  { name: "SyzygyProbeLimit", type: "spin", defaultValue: "7", min: 0, max: 7 },
  { name: "EvalFile", type: "string", defaultValue: "nn-1a298aa575a0.nnue" },
];

/** A build that pins `Threads` and offers a combo — the pinned and the values cases. */
export const PINNED_AND_COMBO: readonly EngineOption[] = [
  { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 1 },
  { name: "Style", type: "combo", defaultValue: "Normal", vars: ["Solid", "Normal", "Risky"] },
  { name: "Clear Hash", type: "button" },
];

/** An engine that declared nothing. */
export const NO_OPTIONS: readonly EngineOption[] = [];
