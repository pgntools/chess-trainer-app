import { Chess } from "chess.js";

import { addMove, emptyTree, nodeAtSanPath, sanPathTo, type GameTree } from "./gameTree";

/**
 * **A permanent link to a position in a repertoire** (CTA-63) —
 * `/repertoires/<id>?at=e4,c6,d4`.
 *
 * A position is addressed by the moves from the start, as SAN — not by a node
 * id, which is minted per parse and means nothing in the next session. It is
 * the saved analysis' rule (`sanPathTo` / `nodeAtSanPath`, `lib/gameTree.ts`)
 * turned into a query parameter: SAN identifies a move within its position,
 * and never contains a comma, so the moves are joined by one. The value is
 * URL-encoded by `URLSearchParams`, so `+`, `#` and `=` travel intact.
 *
 * Reading one is non-throwing and **as far as it goes**: a path the tree no
 * longer holds all of — the repertoire was edited, or the link pointed into a
 * line added in a session and never saved — opens at the last move it
 * recognises rather than nowhere. An empty or absent value is the start.
 */

/** The query parameter a repertoire's position travels in. */
export const REPERTOIRE_AT_PARAM = "at";

/** The parameter's value for `nodeId` in `tree` — `""` for the start position. */
export const atParamOf = (tree: GameTree, nodeId: string | null): string =>
  sanPathTo(tree, nodeId).join(",");

/** The SANs a parameter names, in order — none for an empty or absent value. */
export const atParamSans = (value: string | null | undefined): string[] =>
  value === null || value === undefined
    ? []
    : value.split(",").map((san) => san.trim()).filter((san) => san !== "");

/** The node a parameter names in `tree`, as far as it goes; `null` is the start. */
export const nodeAtParam = (tree: GameTree, value: string | null | undefined): string | null => {
  const sans = atParamSans(value);
  return sans.length === 0 ? null : nodeAtSanPath(tree, sans);
};

/**
 * One line from a start position, played SAN by SAN — how a board with
 * nothing behind it but a position (the Openings explorer) turns its own
 * `?at=` link back into the moves it names. Stops at the first SAN that is
 * not legal there, so a stale link goes as far as it still reads.
 */
export const lineTreeOf = (startFen: string, sans: readonly string[]): GameTree => {
  let tree = emptyTree(startFen);
  let nodeId: string | null = null;
  let chess: Chess;
  try {
    chess = new Chess(startFen);
  } catch {
    return tree;
  }
  for (const san of sans) {
    let move;
    try {
      move = chess.move(san);
    } catch {
      break;
    }
    ({ tree, nodeId } = addMove(tree, nodeId, {
      san: move.san,
      from: move.from,
      to: move.to,
      fen: chess.fen(),
      ...(move.captured === undefined ? {} : { captured: move.captured }),
    }));
  }
  return tree;
};
