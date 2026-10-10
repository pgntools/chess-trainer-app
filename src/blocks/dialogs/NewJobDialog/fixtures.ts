import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import type { EngineOption } from "../../../lib/engineTypes";

/*
  The New Job dialog's sample data (CTA-177), typed with `src/lib/`'s own.
  Imported only by the block's gallery and its test.
*/

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/** The default build, Stockfish 19 single-thread, once its handshake has landed: Threads pinned at 1. */
export const SINGLE_THREAD: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 256),
  spin("Threads", 1, 1),
  spin("Hash", 1, 33554432),
]);

/** No engine started yet — the saved list's case: what the descriptor says is all there is. */
export const BEFORE_HANDSHAKE: ReadonlyMap<string, EngineOption> = new Map();

/** The options a board seeds from its Engine tab: depth 18, 5 s a move, the light variant. */
export const OPTIONS: ComputerAnalysisOptions = { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, depth: 18, minDepth: 18, moveTimeMs: 5000 };

/** No variant ticked — Start is off, saying why. */
export const NONE_TICKED: ComputerAnalysisOptions = { ...OPTIONS, outputs: [] };

/** A game named by its players. */
export const GAME = "Carlsen – Nepomniachtchi, Dubai 2021";

/** A game whose name is Hebrew (RTL). */
export const HEBREW_GAME = "ניתוח של המשחק מהטורניר";
