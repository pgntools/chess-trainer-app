import { enginePresetRows, type EnginePresetRow } from "../../../lib/enginePresets";
import type { EngineOption, UciOptionValue } from "../../../lib/engineTypes";
import type { EnginePresetChoice } from "./EnginePresetForm";

/*
  Engines' declarations and presets' values, typed with `src/lib/`'s own
  types, and the form's rows built from them by the screen's own helper
  (`enginePresetRows`). Imported only by the block's gallery and its test.
*/

/** What the Stockfish 19 Lite single-thread build answers `uci` with. */
export const STOCKFISH_19_LITE: readonly EngineOption[] = [
  { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 1 },
  { name: "Hash", type: "spin", defaultValue: "16", min: 1, max: 33554432 },
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
  { name: "EvalFile", type: "string", defaultValue: "nn-37f18f62d772.nnue" },
];

/** Stockfish 19 native on the engine server — Debug Log File, NumaPolicy and the Syzygy options too. */
export const STOCKFISH_19_NATIVE: readonly EngineOption[] = [
  { name: "Debug Log File", type: "string", defaultValue: "<empty>" },
  { name: "NumaPolicy", type: "string", defaultValue: "auto" },
  { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 19 },
  { name: "Hash", type: "spin", defaultValue: "16", min: 1, max: 4096 },
  { name: "Clear Hash", type: "button" },
  { name: "MultiPV", type: "spin", defaultValue: "1", min: 1, max: 256 },
  { name: "Move Overhead", type: "spin", defaultValue: "10", min: 0, max: 5000 },
  { name: "UCI_ShowWDL", type: "check", defaultValue: "false" },
  { name: "SyzygyPath", type: "string", defaultValue: "<empty>" },
  { name: "SyzygyProbeDepth", type: "spin", defaultValue: "1", min: 1, max: 100 },
  { name: "Style", type: "combo", defaultValue: "Normal", vars: ["Solid", "Normal", "Risky"] },
];

/** A preset that sets a few options — one this engine does not declare among them. */
export const DEEP_ANALYSIS: Readonly<Record<string, UciOptionValue>> = {
  "Move Overhead": 100,
  UCI_ShowWDL: true,
  SyzygyPath: "/tablebases/syzygy",
  Contempt: 24,
};

export const PRESETS: readonly EnginePresetChoice[] = [
  { id: "default", name: "Default", deletable: false },
  { id: "deep", name: "deep-analysis", deletable: true },
  { id: "lite", name: "lite-play", deletable: true },
];

/** The Default preset on the browser build — every option at its default. */
export const BROWSER_DEFAULT_ROWS: readonly EnginePresetRow[] = enginePresetRows({}, STOCKFISH_19_LITE, { inBrowser: true });

/** deep-analysis on the browser build: SyzygyPath and Contempt not declared there, the rest set. */
export const BROWSER_DEEP_ROWS: readonly EnginePresetRow[] = enginePresetRows(DEEP_ANALYSIS, STOCKFISH_19_LITE, { inBrowser: true });

/** deep-analysis on the engine server's native build: the file path editable there. */
export const SERVER_DEEP_ROWS: readonly EnginePresetRow[] = enginePresetRows(DEEP_ANALYSIS, STOCKFISH_19_NATIVE, { inBrowser: false });
