import { Chess } from "chess.js";

import type { GameTree, VariationNode } from "./gameTree";
import { playChances } from "./playChance";

/**
 * **A demo board's tree** (CTA-126) — what the front page's mini-boards
 * (`views/shared/DemoBoard.tsx`) walk: from each position, the moves on offer
 * and how likely each is, which is all a board that only *replays* needs. It
 * is read off a `GameTree` (`parsePgnTree`) — a Library game, a repertoire —
 * each move's chance its **play chance** (`lib/playChance.ts`: the `prc`
 * marks, else the lines under it — so a game's one move is a certainty, and a
 * repertoire answers as the trainer would).
 *
 * The children are in the tree's order, so `children[0]` is the mainline —
 * what a board's "next" plays. Pure.
 */
export type DemoNode = {
  /** The move that reached this node; `""` at the root. */
  san: string;
  /** Its share among its siblings, 0–1 — the arrow's width. The root's is 1. */
  chance: number;
  /** The continuations; `children[0]` the mainline. */
  children: readonly DemoNode[];
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
 * **Where Home goes** on a demo board (CTA-165) — `gameTree.ts`'s
 * `branchStartOf` over a line of SAN: the line up to the first move of the
 * innermost side line it is in, leaving out its last move (so on a side
 * line's first move, it climbs to the enclosing one). `[]`, the start, from
 * the mainline. `line` is one `demoNodeAt` has matched.
 */
export const demoBranchStart = (root: DemoNode, line: readonly string[]): string[] => {
  let start: string[] = [];
  let node = root;
  for (const [index, san] of line.slice(0, -1).entries()) {
    const at = node.children.findIndex((child) => child.san === san);
    if (at === -1) break;
    if (at > 0) start = line.slice(0, index + 1);
    node = node.children[at];
  }
  return start;
};

/** The tree's mainline as SAN — `children[0]` at every step, from the root. */
export const demoMainline = (root: DemoNode): string[] => {
  const line: string[] = [];
  for (let node = root.children[0]; node !== undefined; node = node.children[0]) line.push(node.san);
  return line;
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

/** `12`, `12.` (White's 12th), `12...`, `...12` or `…12` (Black's 12th). */
const MOVE_NUMBER = /^(\.\.\.|…)?\s*(\d+)\s*(\.\.\.|…|\.)?$/;

/**
 * **A move number as a ply** — how many half-moves from `startFen` (the
 * standard start when absent) reach the position after it: `"12"` or `"12."`
 * is after White's 12th move, `"12..."` (or `"...12"`) after Black's, `"0"`
 * the start (never below 0). `undefined` for anything that is not a move
 * number — a line of SAN, say. Not clamped to a game: that is the caller's.
 */
export const plyOfMoveNumber = (text: string | undefined, startFen?: string): number | undefined => {
  const numbered = MOVE_NUMBER.exec((text ?? "").trim());
  if (numbered === null) return undefined;
  const [, before, digits, after] = numbered;
  const black = before !== undefined || (after !== undefined && after !== ".");
  const chess = startFen === undefined ? new Chess() : new Chess(startFen);
  const offset = (Number(digits) - chess.moveNumber()) * 2;
  return Math.max(0, offset + (chess.turn() === "w" ? (black ? 2 : 1) : black ? 1 : 0));
};

/** A line of SAN as an author writes it — `"1. e4 c5 2. Nf3"` or `"e4 c5 Nf3"` — as its moves. */
export const sansOfLine = (text: string): string[] =>
  text
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^\d+\.+/, "").replace(/^…/, ""))
    .filter((token) => token !== "");

/**
 * **Where a board opens** — a `startMove` as an author writes it, read into the
 * line of SAN that reaches it from the tree's start:
 *
 * - a **move number** walks the mainline ({@link plyOfMoveNumber}): `"12"`
 *   after White's 12th move, `"12..."` after Black's, `"0"` the start —
 *   clamped to the mainline's end, as `?move=` is;
 * - a **line** — `"1. e4 c5 2. Nf3"`, or bare `"e4 c5 Nf3"` — follows those
 *   moves, side lines included, as far as the tree holds them.
 *
 * Absent or unreadable: the start. Never throws.
 */
export const startLineOf = (root: DemoNode, startMove: string | undefined, startFen?: string): string[] => {
  const text = (startMove ?? "").trim();
  if (text === "") return [];
  const plies = plyOfMoveNumber(text, startFen);
  if (plies !== undefined) {
    const line: string[] = [];
    let node = root;
    while (line.length < plies && node.children.length > 0) {
      node = node.children[0];
      line.push(node.san);
    }
    return line;
  }
  return demoNodeAt(root, sansOfLine(text)).line;
};
