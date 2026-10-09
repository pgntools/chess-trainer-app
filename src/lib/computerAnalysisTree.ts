import { Chess } from "chess.js";

import {
  lossAndMissedMate,
  prunedLines,
  reportOf,
  resultAt,
  scoreOfNode,
  startEvalOf,
  turnOf,
  whiteCp,
  LOSS_CLAMP_CP,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type ComputerAnalysisReport,
  type ComputerAnalysisVariant,
  type MoveVerdict,
  type MoveVerdictKind,
  type PlayerReport,
  type PositionLine,
  type PositionResult,
  type ReportedMove,
} from "./computerAnalysis";
import type { Score, Turn } from "./engineAnalysis";
import { withAnnotator, withEval } from "./engineEvals";
import { gameTag } from "./gameModel";
import {
  addLine,
  commentsAt,
  findNode,
  mainline,
  setComments,
  setNags,
  type GameTree,
  type LineMove,
} from "./gameTree";
import { isMoveMark } from "./moveAnnotations";

/**
 * **The annotated PGNs of a computer analysis** (CTA-172), and the report and
 * eval graph read back from one. The search and the verdicts are
 * `lib/computerAnalysis.ts`. The rules are `.claude/rules/pgn-annotations.md`
 * §6.
 *
 * One run makes up to three trees, each from the source tree with
 * everything it already had (side lines, comments, NAGs):
 *
 * | Variant | Engine lines added | On |
 * | --- | --- | --- |
 * | `light` | the best line that is not the move played | classified moves |
 * | `medium` | every line within `variationRangeCp` of line 1 | classified moves |
 * | `full` | every line within `variationRangeCp` of line 1 | every analysed move |
 *
 * All three carry the same `[%eval]`s, NAGs (`?!` 6, `?` 2, `??` 4, a missed
 * mate `??`), classification comments ("Blunder. Nf3 was best.", "Missed mate
 * in 2! Qxf7# was best."), `Annotator` ("Stockfish 19 Lite [light]") and
 * opening-comment report.
 *
 * **An `[%eval]` on every move whose position was searched**, analysed or
 * not: a move's loss is the eval before it less the eval after it, and the
 * eval before it is on the previous move. So the read-back needs it there,
 * whatever that move's own scope (an eval-only side, a start move). An
 * unanalysed move carries nothing else. The opening comment then says which
 * moves were analysed (`[%analysed 19-80 w]`), so the read-back leaves the
 * others out of the report. A tree without that command (a lichess export)
 * counts every mainline move with an `[%eval]`.
 */

/** The NAG each verdict writes: `?!`, `?`, `??`, and `??` for a missed mate. */
const VERDICT_NAG: Readonly<Record<MoveVerdictKind, number>> = {
  inaccuracy: 6,
  mistake: 2,
  blunder: 4,
  missedMate: 4,
};

/** The comment a verdict writes: "Mistake. Nf3 was best.", "Missed mate in 2! Qxf7# was best." */
const verdictComment = (verdict: Pick<MoveVerdict, "kind" | "missedMateIn" | "bestSan">): string | undefined => {
  const best = verdict.bestSan === undefined ? "" : ` ${verdict.bestSan} was best.`;
  switch (verdict.kind) {
    case "missedMate":
      return `Missed mate in ${verdict.missedMateIn ?? 1}!${best}`;
    case "blunder":
      return `Blunder.${best}`;
    case "mistake":
      return `Mistake.${best}`;
    case "inaccuracy":
      return `Inaccuracy.${best}`;
    default:
      return undefined;
  }
};

/** A comment this writer wrote as a verdict — taken out before a new run writes its own. */
const VERDICT_COMMENT = /^(?:(?:Inaccuracy|Mistake|Blunder)\.|Missed mate in \d+!)(?: \S+ was best\.)?$/;

/** The scope command: `[%analysed 19-80]`, `[%analysed 19-80 w]`. */
const SCOPE_COMMAND = /\[%analysed\s+(\d+)-(\d+)(?:\s+([wb]))?\s*\]/;

/** Which mainline moves an analysis covered: plies (inclusive), and an eval-only side. */
export type AnalysisScope = { fromPly: number; toPly: number; side?: Turn };

/** The scope a tree's opening comment names, or `undefined` for none (a lichess export). */
export const analysisScopeOf = (tree: GameTree): AnalysisScope | undefined => {
  for (const text of tree.comments ?? []) {
    const match = SCOPE_COMMAND.exec(text);
    if (match === null) continue;
    const side = match[3] as Turn | undefined;
    return { fromPly: Number(match[1]), toPly: Number(match[2]), ...(side === undefined ? {} : { side }) };
  }
  return undefined;
};

const scopeCommand = (scope: AnalysisScope): string =>
  `[%analysed ${scope.fromPly}-${scope.toPly}${scope.side === undefined ? "" : ` ${scope.side}`}]`;

const inScope = (scope: AnalysisScope | undefined, ply: number, side: Turn): boolean =>
  scope === undefined ||
  (ply >= scope.fromPly && ply <= scope.toPly && (scope.side === undefined || scope.side === side));

/** One side's summary as the opening comment writes it. */
const reportLine = (label: string, report: PlayerReport | null): string => {
  if (report === null) return `${label}: not analysed.`;
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const parts = [
    plural(report.inaccuracies, "inaccuracy", "inaccuracies"),
    plural(report.mistakes, "mistake", "mistakes"),
    plural(report.blunders, "blunder", "blunders"),
    plural(report.missedMates, "missed mate", "missed mates"),
    `ACPL ${report.acpl ?? "?"}`,
    `accuracy ${report.accuracy === null ? "?" : `${Math.round(report.accuracy)}%`}`,
  ];
  return `${label}: ${parts.join(", ")}.`;
};

/** The opening comment's report, its scope command first. */
const reportComment = (
  tree: GameTree,
  report: ComputerAnalysisReport,
  scope: AnalysisScope,
  { variant, engine, depth }: { variant: ComputerAnalysisVariant; engine: string; depth: number },
): string => {
  const player = (key: "White" | "Black") => {
    const name = gameTag(tree.headers, key);
    return name === undefined ? key : `${key} (${name})`;
  };
  return [
    `${scopeCommand(scope)} Computer analysis (${variant}), ${engine}, depth ${depth}.`,
    reportLine(player("White"), report.w),
    reportLine(player("Black"), report.b),
  ].join(" ");
};

/** `tree` with `edit` applied to the comments at `id` (`null` the opening comment). */
const editComments = (
  tree: GameTree,
  id: string | null,
  edit: (comments: readonly string[]) => readonly string[],
): GameTree => setComments(tree, id, "comments", edit(commentsAt(tree, id, "comments")));

/**
 * An engine line as a side line from `parentId`, whose position is `fen`:
 * its moves replayed and added in one `addLine` (a move already there is
 * followed, not added again), **cut at the first move that does not play**.
 * Its first move carries the line's `[%eval]`.
 */
const withEngineLine = (
  tree: GameTree,
  parentId: string | null,
  fen: string,
  line: PositionLine,
): GameTree => {
  const chess = new Chess(fen);
  const moves: LineMove[] = [];
  for (const uci of line.pv) {
    let move;
    try {
      move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    } catch {
      break;
    }
    moves.push({
      san: move.san,
      from: move.from,
      to: move.to,
      fen: chess.fen(),
      ...(move.captured === undefined ? {} : { captured: move.captured }),
    });
  }
  const first = moves[0];
  if (first === undefined) return tree;

  const evalCommand = withEval([], line.score, line.depth);
  const existing = (parentId === null ? tree.moves : (findNode(tree, parentId)?.children ?? [])).find(
    (node) => node.san === first.san,
  );
  if (existing === undefined) {
    return addLine(tree, parentId, [{ ...first, comments: [...evalCommand] }, ...moves.slice(1)]).tree;
  }
  // The line begins with a move the tree already has: its eval is written where that move's is.
  const grown = addLine(tree, parentId, moves).tree;
  return editComments(grown, existing.id, (comments) => withEval(comments, line.score, line.depth));
};

export type ComputerAnalysisTreeInput = {
  /** The tree analysed; every output keeps all it has. */
  source: GameTree;
  positions: readonly AnalysisPosition[];
  results: readonly (PositionResult | undefined)[];
  verdicts: readonly MoveVerdict[];
  variant: ComputerAnalysisVariant;
  /** The engine as the `Annotator` names it (`annotatorOf`): "Stockfish 19 Lite". */
  engine: string;
  options: Pick<ComputerAnalysisOptions, "variationRangeCp" | "side" | "depth">;
};

/**
 * **One variant's annotated tree** (the table in the module note):
 *
 * - every searched position's line 1 as the `[%eval]` of the move that leads
 *   there (the opening comment for the start), through `withEval`, so a deeper
 *   stored eval stays;
 * - each verdict's NAG, which replaces the move's move-quality NAG (other
 *   NAGs stay), and its comment, after the move's own;
 * - the variant's engine lines as side lines;
 * - `Annotator` "<engine> [<variant>]", and the report in the opening comment.
 *
 * Re-analysing an output replaces this writer's verdict comments and report
 * rather than adding a second.
 */
export const computerAnalysisTree = ({
  source,
  positions,
  results,
  verdicts,
  variant,
  engine,
  options,
}: ComputerAnalysisTreeInput): GameTree => {
  let tree = editComments(source, null, (comments) => comments.filter((text) => !SCOPE_COMMAND.test(text)));

  positions.forEach((position, index) => {
    const best = resultAt(positions, results, index)?.lines[0];
    if (best === undefined) return;
    tree = editComments(tree, position.nodeId, (comments) => withEval(comments, best.score, best.depth));
  });

  const positionOfMove = new Map(
    positions.flatMap((position, index) => (position.move === undefined ? [] : [[position.move.nodeId, index] as const])),
  );

  const placed = verdicts.flatMap((verdict) => {
    const index = positionOfMove.get(verdict.nodeId);
    const position = index === undefined ? undefined : positions[index];
    return index === undefined || position?.move === undefined ? [] : [{ verdict, index, position, played: position.move.uci }];
  });

  // The mainline's annotations first, while the tree is small: each edit copies the path to its move.
  for (const { verdict } of placed) {
    const comment = verdictComment(verdict);
    tree = editComments(tree, verdict.nodeId, (comments) => [
      ...comments.filter((text) => !VERDICT_COMMENT.test(text)),
      ...(comment === undefined ? [] : [comment]),
    ]);
    if (verdict.kind !== null) {
      const nags = findNode(tree, verdict.nodeId)?.nags ?? [];
      tree = setNags(tree, verdict.nodeId, [VERDICT_NAG[verdict.kind], ...nags.filter((nag) => !isMoveMark(nag))]);
    }
  }

  for (const { verdict, index, position, played } of placed) {
    if (variant !== "full" && verdict.kind === null) continue;
    const alternatives = prunedLines(resultAt(positions, results, index)?.lines ?? [], position.turn, options).filter(
      (line) => line.pv[0] !== undefined && line.pv[0] !== played,
    );
    for (const line of variant === "light" ? alternatives.slice(0, 1) : alternatives) {
      tree = withEngineLine(tree, position.nodeId, position.fen, line);
    }
  }

  const analysed = positions.filter((position) => position.analysed);
  const first = analysed[0];
  const last = analysed.at(-1);
  if (first !== undefined && last !== undefined) {
    const scope: AnalysisScope = {
      fromPly: first.ply + 1,
      toPly: last.ply + 1,
      ...(options.side === "both" ? {} : { side: options.side }),
    };
    const report = reportComment(tree, reportOf(verdicts), scope, { variant, engine, depth: options.depth });
    tree = editComments(tree, null, (comments) => [...comments, report]);
  }

  return withAnnotator(tree, `${engine} [${variant}]`);
};

/* ─── Read back ───────────────────────────────────────────────────────── */

/** A verdict as a move's NAGs give it: `??` over `?` over `?!`. */
const kindOfNags = (nags: readonly number[] | undefined): MoveVerdictKind | null =>
  nags?.includes(4) ? "blunder" : nags?.includes(2) ? "mistake" : nags?.includes(6) ? "inaccuracy" : null;

/** One mainline move with an `[%eval]`, as read back. */
type ReadBackMove = ReportedMove & {
  nodeId: string;
  ply: number;
  san: string;
  score: Score;
  /** In the analysis's scope, so in the report. */
  reported: boolean;
};

/**
 * The mainline's evaluated moves: each one's score, and for one in scope its
 * kind (the NAGs; a `??` whose evals show a mate given up is a missed mate)
 * and its loss, from the eval before it (the previous move's, or the opening
 * comment's at the first move) when there is one.
 */
const readBack = (tree: GameTree): ReadBackMove[] => {
  const scope = analysisScopeOf(tree);
  const start = startEvalOf(tree);
  let before = start === undefined ? undefined : { score: start.score, turn: turnOf(tree.startFen) };
  let side = turnOf(tree.startFen);
  const moves: ReadBackMove[] = [];

  for (const node of mainline(tree)) {
    const score = scoreOfNode(node);
    const after = score === undefined ? undefined : { score, turn: turnOf(node.fen) };
    if (after !== undefined && score !== undefined) {
      const reported = inScope(scope, node.ply, side);
      const measured = before === undefined || !reported ? undefined : lossAndMissedMate(before, after, side);
      const nagKind = kindOfNags(node.nags);
      const kind = nagKind === "blunder" && measured?.missedMateIn !== undefined ? "missedMate" : nagKind;
      moves.push({
        nodeId: node.id,
        ply: node.ply,
        side,
        san: node.san,
        score,
        reported,
        kind: reported ? kind : null,
        ...(measured === undefined ? {} : { loss: measured.loss }),
      });
    }
    before = after;
    side = side === "w" ? "b" : "w";
  }
  return moves;
};

/**
 * **The report read back from a tree**: the counts from the mainline's NAGs
 * and the losses from its `[%eval]`s, over the moves in the opening
 * comment's scope (every evaluated move when it names none). A move with no
 * eval before it counts, but not in the ACPL. For this writer's trees it is
 * `playerReports` of the run. It reads a lichess export too.
 */
export const reportFromTree = (tree: GameTree): ComputerAnalysisReport =>
  reportOf(readBack(tree).filter((move) => move.reported));

/** **One point of the eval graph.** */
export type EvalPoint = {
  /** The move it follows; `null` the start position (the opening comment's eval). */
  nodeId: string | null;
  /** Plies from the start: 0 is the start position. */
  ply: number;
  /** The move and who played it; absent at the start. */
  san?: string;
  side?: Turn;
  /** The eval, White's view. */
  score: Score;
  /** The same in centipawns, White's view, a mate at ±1000, clamped to ±1000 — what a graph plots. */
  cp: number;
  /** The move's verdict, in scope. */
  kind: MoveVerdictKind | null;
};

/** **The eval graph's points**: the start position's eval when the tree has one, then every evaluated mainline move. */
export const evalSeriesOf = (tree: GameTree): EvalPoint[] => {
  const plot = (score: Score, turn: Turn) =>
    Math.min(LOSS_CLAMP_CP, Math.max(-LOSS_CLAMP_CP, whiteCp(score, turn)));
  const start = startEvalOf(tree);
  return [
    ...(start === undefined
      ? []
      : [{ nodeId: null, ply: 0, score: start.score, cp: plot(start.score, turnOf(tree.startFen)), kind: null }]),
    ...readBack(tree).map((move): EvalPoint => {
      const fen = findNode(tree, move.nodeId)?.fen ?? tree.startFen;
      return {
        nodeId: move.nodeId,
        ply: move.ply,
        san: move.san,
        side: move.side,
        score: move.score,
        cp: plot(move.score, turnOf(fen)),
        kind: move.kind,
      };
    }),
  ];
};
