import type { MoveVerdictKind } from "../../../lib/computerAnalysis";
import type { EvalPoint } from "../../../lib/computerAnalysisTree";
import type { Score } from "../../../lib/engineAnalysis";
import type { NagTone } from "../../../lib/moveAnnotations";

/*
  The eval graph's arithmetic and words, pure — beside `EvalGraph.tsx` so the
  component file exports components only.
*/

/**
 * White's winning chance from a centipawn score, −1 to 1 — lichess's curve
 * (`2 / (1 + e^(−0.00368208 · cp)) − 1`). The graph plots it rather than the
 * centipawns: near equality a pawn moves the line a long way, at +8 hardly at all.
 */
export const winChance = (cp: number): number => 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;

/** A point's place across the graph, 0–100: the moves spread evenly, one point in the middle. */
export const evalX = (index: number, count: number): number => (count <= 1 ? 50 : (index / (count - 1)) * 100);

/** A score's height, 0–100 from the top: White's advantage up, a little room at either edge. */
export const evalY = (cp: number): number => 50 - winChance(cp) * 46;

/** A score as a reader writes it: `+0.35`, `-1.20`, `0.00`, a mate `#3` / `#-2` (White's view). */
export const evalText = (score: Score): string => {
  if (score.kind === "mate") return `#${score.value}`;
  const pawns = score.value / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
};

/** A move numbered from White's first: "12. Nf3", "12... Nc6". */
export const evalPointLabel = (point: EvalPoint): string => {
  const number = Math.ceil(point.ply / 2);
  return `${number}${point.side === "b" ? "..." : "."} ${point.san ?? ""}`.trim();
};

/** A verdict's colour — its move mark's family: `?!`, `?`, `??` (a missed mate a blunder's). */
export const verdictTone = (kind: MoveVerdictKind): NagTone =>
  kind === "inaccuracy" ? "dubious" : kind === "mistake" ? "mistake" : "blunder";
