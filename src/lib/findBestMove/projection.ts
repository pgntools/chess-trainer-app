import type { PositionGrade, StoredTrainingLine } from "../accuracyTrainer";
import type { GameHeaders } from "../gameModel";
import {
  addLine,
  addMove,
  commentsAt,
  deleteFrom,
  emptyTree,
  findNode,
  pathTo,
  setComments,
  setNags,
  type GameTree,
  type VariationNode,
} from "../gameTree";
import {
  gameMoveOf,
  lineMovesOf,
  positionFenOf,
  replayGame,
  type FindBestMoveRecord,
  type PositionKey,
} from "./model";
import { answerOf, gradeOf, phaseOf } from "./selectors";

/**
 * **What the record looks like as a game** (CTA-244, the design note §5.4,
 * §6.1) — pure projections, re-derived from the record and never read back:
 *
 * - **The movetext** ({@link sessionMovetextOf}): the recorded game as the
 *   mainline; at a graded position every line graded against hung as a
 *   variation, its first move carrying its `[%eval]`, and the answer worded;
 *   at a waiting one the answer's waiting form; at a pass "passed", its
 *   lines hidden; at every position the reader's own lines grafted in. **No
 *   machine command anywhere** — any PGN viewer reads it.
 * - **The board** ({@link boardTreeOf}): the same, up to a position — every
 *   move before it and none after, its own lines alone under it.
 *
 * Both are projections, so a foreign edit of the stored movetext changes
 * nothing the session reads, and the next write re-derives it.
 */

/** How the answers are worded — the catalog's (`accuracyTrainer.session.answer.*`), in the writer's language (`words.ts`). */
export type AnswerWords = {
  passed: string;
  waiting: (moves: readonly string[]) => string;
  graded: (grade: PositionGrade) => string;
};

/** An `[%eval]` of a stored line's score — White's view, as the PGN carries it. */
const evalCommandOf = (score: StoredTrainingLine["score"]): string =>
  `[%eval ${score.kind === "mate" ? `#${score.value}` : (score.value / 100).toFixed(2)}]`;

const EVAL_COMMAND = /\[%eval\s/;

/** `texts` appended to a node's comments (`null` the game's opening comment), each once. */
const withComments = (tree: GameTree, id: string | null, texts: readonly string[] | undefined): GameTree => {
  if (texts === undefined || texts.length === 0) return tree;
  const current = commentsAt(tree, id, "comments");
  const added = texts.filter((text) => !current.includes(text));
  return added.length === 0 ? tree : setComments(tree, id, "comments", [...current, ...added]);
};

/**
 * **Moves grafted under a node** — `nodes` (from any tree) and everything
 * under them, added under `parentId`: a move already there followed, its
 * comments and NAGs joined.
 */
const graftMoves = (tree: GameTree, parentId: string | null, nodes: readonly VariationNode[]): GameTree => {
  let next = tree;
  for (const node of nodes) {
    const added = addMove(next, parentId, { san: node.san, from: node.from, to: node.to, fen: node.fen, ...(node.captured === undefined ? {} : { captured: node.captured }) });
    next = withComments(added.tree, added.nodeId, node.comments);
    if (node.preComments !== undefined && node.preComments.length > 0) {
      const current = commentsAt(next, added.nodeId, "preComments");
      const fresh = node.preComments.filter((text) => !current.includes(text));
      if (fresh.length > 0) next = setComments(next, added.nodeId, "preComments", [...current, ...fresh]);
    }
    if (node.nags !== undefined && node.nags.length > 0) {
      const nags = findNode(next, added.nodeId)?.nags ?? [];
      const joined = [...nags, ...node.nags.filter((nag) => !nags.includes(nag))];
      if (joined.length !== nags.length) next = setNags(next, added.nodeId, joined);
    }
    next = graftMoves(next, added.nodeId, node.children);
  }
  return next;
};

/** A node's children replaced (`null` the start's) — the path to it copied, every id kept. */
const withChildren = (tree: GameTree, id: string | null, children: readonly VariationNode[]): GameTree => {
  if (id === null) return { ...tree, moves: [...children] };
  const path = pathTo(tree, id);
  const target = path.at(-1);
  if (target === undefined) return tree;
  let rebuilt: VariationNode = { ...target, children: [...children] };
  for (let at = path.length - 2; at >= 0; at -= 1) {
    const parent = path[at];
    const child = rebuilt;
    rebuilt = { ...parent, children: parent.children.map((each) => (each.id === child.id ? child : each)) };
  }
  const top = rebuilt;
  return { ...tree, moves: tree.moves.map((each) => (each.id === top.id ? top : each)) };
};

/** A position's lines hung under its node, each first move carrying its `[%eval]` where it has none. */
const withLines = (tree: GameTree, nodeId: string | null, fen: string, lines: readonly StoredTrainingLine[]): GameTree =>
  lines.reduce((next, line) => {
    const moves = lineMovesOf(fen, line.played || line.sans.length === 0 ? [line.san] : line.sans);
    if (moves.length === 0) return next;
    const grown = addLine(next, nodeId, moves).tree;
    const first = (nodeId === null ? grown.moves : (findNode(grown, nodeId)?.children ?? [])).find((node) => node.san === moves[0].san);
    if (first === undefined || (first.comments ?? []).some((text) => EVAL_COMMAND.test(text))) return grown;
    return setComments(grown, first.id, "comments", [evalCommandOf(line.score), ...(first.comments ?? [])]);
  }, tree);

/** The answer at a position as its comment says it — none while it is open or being answered. */
const answerTextOf = (record: FindBestMoveRecord, key: PositionKey, words: AnswerWords): string | undefined => {
  switch (phaseOf(record, key)) {
    case "passed":
      return words.passed;
    case "waiting":
      return words.waiting(answerOf(record, key) ?? []);
    case "graded": {
      const grade = gradeOf(record, key);
      return grade === null ? undefined : words.graded(grade);
    }
    default:
      return undefined;
  }
};

/** The mainline's node ids, by ply — `ids[0]` the start (`null`). */
const mainlineIds = (tree: GameTree): (string | null)[] => {
  const ids: (string | null)[] = [null];
  let nodes = tree.moves;
  while (nodes[0] !== undefined) {
    ids.push(nodes[0].id);
    nodes = nodes[0].children;
  }
  return ids;
};

/** The recorded game's first `plies` moves as a tree — `headers` its tags. */
const gameTreeOf = (record: FindBestMoveRecord, plies: number, headers: GameHeaders = {}): GameTree => {
  const moves = replayGame(record.game)?.lineMoves.slice(0, plies) ?? [];
  return addLine(emptyTree(record.game.startFen, headers), null, moves).tree;
};

/**
 * **One position's projection written into a tree** whose mainline is the
 * recorded game (as far as it goes): at a graded position its lines, then
 * the answer worded — on the game's move there, or on the position itself
 * where it has none — then the reader's own lines.
 */
const decorated = (tree: GameTree, record: FindBestMoveRecord, key: PositionKey, words: AnswerWords): GameTree => {
  const position = record.positions.get(key);
  const fen = positionFenOf(record.game, key);
  if (position === undefined || fen === undefined) return tree;
  const ids = mainlineIds(tree);
  const nodeId = ids[key - 1];
  if (nodeId === undefined) return tree;
  let next = phaseOf(record, key) === "graded" ? withLines(tree, nodeId, fen, position.lines) : tree;
  const answer = answerTextOf(record, key, words);
  if (answer !== undefined) {
    const gameMove = gameMoveOf(record.game, key) === undefined ? undefined : mainlineIds(next)[key];
    next = withComments(next, gameMove ?? nodeId, [answer]);
  }
  return position.work === null ? next : graftMoves(next, nodeId, position.work.moves);
};

/**
 * **The session's movetext** — the readable game, under the source game's own
 * tags (`headers`, the session's dropped by the writer): the whole recorded
 * game, every position's projection on it. Deterministic: the same record
 * and words give the same tree.
 */
export const sessionMovetextOf = (record: FindBestMoveRecord, words: AnswerWords, headers: GameHeaders = {}): GameTree =>
  record.keys.reduce((tree, key) => decorated(tree, record, key, words), gameTreeOf(record, record.game.moves.length, headers));

/** **A position on the board**: the tree it opens on, and the position's node in it (`null` the start). */
export type BoardView = { tree: GameTree; nodeId: string | null };

/**
 * **The board at a position** — every move before it and none after: the
 * recorded game up to it; at every earlier position its lines, its answer
 * and the reader's lines there, as the movetext projects them; at the
 * position, its own lines alone (anything earlier that ran on through it is
 * cut there, so nothing under the position but the reader's work).
 */
export const boardTreeOf = (record: FindBestMoveRecord, key: PositionKey, words: AnswerWords): BoardView => {
  const base = gameTreeOf(record, key - 1);
  const earlier = record.keys.filter((each) => each < key).reduce((tree, each) => decorated(tree, record, each, words), base);
  const nodeId = mainlineIds(earlier)[key - 1] ?? null;
  const cut = withChildren(earlier, nodeId, []);
  const work = record.positions.get(key)?.work;
  return { tree: work === null || work === undefined ? cut : graftMoves(cut, nodeId, work.moves), nodeId };
};

/** The position's own moves on the board — its node's children, `null` the start's. */
const positionMovesOf = (board: GameTree, nodeId: string | null): readonly VariationNode[] =>
  nodeId === null ? board.moves : (findNode(board, nodeId)?.children ?? []);

/**
 * **The reader's work on the board** — the moves under the position, as a
 * tree of its own from its FEN (rebuilt, so its plies and ids are its own,
 * its comments and glyphs kept); `null` with none.
 */
export const workOf = (board: GameTree, nodeId: string | null, fen: string): GameTree | null => {
  const moves = positionMovesOf(board, nodeId);
  return moves.length === 0 ? null : graftMoves(emptyTree(fen), null, moves);
};

/** **The reader's moves** — the first moves of their lines from the position, in their order (a new line goes last). */
export const candidatesOf = (board: GameTree, nodeId: string | null): string[] => positionMovesOf(board, nodeId).map((node) => node.san);

/** One of the reader's moves (its line with it) moved a place up or down their order — the same tree back past an end. */
export const reorderedCandidates = (board: GameTree, nodeId: string | null, index: number, move: "up" | "down"): GameTree => {
  const moves = positionMovesOf(board, nodeId);
  const to = move === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= moves.length || to < 0 || to >= moves.length) return board;
  const reordered = [...moves];
  [reordered[index], reordered[to]] = [reordered[to], reordered[index]];
  return withChildren(board, nodeId, reordered);
};

/** One of the reader's moves deleted — its whole line. */
export const withoutCandidate = (board: GameTree, nodeId: string | null, index: number): GameTree => {
  const node = positionMovesOf(board, nodeId)[index];
  return node === undefined ? board : deleteFrom(board, node.id);
};

/** Whether `at` is on the position or inside a line from it — where the board moves. */
export const isAtPosition = (board: GameTree, nodeId: string | null, at: string | null): boolean =>
  at === nodeId || nodeId === null || pathTo(board, at).some((node) => node.id === nodeId);

/** **Whether a node is the reader's own** — strictly under the position: where the move menu's edits are offered (S5). */
export const isWorkNode = (board: GameTree, nodeId: string | null, at: string | null): boolean =>
  at !== null && at !== nodeId && (nodeId === null || pathTo(board, at).some((node) => node.id === nodeId));
