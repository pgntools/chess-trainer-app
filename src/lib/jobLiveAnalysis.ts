import {
  LOSS_CLAMP_CP,
  moveVerdicts,
  playerReports,
  whiteCp,
  type AnalysisPosition,
  type ComputerAnalysisReport,
  type MoveVerdict,
  type PositionLine,
  type PositionResult,
} from "./computerAnalysis";
import type { EvalPoint } from "./computerAnalysisTree";
import { pvToSan } from "./engineAnalysis";
import { jobSearchOf, type Job } from "./jobs";

/*
  **A job's results so far, read live** (CTA-174) — what the Analysis Board's
  Computer analysis tab shows while a job runs, the way lichess's eval graph
  fills in as its server analysis goes. Pure: the job's source re-parsed
  (`jobSearchOf`, as the runner does) and its checkpoint read — every finished
  position a point of the graph, every move whose both positions are finished
  a verdict (`moveVerdicts` skips the rest).
*/

/** A graph point, with the FEN of the position it is the eval of — how a board finds its own node for it. */
export type LiveEvalPoint = EvalPoint & { fen: string };

/** The last position finished, as the reader is told it. */
export type LiveLatest = {
  /** The move that led to it ("12... Nf6"); absent for the start position. */
  move?: string;
  /** Line 1: its score (White's view), its depth, and its moves numbered as a reader writes them ("9... Be7 10. Be3"). */
  line: PositionLine;
  moves: string;
};

export type JobLiveAnalysis = {
  /** In ply order: the finished positions' evals, each move's verdict where it has one. */
  points: LiveEvalPoint[];
  /** The verdicts so far, over the moves whose two positions are both finished. */
  verdicts: MoveVerdict[];
  /** The report over those verdicts — a side with none yet is `null`. */
  report: ComputerAnalysisReport;
  /** The finished position furthest into the game; absent before the first. */
  latest?: LiveLatest;
};

/** A move numbered as a reader writes it, from the FEN of the position it was played in. */
const moveLabel = (position: AnalysisPosition): string | undefined => {
  if (position.move === undefined) return undefined;
  const [, turn, , , , fullmove] = position.fen.split(" ");
  return `${Number(fullmove) || 1}${turn === "b" ? "..." : "."} ${position.move.san}`;
};

/** SAN moves from `fen`, numbered: "9... Be7 10. Be3 Nb4". The latest line keeps its first eight. */
const numberedLine = (fen: string, sans: readonly string[]): string => {
  const [, turn, , , , fullmove] = fen.split(" ");
  let number = Number(fullmove) || 1;
  let white = turn !== "b";
  return sans
    .map((san, index) => {
      const text = white ? `${number}. ${san}` : index === 0 ? `${number}... ${san}` : san;
      if (!white) number += 1;
      white = !white;
      return text;
    })
    .join(" ");
};

/**
 * **A job's results so far** — `undefined` when its source no longer reads, or
 * its positions are not the record's (the checkpoint would be about another
 * game). Cheap enough per checkpoint; a screen memoises it on the job.
 */
export const jobLiveAnalysis = (job: Job): JobLiveAnalysis | undefined => {
  const search = jobSearchOf(job.source, job.options);
  if (search === undefined) return undefined;
  const { positions } = search;
  if (positions.length !== job.checkpoint.length || positions.some((position, index) => position.fen !== job.positions[index]?.fen)) {
    return undefined;
  }
  const results: (PositionResult | undefined)[] = job.checkpoint.map((entry) => entry ?? undefined);
  const verdicts = moveVerdicts(positions, results, job.options);
  const kindOf = new Map(verdicts.map((verdict) => [verdict.ply, verdict.kind]));

  const points: LiveEvalPoint[] = [];
  let latest: LiveLatest | undefined;
  positions.forEach((position, index) => {
    const result = results[index];
    if (result === undefined) return;
    const line = result.lines[0];
    const before = index === 0 ? undefined : positions[index - 1];
    points.push({
      nodeId: position.nodeId,
      ply: position.ply,
      ...(before?.move === undefined ? {} : { san: before.move.san, side: before.turn }),
      score: line.score,
      cp: Math.min(LOSS_CLAMP_CP, Math.max(-LOSS_CLAMP_CP, whiteCp(line.score, position.turn))),
      kind: kindOf.get(position.ply) ?? null,
      fen: position.fen,
    });
    const move = before === undefined ? undefined : moveLabel(before);
    latest = { ...(move === undefined ? {} : { move }), line, moves: numberedLine(position.fen, pvToSan(position.fen, line.pv.join(" ")).slice(0, 8)) };
  });

  return { points, verdicts, report: playerReports(verdicts), ...(latest === undefined ? {} : { latest }) };
};
