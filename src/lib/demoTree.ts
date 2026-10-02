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
 * **Where a board opens** — a `startMove` as an author writes it, read into the
 * line of SAN that reaches it from the tree's start:
 *
 * - a **move number** walks the mainline: `"12"` or `"12."` is the position
 *   after White's 12th move, `"12..."` (or `"...12"`) after Black's; `"0"` is
 *   the start. Numbered from the start position's own move number, and
 *   clamped to the mainline's end, as `?move=` is;
 * - a **line** — `"1. e4 c5 2. Nf3"`, or bare `"e4 c5 Nf3"` — follows those
 *   moves, side lines included, as far as the tree holds them.
 *
 * Absent or unreadable: the start. Never throws.
 */
export const startLineOf = (root: DemoNode, startMove: string | undefined, startFen?: string): string[] => {
  const text = (startMove ?? "").trim();
  if (text === "") return [];
  const numbered = MOVE_NUMBER.exec(text);
  if (numbered !== null) {
    const [, before, digits, after] = numbered;
    const black = before !== undefined || (after !== undefined && after !== ".");
    const chess = startFen === undefined ? new Chess() : new Chess(startFen);
    const offset = (Number(digits) - chess.moveNumber()) * 2;
    const plies = offset + (chess.turn() === "w" ? (black ? 2 : 1) : black ? 1 : 0);
    const line: string[] = [];
    let node = root;
    while (line.length < plies && node.children.length > 0) {
      node = node.children[0];
      line.push(node.san);
    }
    return line;
  }
  const sans = text
    .split(/\s+/)
    .map((token) => token.replace(/^\d+\.+/, "").replace(/^…/, ""))
    .filter((token) => token !== "");
  return demoNodeAt(root, sans).line;
};
