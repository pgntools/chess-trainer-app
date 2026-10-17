import type { Score } from "./engineAnalysis";
import type { EngineDescriptor } from "./engineTypes";
import { commentsAt, findNode, setComments, type GameTree } from "./gameTree";

/**
 * **The engine's evaluations, written into the game** (CTA-167) — what the
 * Analysis Board's *Write evaluations into the game* switch keeps: each
 * finished search's score as an `[%eval]` command on the move whose position
 * was searched, the form lichess exports and chessops / python-chess read and
 * write:
 *
 * - `[%eval 0.17,20]` — pawns from White's point of view, two decimals, then
 *   the depth the search reached; `[%eval #3,18]` / `[%eval #-2,12]` a mate,
 *   signed by who delivers it (`Score` is already White's view).
 * - **On the move that leads to the evaluated position**; the start position
 *   (no move) in the game's opening comment, as its shapes are (CTA-149).
 * - **Placement**: into the move's existing `[%eval]` if it has one, else first
 *   in its first comment, else as a comment of its own. The prose and every
 *   other command (`[%cal]`, `[%clk]`, `prc:`, `[%games]` …) are untouched.
 * - **Override by depth**: a new evaluation replaces the stored one only when
 *   it is at least as deep. A stored `[%eval]` with no depth (a lichess
 *   import) is always replaced; a shallower search never overwrites a deeper.
 * - **The engine** is named once, in the game's `[Annotator "…"]` tag — PGN
 *   has no per-move engine command.
 *
 * Every write is a `setComments` edit — pure, id-preserving, and the same
 * tree back when it would change nothing — so the board's "changed", Save,
 * Discard and Export treat it as any other edit. Reading stays where it was:
 * `readComment` (the Eval and Depth chips) and `evalOf` / `parseEval`
 * (`lib/nextMoveWeights.ts`). `.claude/rules/pgn-annotations.md` §2.
 */

/** The first `[%eval …]` command of a comment, and its value. */
const EVAL_COMMAND = /\[%eval\s+([^\]]*)\]/i;

/** The depth after the comma of an `[%eval]` value — `0.17,20` → 20. */
const STORED_DEPTH = /,\s*(\d+)\s*$/;

/** An evaluation as an `[%eval]` value: `0.17,20`, `-1.50,18`, `#3,22`, `#-2,12`. */
export const formatEval = (score: Score, depth: number): string => {
  const value =
    score.kind === "mate" ? `#${score.value}` : (score.value / 100).toFixed(2);
  return `${value},${depth}`;
};

/** The depth an `[%eval]` value carries, or `undefined` for one without (`0.17`). */
export const evalDepthOf = (value: string): number | undefined => {
  const match = STORED_DEPTH.exec(value);
  return match === null ? undefined : Number(match[1]);
};

/**
 * `comments` with the evaluation written in — by the placement and override
 * rules above — or **the same array** when the write would change nothing (a
 * deeper evaluation stored, or this one already there).
 */
export const withEval = (
  comments: readonly string[],
  score: Score,
  depth: number,
): readonly string[] => {
  const command = `[%eval ${formatEval(score, depth)}]`;
  const index = comments.findIndex((text) => EVAL_COMMAND.test(text));

  if (index === -1) {
    if (comments.length === 0) return [command];
    return comments.map((text, at) => (at === 0 ? `${command} ${text}` : text));
  }

  const [whole, stored] = EVAL_COMMAND.exec(comments[index]) ?? ["", ""];
  const storedDepth = evalDepthOf(stored);
  if (storedDepth !== undefined && depth < storedDepth) return comments;
  if (whole === command) return comments;
  return comments.map((text, at) =>
    at === index ? text.replace(EVAL_COMMAND, () => command) : text,
  );
};

/**
 * What a game's `Annotator` tag says the engine is — its name, with its
 * version after it unless the name already says it ("Stockfish 19 Lite", not
 * "Stockfish 19 Lite 19").
 */
export const annotatorOf = (engine: Pick<EngineDescriptor, "name" | "version">): string =>
  engine.name.split(/\s+/).includes(engine.version)
    ? engine.name
    : `${engine.name} ${engine.version}`;

/** The tree with its `Annotator` tag set to `annotator` — the same tree when it already is. */
export const withAnnotator = (tree: GameTree, annotator: string): GameTree =>
  tree.headers.Annotator === annotator
    ? tree
    : { ...tree, headers: { ...tree.headers, Annotator: annotator } };

/** One finished search, as the Analysis Board writes it. */
export type EvaluationRecord = {
  /** The move whose position was searched; `null` the start position. */
  nodeId: string | null;
  /** The position searched — a node that no longer leads to it is not written to. */
  fen: string;
  score: Score;
  /** The depth the search reached. */
  depth: number;
  /** The `Annotator` tag set when the evaluation is written (`annotatorOf`). */
  annotator?: string;
};

/**
 * **One evaluation written into the tree**: `withEval` on the move's comments
 * (the game's opening comment for `nodeId` `null`), and — only when that
 * changed something — the `Annotator` tag. The same tree back when nothing
 * changes, when the tree no longer holds the node, or when the node is no
 * longer the position searched (a different game loaded since).
 */
export const recordEvaluation = (tree: GameTree, record: EvaluationRecord): GameTree => {
  const { nodeId, fen, score, depth, annotator } = record;
  const at = nodeId === null ? tree.startFen : findNode(tree, nodeId)?.fen;
  if (at !== fen) return tree;

  const comments = commentsAt(tree, nodeId, "comments");
  const next = withEval(comments, score, depth);
  if (next === comments) return tree;

  const edited = setComments(tree, nodeId, "comments", next);
  return edited === tree || annotator === undefined ? edited : withAnnotator(edited, annotator);
};
