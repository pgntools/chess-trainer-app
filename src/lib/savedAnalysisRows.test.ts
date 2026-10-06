import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import { emptyTree } from "./gameTree";
import { parsePgnTree } from "./pgn";
import { batchAnalysesOf, savedAnalysisOf, type SavedAnalysis } from "./savedAnalyses";
import type { GameFolder } from "./savedGameFolders";
import {
  analysisTreeRows,
  compareAnalysisFolders,
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
  folderId: null,
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
      folderId: null,
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

describe("analysisTreeRows — folders and analyses as one tree (CTA-144)", () => {
  const folder = (id: string, name: string, parentId: string | null = null, updatedAt = "2026-09-01"): GameFolder => ({
    id,
    name,
    parentId,
    savedAt: "2026-01-01",
    updatedAt,
  });
  const FOLDERS = [folder("fo", "Openings", null, "2026-09-05"), folder("ft", "Tata Steel", null, "2026-09-01"), folder("fs", "Sicilian", "fo")];
  const ROWS = [
    row({ id: "top", name: "My Berlin", updated: "2026-09-04" }),
    row({ id: "najdorf", folderId: "fs", name: "Najdorf prep", opening: "Sicilian, Najdorf", updated: "2026-09-03" }),
    row({ id: "giri", folderId: "ft", name: "Carlsen – Giri", white: "Carlsen", updated: "2026-09-02" }),
    row({ id: "anand", folderId: "ft", name: "Anand – Aronian", white: "Anand", updated: "2026-09-06" }),
  ];
  const keys = (rows: ReturnType<typeof analysisTreeRows>["rows"]) =>
    rows.map((r) => (r.kind === "folder" ? `${"  ".repeat(r.depth)}[${r.folder.id} ${r.size}]` : `${"  ".repeat(r.depth)}${r.item.id}`));
  const walk = (open: string[], column: "name" | "white" | "updated" = "updated", direction: "asc" | "desc" = "desc", text = "") =>
    analysisTreeRows({ folders: FOLDERS, rows: ROWS, isOpen: (id, auto) => auto || open.includes(id), column, direction, text });

  it("puts the folders first at every level, their analyses under them only while open, each folder sized by its subtree", () => {
    expect(keys(walk([]).rows)).toEqual(["[fo 1]", "[ft 2]", "top"]);
    expect(keys(walk(["ft"]).rows)).toEqual(["[fo 1]", "[ft 2]", "  anand", "  giri", "top"]);
    expect(keys(walk(["fo", "fs"]).rows)).toEqual(["[fo 1]", "  [fs 1]", "    najdorf", "[ft 2]", "top"]);
  });

  it("orders the analyses within a level by the column, and the folders by name or by when they changed", () => {
    expect(keys(walk(["ft"], "white", "asc").rows)).toEqual(["[fo 1]", "[ft 2]", "  anand", "  giri", "top"]);
    expect(keys(walk(["ft"], "white", "desc").rows)).toEqual(["[fo 1]", "[ft 2]", "  giri", "  anand", "top"]);
    expect(keys(walk([], "name", "desc").rows)).toEqual(["[ft 2]", "[fo 1]", "top"]);
    expect(keys(walk([], "updated", "asc").rows)).toEqual(["[ft 2]", "[fo 1]", "top"]);
  });

  it("filters by words, opening the folders above a matching analysis, and keeps a matching folder whole", () => {
    const found = walk([], "updated", "desc", "najdorf");
    expect(keys(found.rows)).toEqual(["[fo 1]", "  [fs 1]", "    najdorf"]);
    expect(found.shownItems).toBe(1);
    // A folder named by the words keeps everything in it, closed until opened.
    expect(keys(walk([], "updated", "desc", "tata").rows)).toEqual(["[ft 2]"]);
    expect(walk([], "updated", "desc", "nothing").rows).toEqual([]);
  });

  it("seen from inside a folder — its subtree without it — puts its contents at the top level", () => {
    const inside = analysisTreeRows({
      folders: [FOLDERS[2]],
      rows: ROWS.filter((r) => r.folderId === "fo" || r.folderId === "fs"),
      isOpen: () => false,
      column: "updated",
      direction: "desc",
      text: "",
    });
    expect(keys(inside.rows)).toEqual(["[fs 1]"]);
  });

  it("sorts an untitled folder last", () => {
    const untitled = folder("fu", "");
    expect([untitled, FOLDERS[0]].sort(compareAnalysisFolders("name", "asc")).map((f) => f.id)).toEqual(["fo", "fu"]);
    expect([untitled, FOLDERS[0]].sort(compareAnalysisFolders("name", "desc")).map((f) => f.id)).toEqual(["fo", "fu"]);
  });
});
