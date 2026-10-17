import { describe, expect, it } from "vitest";

import { caseFirstDirection, caseRowOf, caseSortValue, filteredCaseRows, newestCaseFirst } from "./analysisCaseRows";
import { gameCaseOf, positionCaseOfFen } from "./analysisProjects";
import { parsePgnTree } from "./pgn";

const GAME = gameCaseOf(
  { id: "cgame", projectId: "p1", name: "", now: new Date("2026-10-12T10:00:00.000Z") },
  parsePgnTree(`[Event "Club Championship"]
[Date "2024.03.05"]
[White "Carlsen"]
[Black "Caruana"]
[WhiteElo "2830"]
[ECO "C60"]
[Opening "Ruy Lopez"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0`),
);
const POSITION = positionCaseOfFen(
  { id: "cpos", projectId: "p1", name: "", now: new Date("2026-10-11T10:00:00.000Z") },
  "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41",
);

describe("a Case as a table row (CTA-186)", () => {
  it("reads a Game's tags into the game columns", () => {
    expect(caseRowOf(GAME, "Game name")).toMatchObject({
      id: "cgame",
      name: "Game name",
      type: "game",
      white: "Carlsen",
      whiteElo: 2830,
      black: "Caruana",
      result: "1-0",
      date: "2024.03.05",
      event: "Club Championship",
      eco: "C60",
      opening: "Ruy Lopez",
      moves: 3,
      updated: "2026-10-12T10:00:00.000Z",
    });
  });

  it("leaves a Position's game columns blank", () => {
    const row = caseRowOf(POSITION, "Black to move, move 41");
    expect(row).toEqual({ id: "cpos", record: POSITION, order: 0, name: "Black to move, move 41", type: "position", updated: POSITION.updatedAt });
    expect(caseSortValue(row, "white")).toBeUndefined();
    expect(caseSortValue(row, "updated")).toBe(POSITION.updatedAt);
  });

  it("carries the Case's place in its Project's order — the '#' column, opening from 1 (CTA-203)", () => {
    const row = caseRowOf({ ...GAME, order: 4 }, "Game name");
    expect(row.order).toBe(4);
    expect(caseSortValue(row, "order")).toBe(4);
    expect(caseFirstDirection("order")).toBe("asc");
  });

  it("opens dates, ratings and lengths high first, words A first; ties newest first", () => {
    expect(caseFirstDirection("updated")).toBe("desc");
    expect(caseFirstDirection("whiteElo")).toBe("desc");
    expect(caseFirstDirection("name")).toBe("asc");
    const rows = [caseRowOf(POSITION, "b"), caseRowOf(GAME, "a")];
    expect([...rows].sort(newestCaseFirst).map((row) => row.id)).toEqual(["cgame", "cpos"]);
  });

  it("keeps the rows holding every word typed — in any field, any case", () => {
    const rows = [caseRowOf(GAME, "Brilliancy"), caseRowOf(POSITION, "Black to move, move 41")];
    const ids = (text: string) => filteredCaseRows(rows, text, (type) => (type === "game" ? "Game" : "Position")).map((row) => row.id);
    expect(filteredCaseRows(rows, "  ")).toBe(rows);
    expect(ids("carlsen ruy")).toEqual(["cgame"]);
    expect(ids("2830")).toEqual(["cgame"]);
    expect(ids("position")).toEqual(["cpos"]);
    expect(ids("move")).toEqual(["cpos"]);
    expect(ids("carlsen position")).toEqual([]);
  });
});
