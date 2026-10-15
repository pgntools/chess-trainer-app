import { mainlineGame } from "../../../lib/gameTree";
import type { Game } from "../../../lib/gameModel";
import { parsePgnTree } from "../../../lib/pgn";

/*
  A Library game beside its board (CTA-209), as the game board names it.
  Imported only by the block's gallery and its test.
*/

/** The game's tags, for the Info tab. */
export const GAME: Game = mainlineGame(
  parsePgnTree(
    '[Event "Norway Chess"]\n[Site "Stavanger NOR"]\n[Date "2024.05.30"]\n[Round "4"]\n[White "Carlsen, Magnus"]\n[Black "Caruana, Fabiano"]\n[Result "1-0"]\n[WhiteElo "2830"]\n[BlackElo "2805"]\n[ECO "C65"]\n\n1. e4 e5 1-0',
  ),
);

/** Its title, as `gameTitleOf` makes it. */
export const TITLE = "Carlsen, Magnus – Caruana, Fabiano";

/** Its event, round, date and result, as the board joins them. */
export const CAPTION = "Norway Chess · 4 · 2024.05.30 · 1-0";

export const COLLECTION = "Norway Chess 2024";

export const LONG_TITLE =
  "Nepomniachtchi, Ian Alexandrovich – Abdusattorov, Nodirbek Abdusattorovich";

export const LONG_CAPTION =
  "FIDE World Rapid and Blitz Championships, Rapid Open · 13.4 · 2024.12.28 · 1/2-1/2";

export const HEBREW_TITLE = "גלפנד, בוריס – סמירין, איליה";

export const HEBREW_COLLECTION = "אליפות ישראל";
