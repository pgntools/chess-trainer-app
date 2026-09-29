import { parsePgnTree } from "../../../lib/pgn";
import type { GameTree } from "../../../lib/gameTree";

/*
  The export panel's sample games (CTA-113), parsed by `src/lib/`'s own
  reader. Imported only by the block's gallery and its test.
*/

/** A game with a comment, a move mark and a side line — every option has something to leave out. */
export const ANNOTATED: GameTree = parsePgnTree('[White "Carlsen"]\n[Black "Nakamura"]\n\n1. e4 {The best by test} c5 2. Nf3 $1 (2. c3 d5) d6 *');

export const ANNOTATED_FEN = "rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3";

/** The start of a game — no moves yet. */
export const EMPTY: GameTree = parsePgnTree("*");

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
