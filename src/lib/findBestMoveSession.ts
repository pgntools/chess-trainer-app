import type { PositionResult } from "./computerAnalysis";
import { ANALYSED_PLIES_TAG, ANALYSED_SIDE_TAG, withEngineLine } from "./computerAnalysisTree";
import {
  addLine,
  addMove,
  commentsAt,
  emptyTree,
  findNode,
  mainline,
  nodeAtSanPath,
  sanPathTo,
  setComments,
  setNags,
  type CommentKind,
  type GameTree,
  type VariationNode,
} from "./gameTree";

/**
 * **A Find Best Move v2 session as a Case** (CTA-238) — pure: the tree the
 * session's Case keeps, built from the session alone. The reference is
 * `.claude/rules/accuracy-trainer.md` §7.
 *
 * - **The base** is the game's mainline — its moves and tags, none of its
 *   comments, NAGs, side lines or the analysis's own tags — so everything
 *   else in the Case came from the session.
 * - **At each trained position** (found by its SAN path): the reader's own
 *   analysis grafted under it (their moves, comments and glyphs — a move the
 *   tree has already followed, not added again), the Evaluate Position job's
 *   lines hung as the computer analysis hangs them (`withEngineLine`, each
 *   first move carrying its `[%eval]`), and the reader's answer as a comment
 *   on the position.
 */

/** The tags an analysis writes about itself — not the session's. */
const ANALYSIS_TAGS: readonly string[] = [ANALYSED_PLIES_TAG, ANALYSED_SIDE_TAG, "Annotator"];

/** **The session's base**: the game's mainline, its tags but the analysis's. */
export const sessionBaseTree = (tree: GameTree): GameTree => {
  const headers: GameTree["headers"] = { ...tree.headers };
  for (const tag of ANALYSIS_TAGS) delete headers[tag];
  const moves = mainline(tree).map(({ san, from, to, fen, captured }) => ({ san, from, to, fen, ...(captured === undefined ? {} : { captured }) }));
  return addLine(emptyTree(tree.startFen, headers), null, moves).tree;
};

/** The node a position's SAN path names — `undefined` where the tree does not hold the whole path. */
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
 * **A tree grafted under a node**: `sub` — a tree that starts at that node's
 * position — its moves, comments and NAGs added under `parentId` (a move
 * already there followed, its comments and NAGs joined), its opening comment
 * on the node itself. Pure; the same tree back when nothing is new.
 */
export const graftTree = (tree: GameTree, parentId: string | null, sub: GameTree): GameTree => {
  const graft = (into: GameTree, at: string | null, nodes: readonly VariationNode[]): GameTree => {
    let next = into;
    for (const node of nodes) {
      const added = addMove(next, at, { san: node.san, from: node.from, to: node.to, fen: node.fen, ...(node.captured === undefined ? {} : { captured: node.captured }) });
      next = withComments(added.tree, added.nodeId, "comments", node.comments);
      next = withComments(next, added.nodeId, "preComments", node.preComments);
      if (node.nags !== undefined && node.nags.length > 0) {
        const nags = findNode(next, added.nodeId)?.nags ?? [];
        const joined = [...nags, ...node.nags.filter((nag) => !nags.includes(nag))];
        if (joined.length !== nags.length) next = setNags(next, added.nodeId, joined);
      }
      next = graft(next, added.nodeId, node.children);
    }
    return next;
  };
  return graft(withComments(tree, parentId, "comments", sub.comments), parentId, sub.moves);
};

/**
 * **An engine's search hung at a position** — each line under the node its
 * SAN path names, as the computer analysis hangs them (`withEngineLine`).
 * The job's write into the stored Case and the session's own rebuild both go
 * through it. The same tree back for a path the tree does not hold.
 */
export const withPositionEngineLines = (tree: GameTree, path: readonly string[], result: PositionResult): GameTree => {
  const at = nodeAtPath(tree, path);
  if (at === undefined) return tree;
  return result.lines.reduce((next, line) => withEngineLine(next, at.id, result.fen, line), tree);
};

/** One trained position's work, as the Case keeps it. */
export type SessionPositionWork = {
  /** Its SAN path from the start (`TrainingPosition.path`). */
  path: readonly string[];
  /** The reader's own analysis, a tree starting at the position. */
  analysis?: GameTree;
  /** The Evaluate Position job's search. */
  engine?: PositionResult;
  /** The reader's answer, worded ("Find Best Move: Nf3 — Best (0 cp)"). */
  answer?: string;
};

/** **The session's Case tree**: the base, and at each position its work — the analysis, the engine's lines, the answer. */
export const sessionCaseTreeOf = (base: GameTree, work: readonly SessionPositionWork[]): GameTree =>
  work.reduce((tree, position) => {
    const at = nodeAtPath(tree, position.path);
    if (at === undefined) return tree;
    let next = position.analysis === undefined ? tree : graftTree(tree, at.id, position.analysis);
    if (position.engine !== undefined) next = withPositionEngineLines(next, position.path, position.engine);
    return position.answer === undefined ? next : withComments(next, at.id, "comments", [position.answer]);
  }, base);
