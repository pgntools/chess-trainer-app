import type { PositionResult } from "../lib/computerAnalysis";
import type { FindBestMoveRecord } from "../lib/findBestMove/model";
import type { AnswerWords } from "../lib/findBestMove/projection";
import { reduceSession, type SessionEvent } from "../lib/findBestMove/reducer";
import { sessionFromGame, type NewSessionSettings } from "../lib/findBestMove/start";
import { parsePgnTree } from "../lib/pgn";

/*
  Find Best Move v4's test kit (CTA-244): games to start sessions from, plain
  words for the answers, and a search result — shared by the model's tests
  (`lib/findBestMove/*.test.ts`), the job kind's and the screen's.
*/

/** White's 1. e4 and 2. Qh5, Black's 1... e5 — each with the engine's lines (a computer analysis's output). */
export const ANALYSED_PGN = `[Event "Casual game"]
[White "Alice"]
[Black "Bob"]
[Result "*"]
[AnalysedPlies "1-3"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] }) 2... Nc6 *`;

/**
 * **A partial analysis** (CTA-245) — the first eight plies of a full computer
 * analysis (`example_pgn/…-computer-analysis-full-…`): its pruning left no
 * side line where the game's move was the only one in range — 1... e5,
 * 2. Nf3 and 3. Nxe5. White's positions are plies 1, 3, 5 and 7.
 */
export const PARTIAL_PGN = `[Event "Live Chess"]
[White "Alice"]
[Black "Bob"]
[Result "*"]
[AnalysedPlies "1-8"]

1. e4 { [%eval 0.18,70] } (1. d4 { [%eval 0.15,75] } 1... Nf6) (1. Nf3 { [%eval 0.14,75] } 1... d5)
1... e5 { [%eval 0.22,65] } 2. Nf3 { [%eval 0.18,65] }
2... Nf6 { [%eval 0.34,59] } (2... Nc6 { [%eval 0.18,65] } 3. Bc4)
3. Nxe5 { [%eval 0.29,60] } 3... Nc6 { [%eval 1.47,40] } (3... d6 { [%eval 0.29,60] } 4. Nf3)
4. Nxc6 { [%eval 1.87,40] } (4. d4 { [%eval 0.70,40] } 4... Qe7)
4... dxc6 { [%eval 1.42,48] } (4... bxc6 { [%eval 2.06,40] } 5. Nc3) *`;

/** A Ruy Lopez of 38 plies, no analysis — with the engine on, 38 positions over both sides (the 38-to-35 game's shape). */
export const RUY_LOPEZ_38 = `[Event "Training"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7
11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6 15. a4 c5 16. d5 c4 17. Bg5 h6 18. Be3 Nc5 19. Qd2 h5 *`;

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Plain words for the answers — the movetext's, independent of the catalog. */
export const PLAIN_WORDS: AnswerWords = {
  passed: "FBM: passed",
  waiting: (moves) => `FBM: ${moves.join(",")} waiting`,
  graded: (grade) => `FBM: ${grade.found}/${grade.target}, ${grade.inPlace} in place`,
};

const SETTINGS: NewSessionSettings = { moves: 2, engine: false, arrows: true };

/** A session of a PGN's game — both sides unless said, N 2, the engine off. */
export const sessionOfPgn = (
  pgn: string,
  { side = "both", settings = {} }: { side?: FindBestMoveRecord["side"]; settings?: Partial<NewSessionSettings> } = {},
): FindBestMoveRecord => {
  const record = sessionFromGame({ tree: parsePgnTree(pgn), name: "Alice – Bob", side, settings: { ...SETTINGS, ...settings } });
  if (record === undefined) throw new Error("The game trains no position.");
  return record;
};

/** Events applied — the kit's shorthand. */
export const applied = (record: FindBestMoveRecord, events: readonly SessionEvent[]): FindBestMoveRecord => reduceSession(record, events);

/** One search's result at a FEN — its lines' first moves by UCI, scores White's view. */
export const searchOf = (fen: string, lines: readonly { pv: string[]; cp: number }[]): PositionResult => ({
  fen,
  lines: lines.map(({ pv, cp }) => ({ score: { kind: "cp", value: cp }, depth: 20, pv: [...pv] })),
});
