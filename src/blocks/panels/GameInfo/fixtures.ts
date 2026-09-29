import { parsePgnGames } from "../../../lib/pgn";
import type { Game } from "../../../lib/gameModel";

/*
  The Info tab's sample games (CTA-113), read by `src/lib/`'s own parser.
  Imported only by the block's gallery and its test.
*/

export const FULL: Game = parsePgnGames(
  '[Event "World Championship Match"]\n[Site "Dubai UAE"]\n[Date "2021.12.03"]\n[Round "6"]\n[White "Carlsen, Magnus"]\n[Black "Nepomniachtchi, Ian"]\n[Result "1-0"]\n[ECO "D02"]\n[WhiteElo "2855"]\n[Annotator "A reader"]\n\n1. d4 Nf6 1-0',
)[0];

/** The seven-tag roster's placeholders only — nothing worth showing. */
export const PLACEHOLDERS: Game = parsePgnGames('[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n\n1. e4 *')[0];

export const LONG: Game = parsePgnGames(
  '[Event "An event whose name is so long that it has to wrap onto a second line in the panel"]\n[White "Somebody with a very long name indeed"]\n\n1. e4 *',
)[0];
