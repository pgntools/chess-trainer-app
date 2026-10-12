import { caseRowOf, type CaseRow } from "../../../lib/analysisCaseRows";
import { gameCaseOf, positionCaseOfFen } from "../../../lib/analysisProjects";
import { parsePgnTree } from "../../../lib/pgn";

/*
  A Project's Cases as table rows (CTA-186), made with `src/lib/`'s own
  constructors and `caseRowOf`. Imported only by the block's gallery and its test.
*/

const at = (iso: string) => new Date(iso);

const game = (id: string, white: string, black: string, extra: string, when: string): CaseRow =>
  caseRowOf(
    gameCaseOf(
      { id, projectId: "p1", name: "", now: at(when) },
      parsePgnTree(`[Event "Club Championship"]\n[Round "${id.length}"]\n[Date "2024.03.05"]\n[White "${white}"]\n[Black "${black}"]\n${extra}[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0`),
    ),
    `${white} – ${black}, Club Championship, 2024`,
  );

export const ROWS: readonly CaseRow[] = [
  game("cgame", "Carlsen", "Caruana", '[WhiteElo "2830"]\n[BlackElo "2805"]\n[ECO "C60"]\n[Opening "Ruy Lopez"]\n', "2026-10-12T09:30:00.000Z"),
  game("cding", "Ding", "Nepomniachtchi", '[WhiteElo "2780"]\n[BlackElo "2770"]\n', "2026-10-11T09:30:00.000Z"),
  caseRowOf(
    positionCaseOfFen({ id: "cpos", projectId: "p1", name: "", now: at("2026-10-10T09:30:00.000Z") }, "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41"),
    "Black to move, move 41",
  ),
];

export const HEBREW_ROWS: readonly CaseRow[] = [
  caseRowOf(
    positionCaseOfFen({ id: "cheb", projectId: "p1", name: "עמדת לוסנה", now: at("2026-10-12T09:30:00.000Z") }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"),
    "עמדת לוסנה",
  ),
];

export const manyRows = (count: number): CaseRow[] =>
  Array.from({ length: count }, (_, index) =>
    caseRowOf(
      positionCaseOfFen(
        { id: `c${index}`, projectId: "p1", name: `Case ${index + 1}`, now: at(`2026-10-${String((index % 28) + 1).padStart(2, "0")}T09:30:00.000Z`) },
        "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1",
      ),
      `Case ${index + 1}`,
    ),
  );
