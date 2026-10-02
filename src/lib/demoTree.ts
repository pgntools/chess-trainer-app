import { Chess } from "chess.js";

import type { GameTree, VariationNode } from "./gameTree";
import type { OpeningTreeNode } from "./openingTree";
import { playChances } from "./playChance";

/**
 * **A demo board's tree** (CTA-126) — what the front page's mini-boards
 * (`views/shared/DemoBoard.tsx`) walk: from each position, the moves on offer
 * and how likely each is, which is all a board that only *replays* needs. One
 * shape for the three kinds of thing the front page shows, each a pure
 * adapter below:
 *
 * - **a game** or **a repertoire** — a `GameTree` (`parsePgnTree`), each move's
 *   chance its **play chance** (`lib/playChance.ts`: the `prc` marks, else the
 *   lines under it — so a plain game's one move is a certainty, and a
 *   repertoire answers as the trainer would);
 * - **a collection** — an `OpeningTreeNode` (`lib/openingTree.ts`, the
 *   Library's opening-moves filter), each move's chance its share of the
 *   position's games, with the games' count and results kept for the list.
 *
 * The children are in the source's order, so `children[0]` is the mainline
 * (a tree) or the most played move (a collection) — what a board's "next"
 * plays. Pure.
 */
export type DemoNode = {
  /** The move that reached this node; `""` at the root. */
  san: string;
  /** Its share among its siblings, 0–1 — the arrow's width. The root's is 1. */
  chance: number;
  /** The games through it — a collection's node only. */
  count?: number;
  /** What those games ended in — a collection's node only. */
  results?: OpeningTreeNode["results"];
  /** The continuations; `children[0]` first. */
  children: readonly DemoNode[];
  /** A collection's cut (`OpeningTreeNode.continues`): one game goes on from here, alone. */
  continues?: true;
};

const fromVariations = (san: string, chance: number, moves: readonly VariationNode[]): DemoNode => {
  const chances = playChances(moves);
  return {
    san,
    chance,
    children: moves.map((move, index) => fromVariations(move.san, chances[index], move.children)),
  };
};

/** A game or a repertoire, side lines and all, its chances the play chances. */
export const demoTreeOfGameTree = (tree: GameTree): DemoNode => fromVariations("", 1, tree.moves);

/** A collection's opening tree, its chances the games' shares. */
export const demoTreeOfOpeningTree = (node: OpeningTreeNode, chance = 1): DemoNode => ({
  san: node.san,
  chance,
  count: node.count,
  results: node.results,
  children: node.children.map((child) =>
    demoTreeOfOpeningTree(child, node.count === 0 ? 0 : child.count / node.count),
  ),
  ...(node.continues ? { continues: true as const } : {}),
});

/**
 * Walk `line` down from `root` as far as the tree follows it — the matched
 * moves and the node they reach (`openingNodeAt`'s rule).
 */
export const demoNodeAt = (root: DemoNode, line: readonly string[]): { line: string[]; node: DemoNode } => {
  const matched: string[] = [];
  let node = root;
  for (const san of line) {
    const child = node.children.find((candidate) => candidate.san === san);
    if (child === undefined) break;
    matched.push(san);
    node = child;
  }
  return { line: matched, node };
};

/**
 * `line` as it is printed — `1. e4 e5 2. Nf3`, or `12... Kg8 13. Qh5` from a
 * position with Black to move — numbered from the start position's own move
 * number and side to move.
 */
export const numberedLine = (line: readonly string[], startFen?: string): string => {
  const chess = startFen === undefined ? new Chess() : new Chess(startFen);
  const blackFirst = chess.turn() === "b";
  const first = chess.moveNumber();
  return line
    .map((san, index) => {
      const ply = index + (blackFirst ? 1 : 0);
      const number = first + Math.floor(ply / 2);
      if (ply % 2 === 0) return `${number}. ${san}`;
      return index === 0 ? `${number}... ${san}` : san;
    })
    .join(" ");
};
