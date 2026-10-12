import { caseRowOf, type CaseRow } from "../../../lib/analysisCaseRows";
import { gameCaseOf, positionCaseOfFen } from "../../../lib/analysisProjects";
import { mainlineGame } from "../../../lib/gameTree";
import type { Game } from "../../../lib/gameModel";
import { parsePgnTree } from "../../../lib/pgn";

/*
  A Case beside its board (CTA-186), as `caseRowOf` makes it. Imported only
  by the block's gallery and its test.
*/

const NOW = new Date("2026-10-12T09:30:00.000Z");

const GAME_TREE = parsePgnTree(
  '[Event "Norway Chess"]\n[Site "Stavanger NOR"]\n[Date "2024.05.30"]\n[Round "4"]\n[White "Carlsen, Magnus"]\n[Black "Caruana, Fabiano"]\n[Result "1-0"]\n[WhiteElo "2830"]\n[BlackElo "2805"]\n[ECO "C65"]\n\n1. e4 e5 1-0',
);

export const GAME_ROW: CaseRow = caseRowOf(gameCaseOf({ id: "cgame", projectId: "p1", name: "", now: NOW }, GAME_TREE), "Carlsen – Caruana");

/** The game's tags, for the Info tab. */
export const GAME: Game = mainlineGame(GAME_TREE);

export const POSITION_ROW: CaseRow = caseRowOf(
  positionCaseOfFen({ id: "clong", projectId: "p1", name: "", now: NOW }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"),
  "The Lucena position, built on the fourth rank with the rook cutting the king off — a long name that wraps",
);

export const HEBREW_ROW: CaseRow = caseRowOf(
  positionCaseOfFen({ id: "cheb", projectId: "p1", name: "עמדת לוסנה", now: NOW }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"),
  "עמדת לוסנה",
);
