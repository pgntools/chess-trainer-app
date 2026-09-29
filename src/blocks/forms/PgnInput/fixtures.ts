import { parsePgnTrees } from "../../../lib/pgn";
import type { GameTree } from "../../../lib/gameTree";
import type { PgnInputLabels } from "./PgnInput";

/*
  The PGN input's sample games and words (CTA-113), read by `src/lib/`'s own
  parser. Imported only by the block's gallery and its test.
*/

export const LABELS: PgnInputLabels = {
  file: "Choose a .pgn file",
  fileHint: "…or drop one anywhere on the editor",
  paste: "Paste PGN here",
  pasteHelp: "The final position of the game you choose goes onto the board.",
  submit: "Load",
  games: { title: "Games in the file", versus: "vs", fallback: (index) => `Game ${index + 1}` },
};

/** A file of three games — one with no players. */
export const GAMES: GameTree[] = parsePgnTrees(
  '[Event "Casual"]\n[Date "2026.09.01"]\n[White "Carlsen"]\n[Black "Nakamura"]\n[Result "1-0"]\n\n1. e4 e5 1-0\n\n' +
    '[Event "?"]\n[White "Anand"]\n[Black "Kramnik"]\n\n1. d4 d5 *\n\n' +
    '[Event "?"]\n\n1. c4 *',
);

export const PASTED = '[Event "Casual"]\n\n1. e4 e5 2. Nf3 Nc6 *';
