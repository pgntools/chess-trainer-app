import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import { emptyTree } from "./gameTree";
import { parsePgnTree } from "./pgn";
import { batchAnalysesOf, savedAnalysisOf, type SavedAnalysis } from "./savedAnalyses";
import {
  filteredAnalysisRows,
  savedAnalysisFirstDirection,
  savedAnalysisRowOf,
  savedAnalysisRowWith,
  sortedAnalysisRows,
  type SavedAnalysisRow,
} from "./savedAnalysisRows";

const GAME = `[Event "Tata Steel"]
[Site "Wijk aan Zee"]
[Date "2024.01.??"]
[Round "3.2"]
[White "Carlsen, Magnus"]
[Black "Giri, Anish"]
[Result "1-0"]
[WhiteElo "2830"]
[BlackElo "2749"]
[ECO "C65"]
[Opening "Ruy Lopez"]
[Variation "Berlin Defence"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 (3... a6) 4. O-O 1-0`;

/** A record of one imported game, as the several-games popup and the Library's Analyse write it. */
const imported = (pgn: string, id = "g1", updatedAt = "2026-09-07T10:00:00.000Z"): SavedAnalysis => ({
  ...batchAnalysesOf(() => id, [{ name: "", pgn }], null, DEFAULT_ANALYSIS_SETTINGS)[0],
  updatedAt,
});

const row = (patch: Partial<SavedAnalysisRow> & { id: string }): SavedAnalysisRow => ({
  name: "",
  description: "",
  moves: 0,
  updated: "2026-09-07T10:00:00.000Z",
  ...patch,
});

describe("savedAnalysisRowOf — a record's tags as a row", () => {
  it("reads the game's fields off its tags, without parsing the tree", () => {
    expect(savedAnalysisRowOf({ ...imported(GAME), description: "Prep" })).toEqual({
      id: "g1",
      name: "Carlsen, Magnus – Giri, Anish",
      description: "Prep",
      white: "Carlsen, Magnus",
      whiteElo: 2830,
      black: "Giri, Anish",
      blackElo: 2749,
      result: "1-0",
      date: "2024.01",
      event: "Tata Steel",
      round: "3.2",
      eco: "C65",
      opening: "Ruy Lopez, Berlin Defence",
      // The mainline's seven plies — the side line is not counted.
      moves: 4,
      updated: "2026-09-07T10:00:00.000Z",
    });
  });

  it("reads the placeholders a board's own analysis is written with as absent", () => {
    const saved = savedAnalysisOf(
      "a1",
      parsePgnTree("1. e4 e5"),
      [],
      DEFAULT_ANALYSIS_SETTINGS,
      "white",
      new Date("2026-09-07T10:00:00.000Z"),
    );
    const read = savedAnalysisRowOf(saved);
    expect(read).toMatchObject({ name: "", moves: 1, date: "2026.09.07" });
    for (const field of ["white", "black", "event", "result", "round", "eco", "opening"] as const) {
      expect(read[field]).toBeUndefined();
    }
  });

  it("keeps the reader's own name over the one its tags give", () => {
    expect(savedAnalysisRowOf({ ...imported(GAME), name: "My Berlin" }).name).toBe("My Berlin");
  });

  it("names an analysis with one real player by its event", () => {
    const pgn = `[Event "Club night"]\n[White "Analysis"]\n[Black "Kasparov"]\n[Result "*"]\n\n1. d4 *`;
    expect(savedAnalysisRowOf(imported(pgn))).toMatchObject({ name: "Club night", white: undefined, black: "Kasparov", result: undefined });
  });
});

describe("savedAnalysisRowWith — what a parse adds", () => {
  const lookup = () => ({ eco: "C20", name: "King's Pawn Game" });

  it("marks a record with no tree unreadable", () => {
    expect(savedAnalysisRowWith(row({ id: "x" }), undefined, lookup).unreadable).toBe(true);
  });

  it("fills the ECO and the opening from the book only where the tags name none", () => {
    const tree = parsePgnTree("1. e4 e5");
    expect(savedAnalysisRowWith(row({ id: "x" }), tree, lookup)).toMatchObject({ eco: "C20", opening: "King's Pawn Game" });
    expect(savedAnalysisRowWith(row({ id: "x", eco: "C44" }), tree, lookup)).toMatchObject({ eco: "C44", opening: "King's Pawn Game" });
  });

  it("hands the same row back when there is nothing to add", () => {
    const tree = parsePgnTree("1. e4 e5");
    const named = row({ id: "x", eco: "C65", opening: "Ruy Lopez" });
    expect(savedAnalysisRowWith(named, tree, lookup)).toBe(named);
    expect(savedAnalysisRowWith(row({ id: "x" }), tree)).toEqual(row({ id: "x" }));
    expect(savedAnalysisRowWith(row({ id: "x" }), { ...emptyTree(), moves: [] }, () => undefined)).toEqual(row({ id: "x" }));
  });
});

describe("sortedAnalysisRows", () => {
  const rows = [
    row({ id: "a", white: "Carlsen", whiteElo: 2830, round: "1.10", updated: "2026-01-01" }),
    row({ id: "b", white: "anand", round: "1.9", updated: "2026-03-01" }),
    row({ id: "c", whiteElo: 2700, updated: "2026-02-01" }),
    row({ id: "d", white: "Carlsen", whiteElo: 2830, updated: "2026-04-01" }),
  ];
  const ids = (sorted: readonly SavedAnalysisRow[]) => sorted.map((r) => r.id);

  it("sorts text numeric-aware and case aside, missing values last either way", () => {
    expect(ids(sortedAnalysisRows(rows, "white", "asc"))).toEqual(["b", "d", "a", "c"]);
    expect(ids(sortedAnalysisRows(rows, "white", "desc"))).toEqual(["d", "a", "b", "c"]);
    expect(ids(sortedAnalysisRows(rows, "round", "asc"))).toEqual(["b", "a", "d", "c"]);
  });

  it("sorts numbers numerically, and ties keep the newest-updated order in both directions", () => {
    expect(ids(sortedAnalysisRows(rows, "whiteElo", "desc"))).toEqual(["d", "a", "c", "b"]);
    expect(ids(sortedAnalysisRows(rows, "whiteElo", "asc"))).toEqual(["c", "d", "a", "b"]);
  });

  it("opens newest updated first by default", () => {
    expect(savedAnalysisFirstDirection("updated")).toBe("desc");
    expect(ids(sortedAnalysisRows(rows, "updated", savedAnalysisFirstDirection("updated")))).toEqual(["d", "b", "c", "a"]);
    expect(savedAnalysisFirstDirection("name")).toBe("asc");
    expect(savedAnalysisFirstDirection("moves")).toBe("desc");
  });

  it("leaves the rows it was given as they were", () => {
    const before = ids(rows);
    sortedAnalysisRows(rows, "white", "asc");
    expect(ids(rows)).toEqual(before);
  });
});

describe("filteredAnalysisRows", () => {
  const rows = [
    row({ id: "a", name: "Prep", white: "Carlsen, Magnus", event: "Tata Steel", opening: "Ruy Lopez" }),
    row({ id: "b", name: "Club", black: "Giri", description: "Sharp Najdorf line", eco: "B90" }),
  ];

  it("keeps the rows holding every word, case aside, over names, players, event, opening and notes", () => {
    expect(filteredAnalysisRows(rows, "carlsen ruy").map((r) => r.id)).toEqual(["a"]);
    expect(filteredAnalysisRows(rows, "NAJDORF").map((r) => r.id)).toEqual(["b"]);
    expect(filteredAnalysisRows(rows, "b90 giri").map((r) => r.id)).toEqual(["b"]);
    expect(filteredAnalysisRows(rows, "tata giri")).toEqual([]);
  });

  it("keeps every row for no words", () => {
    expect(filteredAnalysisRows(rows, "  ")).toBe(rows);
  });
});
