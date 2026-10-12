import { caseRowOf, type CaseRow } from "../../../lib/analysisCaseRows";
import { gameCaseOf, positionCaseOfFen } from "../../../lib/analysisProjects";
import { parsePgnTree } from "../../../lib/pgn";

/*
  A Project's Cases beside a Case's board (CTA-186), as `caseRowOf` makes
  them. Imported only by the block's gallery and its test.
*/

const NOW = new Date("2026-10-12T09:30:00.000Z");

export const ROWS: readonly CaseRow[] = [
  caseRowOf(
    gameCaseOf(
      { id: "cgame", projectId: "p1", name: "", now: NOW },
      parsePgnTree('[White "Carlsen"]\n[Black "Caruana"]\n[Result "1-0"]\n\n1. e4 e5 1-0'),
    ),
    "Carlsen – Caruana",
  ),
  caseRowOf(positionCaseOfFen({ id: "cpos", projectId: "p1", name: "", now: NOW }, "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41"), "Black to move, move 41"),
  caseRowOf(
    positionCaseOfFen({ id: "clong", projectId: "p1", name: "", now: NOW }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"),
    "The Lucena position, built on the fourth rank with the rook cutting the king off — a long name that wraps",
  ),
];

export const HEBREW_ROWS: readonly CaseRow[] = [
  caseRowOf(positionCaseOfFen({ id: "cheb", projectId: "p1", name: "עמדת לוסנה", now: NOW }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"), "עמדת לוסנה"),
];
