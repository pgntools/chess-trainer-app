import type { TrainingPosition } from "./accuracyTrainer";
import type { PositionResult } from "./computerAnalysis";
import { ANALYSED_PLIES_TAG, ANALYSED_SIDE_TAG, withEngineLine } from "./computerAnalysisTree";
import {
  addLine,
  addMove,
  commentsAt,
  deleteFrom,
  emptyTree,
  findNode,
  mainline,
  nodeAtSanPath,
  pathTo,
  sanPathTo,
  setComments,
  setNags,
  type CommentKind,
  type GameTree,
  type VariationNode,
} from "./gameTree";

/**
 * **A Find Best Move session** (CTA-238, the Accuracy Trainer's Find Best
 * Move v3) — pure: its state, how it moves from position to position, and
 * the tree its Case keeps. The reference is `.claude/rules/accuracy-trainer.md`.
 *
 * **One tree is the session's truth: its Case's.** It starts as the game's
 * mainline alone ({@link sessionBaseTree}) and grows with everything the
 * session does — the reader's variations, comments and glyphs anywhere, the
 * engine's lines, the answers. At each position the board shows that tree
 * **with the position's continuation set aside** ({@link positionViewOf}):
 * every move before it, the game's next move and everything after hidden.
 * Whatever the reader then does on the board is the Case's tree again once
 * the continuation is put back under the position ({@link caseTreeOf}) —
 * the game's move first, so the Case's mainline stays the game's.
 */

/* ─── The Case's tree ─────────────────────────────────────────────────── */

/** The tags an analysis writes about itself — not the session's. */
const ANALYSIS_TAGS: readonly string[] = [ANALYSED_PLIES_TAG, ANALYSED_SIDE_TAG, "Annotator"];

/** **The session's base**: the game's mainline, its tags but the analysis's — no comment, NAG or side line. */
export const sessionBaseTree = (tree: GameTree): GameTree => {
  const headers: GameTree["headers"] = { ...tree.headers };
  for (const tag of ANALYSIS_TAGS) delete headers[tag];
  const moves = mainline(tree).map(({ san, from, to, fen, captured }) => ({ san, from, to, fen, ...(captured === undefined ? {} : { captured }) }));
  return addLine(emptyTree(tree.startFen, headers), null, moves).tree;
};

/** The node a SAN path names — `undefined` where the tree does not hold the whole path. */
const nodeAtPath = (tree: GameTree, path: readonly string[]): { id: string | null } | undefined => {
  const id = nodeAtSanPath(tree, path);
  return sanPathTo(tree, id).length === path.length ? { id } : undefined;
};

/** `texts` appended to a move's comments of `kind` (`null` the game's opening comment), each once. */
const withComments = (tree: GameTree, id: string | null, kind: CommentKind, texts: readonly string[] | undefined): GameTree => {
  if (texts === undefined || texts.length === 0) return tree;
  const current = commentsAt(tree, id, kind);
  const added = texts.filter((text) => !current.includes(text));
  return added.length === 0 ? tree : setComments(tree, id, kind, [...current, ...added]);
};

/**
 * **Moves grafted under a node** — `nodes` (from any tree) and everything
 * under them, added under `parentId`: a move already there followed, its
 * comments and NAGs joined. The same tree back when nothing is new.
 */
const graftMoves = (tree: GameTree, parentId: string | null, nodes: readonly VariationNode[]): GameTree => {
  let next = tree;
  for (const node of nodes) {
    const added = addMove(next, parentId, { san: node.san, from: node.from, to: node.to, fen: node.fen, ...(node.captured === undefined ? {} : { captured: node.captured }) });
    next = withComments(added.tree, added.nodeId, "comments", node.comments);
    next = withComments(next, added.nodeId, "preComments", node.preComments);
    if (node.nags !== undefined && node.nags.length > 0) {
      const nags = findNode(next, added.nodeId)?.nags ?? [];
      const joined = [...nags, ...node.nags.filter((nag) => !nags.includes(nag))];
      if (joined.length !== nags.length) next = setNags(next, added.nodeId, joined);
    }
    next = graftMoves(next, added.nodeId, node.children);
  }
  return next;
};

/** The tree with a node's children (`null` the start's moves) replaced — the path to it copied, every id kept. */
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

/**
 * **An engine's search hung at a position** — each line under the node its
 * SAN path names, as the computer analysis hangs them (`withEngineLine`, the
 * first move carrying its `[%eval]`). The Evaluate Position job's write into
 * the stored Case and the session's own both go through it; again with the
 * same search, the same tree. The same tree back for a path the tree lacks.
 */
export const withPositionEngineLines = (tree: GameTree, path: readonly string[], result: PositionResult): GameTree => {
  const at = nodeAtPath(tree, path);
  if (at === undefined) return tree;
  return result.lines.reduce((next, line) => withEngineLine(next, at.id, result.fen, line), tree);
};

/** What the session writes at a position besides the reader's own: the engine's search, the answer worded. */
export type PositionAnnotation = { path: readonly string[]; engine?: PositionResult; answer?: string };

/** **The session's annotations written** — each position's engine lines and its answer as a comment on it. Idempotent. */
export const withSessionAnnotations = (tree: GameTree, annotations: readonly PositionAnnotation[]): GameTree =>
  annotations.reduce((next, { path, engine, answer }) => {
    const withLines = engine === undefined ? next : withPositionEngineLines(next, path, engine);
    const at = nodeAtPath(withLines, path);
    return answer === undefined || at === undefined ? withLines : withComments(withLines, at.id, "comments", [answer]);
  }, tree);

/* ─── A position's view ───────────────────────────────────────────────── */

/**
 * **A position as the board shows it**: the Case's tree with the position's
 * continuation set aside — its node's children (the game's next move and all
 * after it, the engine's lines there, the answers further on) hidden.
 */
export type PositionView = {
  /** The tree the board opens on — every move before the position, none after. */
  board: GameTree;
  /** The position's node in it (`null` the start), where the board opens. */
  nodeId: string | null;
  /** What was set aside, put back by {@link caseTreeOf}. */
  hidden: readonly VariationNode[];
};

/** **A position's view** of the Case's tree, by its SAN path — `undefined` for a path the tree does not hold. */
export const positionViewOf = (tree: GameTree, path: readonly string[]): PositionView | undefined => {
  const at = nodeAtPath(tree, path);
  if (at === undefined) return undefined;
  const hidden = at.id === null ? tree.moves : (findNode(tree, at.id)?.children ?? []);
  return { board: withChildren(tree, at.id, []), nodeId: at.id, hidden };
};

/** The position's own moves on the board — its node's children, `null` the start's. */
const positionMovesOf = (view: Pick<PositionView, "nodeId">, board: GameTree): readonly VariationNode[] =>
  view.nodeId === null ? board.moves : (findNode(board, view.nodeId)?.children ?? []);

/**
 * **The reader's candidates**: the first moves of their lines from the
 * position, **in their order** — the tree's order of the position's moves,
 * the first their best (a new line goes last; *Promote variation* and *Make
 * main line* reorder them).
 */
export const candidatesOf = (view: Pick<PositionView, "nodeId">, board: GameTree): string[] =>
  positionMovesOf(view, board).map((node) => node.san);

/** Where one of the reader's moves goes in their order. */
export type CandidateMove = "up" | "down";

/**
 * **One of the reader's moves moved** in their order — the `index`-th line
 * from the position one place up or down, the others kept in theirs, every
 * id kept. The same tree back past an end, or for an index it lacks.
 */
export const reorderedCandidates = (view: Pick<PositionView, "nodeId">, board: GameTree, index: number, move: CandidateMove): GameTree => {
  const moves = positionMovesOf(view, board);
  const to = move === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= moves.length || to < 0 || to >= moves.length) return board;
  const reordered = [...moves];
  [reordered[index], reordered[to]] = [reordered[to], reordered[index]];
  return withChildren(board, view.nodeId, reordered);
};

/** **One of the reader's moves deleted** — the `index`-th line from the position, and everything in it. */
export const withoutCandidate = (view: Pick<PositionView, "nodeId">, board: GameTree, index: number): GameTree => {
  const node = positionMovesOf(view, board)[index];
  return node === undefined ? board : deleteFrom(board, node.id);
};

/** Whether the board stands on the position or inside a line from it — where the reader's moves answer it. */
export const isAtPosition = (view: Pick<PositionView, "nodeId">, board: GameTree, nodeId: string | null): boolean => {
  if (nodeId === view.nodeId || view.nodeId === null) return true;
  return pathTo(board, nodeId).some((node) => node.id === view.nodeId);
};

/* ─── The session ─────────────────────────────────────────────────────── */

/** **A session**: its Case, its positions, where the reader is, and what each position holds. */
export type FindBestMoveSession = {
  caseRef: { projectId: string; caseId: string };
  /** The positions asked, in game order. */
  positions: readonly TrainingPosition[];
  /** How many best moves to find at each, in order — fixed for the session. */
  wanted: number;
  /** The one on screen. */
  index: number;
  /** Each position's answer: the reader's moves in their order, `[]` a pass, `null` not yet. */
  answers: readonly (readonly string[] | null)[];
  /** Each position's Evaluate Position job, `null` none. */
  jobs: readonly (string | null)[];
  /**
   * **Each position's lines of the reader's own** — the board's moves from it
   * when it was left, as a tree from its position (`null` none yet): put back
   * on the board when it opens again. The Case's tree holds them too, merged
   * — with the game's moves where they meet, so they cannot be told apart
   * there, and a position's view hides everything under it.
   */
  work: readonly (GameTree | null)[];
  /** A passed position opened to be answered now (`reopenPassed`) — left unanswered, it is passed again. */
  reopened: number | null;
  /** The Case's tree as it stood when the position on screen was opened. */
  tree: GameTree;
  /** The position on screen's view of it. */
  view: PositionView;
};

/**
 * **The Case's tree now** — the board's tree with the position's
 * continuation put back under it: the hidden moves first (the game's move
 * stays the mainline), then the reader's from the position merged in. A board
 * that lost the position (a *Delete from here* before it) would take the rest
 * of the game with it: that edit is not kept — the tree the position opened on.
 */
export const caseTreeOf = (session: Pick<FindBestMoveSession, "tree" | "view">, board: GameTree): GameTree => {
  const { nodeId, hidden } = session.view;
  if (nodeId !== null && findNode(board, nodeId) === null) return session.tree;
  const readers = nodeId === null ? board.moves : (findNode(board, nodeId)?.children ?? []);
  return graftMoves(withChildren(board, nodeId, hidden), nodeId, readers);
};

/**
 * **The position on screen left** — its lines of the reader's own, the board's
 * moves from it, kept (`work`) to be put back when it opens again.
 */
export const leavePosition = (session: FindBestMoveSession, board: GameTree): FindBestMoveSession => {
  const moves = session.view.nodeId === null ? board.moves : (findNode(board, session.view.nodeId)?.children ?? []);
  const position = session.positions[session.index];
  if (position === undefined) return session;
  const work = moves.length === 0 ? null : { ...emptyTree(position.fen), moves: [...moves] };
  // A pass reopened and left unanswered is a pass again.
  const passedAgain = session.reopened === session.index && session.answers[session.index] === null;
  return {
    ...session,
    work: session.work.map((each, at) => (at === session.index ? work : each)),
    reopened: null,
    ...(passedAgain ? { answers: session.answers.map((each, at) => (at === session.index ? [] : each)) } : {}),
  };
};

/**
 * **A position opened** on the Case's tree as it stands — its view, the
 * reader's own lines there put back on the board (`work`) — the session
 * unchanged where its path is not there.
 */
export const openPosition = (session: FindBestMoveSession, index: number, tree: GameTree): FindBestMoveSession => {
  const position = session.positions[index];
  const view = position === undefined ? undefined : positionViewOf(tree, position.path);
  if (view === undefined) return session;
  const work = session.work[index];
  return { ...session, index, tree, view: work === null || work === undefined ? view : { ...view, board: graftMoves(view.board, view.nodeId, work.moves) } };
};

/**
 * **A session started** on its Case's tree, its first position open —
 * `undefined` with no position, or one the tree does not hold.
 */
export const startSession = ({
  caseRef,
  positions,
  wanted,
  tree,
}: Pick<FindBestMoveSession, "caseRef" | "positions" | "wanted" | "tree">): FindBestMoveSession | undefined => {
  const first = positions[0];
  const view = first === undefined ? undefined : positionViewOf(tree, first.path);
  if (view === undefined) return undefined;
  return {
    caseRef,
    positions,
    wanted,
    index: 0,
    answers: positions.map(() => null),
    jobs: positions.map(() => null),
    work: positions.map(() => null),
    reopened: null,
    tree,
    view,
  };
};

/**
 * **A passed position answered again** — "later" — opened as the position on
 * screen on the Case's tree as it stands, its pass taken back so it is
 * answered afresh. Only a pass: the session unchanged for a position answered
 * with moves, not answered, or whose path the tree lacks.
 */
export const reopenPassed = (session: FindBestMoveSession, index: number, tree: GameTree): FindBestMoveSession => {
  const given = session.answers[index];
  if (given === null || given === undefined || given.length > 0) return session;
  const opened = openPosition(session, index, tree);
  return opened === session ? session : { ...opened, answers: opened.answers.map((each, at) => (at === index ? null : each)), reopened: index };
};

/** A comment taken off a position (its SAN path) — the answer it said, once the position is answered again. */
export const withoutPositionComment = (tree: GameTree, path: readonly string[], text: string): GameTree => {
  const at = nodeAtPath(tree, path);
  if (at === undefined) return tree;
  const current = commentsAt(tree, at.id, "comments");
  return current.includes(text) ? setComments(tree, at.id, "comments", current.filter((each) => each !== text)) : tree;
};

/** The position on screen answered — the reader's moves in their order, or none (a pass). */
export const answerPosition = (session: FindBestMoveSession, moves: readonly string[]): FindBestMoveSession => ({
  ...session,
  reopened: session.reopened === session.index ? null : session.reopened,
  answers: session.answers.map((given, index) => (index === session.index ? [...moves] : given)),
});

/** A position's Evaluate Position job, queued. */
export const withPositionJob = (session: FindBestMoveSession, index: number, jobId: string): FindBestMoveSession => ({
  ...session,
  jobs: session.jobs.map((each, at) => (at === index ? jobId : each)),
});

/**
 * **The trained position the board stands at** — the session's position
 * whose SAN path leads to where the board is (`here`, its SAN path from the
 * start), the deepest of them: the position on screen inside its own lines,
 * an earlier one when the reader steps back to it or past it. `undefined`
 * before the first.
 */
export const positionAtPath = (positions: readonly Pick<TrainingPosition, "path">[], here: readonly string[]): number | undefined => {
  let found: number | undefined;
  positions.forEach((position, index) => {
    const leads = position.path.length <= here.length && position.path.every((san, at) => here[at] === san);
    if (leads && (found === undefined || position.path.length > positions[found].path.length)) found = index;
  });
  return found;
};

/** The next position still to answer after the one on screen — `undefined` when none is left. */
export const nextUnanswered = (session: Pick<FindBestMoveSession, "answers" | "index">): number | undefined => {
  const at = session.answers.findIndex((given, index) => index > session.index && given === null);
  return at < 0 ? undefined : at;
};
