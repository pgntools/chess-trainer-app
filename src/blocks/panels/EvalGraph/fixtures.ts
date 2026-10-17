import type { MoveVerdictKind } from "../../../lib/computerAnalysis";
import type { EvalPoint } from "../../../lib/computerAnalysisTree";

/*
  An eval graph's points (CTA-173), typed with `lib/computerAnalysisTree.ts`'s
  own: what `evalSeriesOf` reads off an analysed game. Imported only by the
  block's gallery and its test.
*/

const SANS = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "Na5", "Bc2", "c5", "d4", "Qc7"];
const CPS = [30, 25, 32, 28, 40, 35, 38, 30, 34, 120, 110, 105, 98, -60, -55, -250, -240, -900, -1000, -1000];
const KINDS: Record<number, MoveVerdictKind> = { 10: "inaccuracy", 14: "mistake", 16: "blunder", 18: "missedMate" };

/** A start position's eval, then twenty moves: an inaccuracy, a mistake, a blunder and a missed mate, Black ending mated in 3. */
export const GAME: readonly EvalPoint[] = [
  { nodeId: null, ply: 0, score: { kind: "cp", value: 20 }, cp: 20, kind: null },
  ...SANS.map((san, index): EvalPoint => {
    const ply = index + 1;
    const cp = CPS[index];
    return {
      nodeId: `n${ply}`,
      ply,
      san,
      side: ply % 2 === 1 ? "w" : "b",
      score: index >= 18 ? { kind: "mate", value: -3 } : { kind: "cp", value: cp },
      cp,
      kind: KINDS[ply] ?? null,
    };
  }),
];

/** One evaluated move — a lone point in the middle. */
export const ONE: readonly EvalPoint[] = [GAME[1]];
