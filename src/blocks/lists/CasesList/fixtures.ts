import { gameCaseOf, positionCaseOfFen, type AnalysisCase } from "../../../lib/analysisProjects";
import { parsePgnTree } from "../../../lib/pgn";

/*
  A Project's Cases (CTA-186), made with `src/lib/analysisProjects.ts`'s own
  constructors. Imported only by the block's gallery and its test.
*/

const NOW = new Date("2026-10-12T09:30:00.000Z");

const GAME = parsePgnTree(`[Event "Club Championship"]
[Date "2024.03.05"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`);

export const CASES: readonly AnalysisCase[] = [
  gameCaseOf({ id: "cgame", projectId: "p1", name: "", now: NOW }, GAME),
  positionCaseOfFen({ id: "cpos", projectId: "p1", name: "", now: NOW }, "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41"),
  positionCaseOfFen({ id: "cnamed", projectId: "p1", name: "Lucena position", now: NOW }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"),
];

export const HEBREW_CASES: readonly AnalysisCase[] = [
  positionCaseOfFen({ id: "cheb", projectId: "p1", name: "עמדת לוסנה", now: NOW }, "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1"),
];

export const manyCases = (count: number): AnalysisCase[] =>
  Array.from({ length: count }, (_, index) =>
    positionCaseOfFen({ id: `c${index}`, projectId: "p1", name: `Case ${index + 1}`, now: NOW }, "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1"),
  );
