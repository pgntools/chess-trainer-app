import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";

import {
  casePgnOf,
  MAX_FILE_NAME_CHARS,
  picksDownloadEntries,
  projectCasePgns,
  safeFileName,
  zipDownloadEntries,
  type ProjectsDownloadModel,
} from "./analysisProjectsDownload";
import { gameCaseOf, positionCaseOfFen, positionCaseOfGame, type AnalysisCase, type AnalysisProject, type ProjectFolder } from "./analysisProjects";
import { parsePgnTree, parsePgnTrees } from "./pgn";

const NAMES = { untitledFolder: "Untitled folder", untitledProject: "Untitled project" };
const SIDE_LINES = '[Event "Club"]\n[White "Ann"]\n[Black "Bob"]\n\n1. e4 (1. d4 d5) e5 {A comment} 2. Nf3 *';
const POSITION_FEN = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";

const folder = (id: string, name: string, parentId: string | null = null): ProjectFolder => ({
  id,
  name,
  parentId,
  savedAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
});
const project = (id: string, name: string, folderId: string | null = null): AnalysisProject => ({
  id,
  name,
  folderId,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
});
/** A Game Case whose one move is `san`, its place `order` in its Project. */
const gameCase = (id: string, projectId: string, san: string, order: number): AnalysisCase => ({
  ...gameCaseOf({ id, projectId, name: id }, parsePgnTree(`[Event "${id}"]\n\n1. ${san} *`)),
  order,
});

/*
  open ─┬─ sic ── pnaj "Najdorf" (c2, c1 — order 1, 2)
        ├─ empty
        └─ pcaro "Caro-Kann" (c3)
  end ─── pbare "Bare" (no Cases)
  ploose "Loose" (c4, c5) at the top level
*/
const MODEL: ProjectsDownloadModel = {
  folders: [folder("open", "Openings"), folder("sic", "Sicilian", "open"), folder("empty", "Empty", "open"), folder("end", "Endgames")],
  projects: [project("pnaj", "Najdorf", "sic"), project("pcaro", "Caro-Kann", "open"), project("pbare", "Bare", "end"), project("ploose", "Loose")],
  cases: [
    gameCase("c1", "pnaj", "e4", 2),
    gameCase("c2", "pnaj", "d4", 1),
    gameCase("c3", "pcaro", "c4", 1),
    gameCase("c4", "ploose", "Nf3", 1),
    gameCase("c5", "ploose", "g3", 2),
  ],
};

const events = (pgn: string | null) => parsePgnTrees(pgn ?? "").map((tree) => tree.headers.Event);

describe("casePgnOf — a Case as its Export tab writes it", () => {
  it("is the tree as kept, side lines and comments too", () => {
    const record = gameCaseOf({ id: "g", projectId: "p", name: "" }, parsePgnTree(SIDE_LINES));
    const pgn = casePgnOf(record);
    expect(pgn).toBe(record.pgn.trim());
    expect(pgn).toContain("(1. d4 d5)");
    expect(pgn).toContain("{ A comment }");
  });

  it("gives a Position Case of a FEN its [SetUp] and [FEN]", () => {
    const record = positionCaseOfFen({ id: "f", projectId: "p", name: "" }, POSITION_FEN);
    expect(casePgnOf(record)).toMatch(/^\[SetUp "1"\]\n\[FEN "4k3\/8\/8\/8\/8\/8\/4P3\/4K3 w - - 0 1"\]/);
    expect(parsePgnTree(casePgnOf(record)).startFen).toBe(POSITION_FEN);
  });

  it("adds them where an older record lacks them, and only once", () => {
    const record: AnalysisCase = { ...positionCaseOfFen({ id: "f", projectId: "p", name: "" }, POSITION_FEN), pgn: "1. e3 *" };
    const pgn = casePgnOf(record);
    expect(pgn).toBe(`[SetUp "1"]\n[FEN "${POSITION_FEN}"]\n\n1. e3 *`);
    expect(casePgnOf({ ...record, pgn })).toBe(pgn);
    // A record with tags of its own keeps them, after the two.
    expect(casePgnOf({ ...record, pgn: '[Event "E"]\n\n1. e3 *' })).toBe(`[SetUp "1"]\n[FEN "${POSITION_FEN}"]\n[Event "E"]\n\n1. e3 *`);
  });

  it("writes a Position Case of a PGN from its game's start, the moves before it kept", () => {
    const tree = parsePgnTree(SIDE_LINES);
    const record = positionCaseOfGame({ id: "pp", projectId: "p", name: "" }, tree, tree.moves[0].children[0].id);
    expect(casePgnOf(record)).not.toContain("[FEN");
    expect(casePgnOf(record)).toContain("1. e4");
  });
});

describe("projectCasePgns", () => {
  it("is a Project's Cases in its order, or those picked of them", () => {
    expect(projectCasePgns(MODEL.cases, "pnaj").map((pgn) => events(pgn)[0])).toEqual(["c2", "c1"]);
    expect(projectCasePgns(MODEL.cases, "pnaj", new Set(["c1"])).map((pgn) => events(pgn)[0])).toEqual(["c1"]);
    expect(projectCasePgns(MODEL.cases, "pbare")).toEqual([]);
  });
});

describe("safeFileName", () => {
  it("keeps the reader's words, Hebrew too", () => {
    expect(safeFileName("Najdorf, 6.Bg5")).toBe("Najdorf, 6.Bg5");
    expect(safeFileName("פתיחות")).toBe("פתיחות");
  });

  it("replaces what a file system refuses and trims the ends", () => {
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
    expect(safeFileName("  ..Line\tbreak\n  here.. ")).toBe("Line break here");
    expect(safeFileName("../../etc")).toBe("_.._etc");
  });

  it("falls back for an empty name and guards the names Windows reserves", () => {
    expect(safeFileName("", "Untitled project")).toBe("Untitled project");
    expect(safeFileName(" . ", "")).toBe("untitled");
    expect(safeFileName("CON")).toBe("CON_");
    expect(safeFileName("lpt1.txt")).toBe("lpt1.txt_");
  });

  it("is cut to the longest a name is given, never inside a character", () => {
    expect(Array.from(safeFileName("♞".repeat(300)))).toHaveLength(MAX_FILE_NAME_CHARS);
  });
});

describe("picksDownloadEntries — the zip mirrors the picks", () => {
  it("is nothing with nothing ticked", () => {
    expect(picksDownloadEntries(MODEL, new Set(), NAMES)).toEqual([]);
  });

  it("nests a ticked folder's sub-folders, an empty one too, a .pgn per Project in its order", () => {
    const entries = picksDownloadEntries(MODEL, new Set(["open"]), NAMES);
    expect(entries.map((entry) => entry.path)).toEqual([
      "Openings/",
      "Openings/Empty/",
      "Openings/Sicilian/",
      "Openings/Sicilian/Najdorf.pgn",
      "Openings/Caro-Kann.pgn",
    ]);
    expect(events(entries.find((entry) => entry.path === "Openings/Sicilian/Najdorf.pgn")!.text)).toEqual(["c2", "c1"]);
  });

  it("puts a ticked Project at the top, and a Project with no Case as an empty file", () => {
    const entries = picksDownloadEntries(MODEL, new Set(["ploose", "end"]), NAMES);
    expect(entries.map((entry) => entry.path)).toEqual(["Endgames/", "Endgames/Bare.pgn", "Loose.pgn"]);
    expect(events(entries[2].text)).toEqual(["c4", "c5"]);
    expect(entries[1].text).toBe("\n");
  });

  it("writes Cases ticked without their Project as one .pgn per Project, named after it, in its order", () => {
    const entries = picksDownloadEntries(MODEL, new Set(["c5", "c1", "c3"]), NAMES);
    expect(entries.map((entry) => entry.path)).toEqual(["Caro-Kann.pgn", "Loose.pgn", "Najdorf.pgn"]);
    expect(events(entries[1].text)).toEqual(["c5"]);
  });

  it("reads a Project all of whose Cases are ticked as the Project, as the delete does", () => {
    expect(picksDownloadEntries(MODEL, new Set(["c4", "c5"]), NAMES).map((entry) => entry.path)).toEqual(["Loose.pgn"]);
  });

  it("numbers names that clash in one directory, any case, and names the unnamed", () => {
    const model: ProjectsDownloadModel = {
      folders: [folder("f", ""), folder("g", "")],
      projects: [project("a", "Same"), project("b", "same"), project("c", "", "f"), project("d", "Same")],
      cases: [gameCase("x", "d", "e4", 1)],
    };
    const paths = picksDownloadEntries(model, new Set(["a", "b", "c", "x", "g"]), NAMES).map((entry) => entry.path);
    expect(paths).toEqual([
      "Untitled folder/",
      "Untitled folder/Untitled project.pgn",
      "Untitled folder (2)/",
      "same.pgn",
      "Same (2).pgn",
      "Same (3).pgn",
    ]);
  });

  it("zips as it lists — each .pgn in UTF-8, each directory an entry", () => {
    const entries = picksDownloadEntries(
      { ...MODEL, folders: [...MODEL.folders.slice(1), folder("open", "פתיחות")] },
      new Set(["open", "c4"]),
      NAMES,
    );
    const files = unzipSync(zipDownloadEntries(entries));
    expect(Object.keys(files)).toEqual(entries.map((entry) => entry.path));
    expect(files["פתיחות/"]).toHaveLength(0);
    expect(events(strFromU8(files["פתיחות/Sicilian/Najdorf.pgn"]))).toEqual(["c2", "c1"]);
    expect(events(strFromU8(files["Loose.pgn"]))).toEqual(["c4"]);
  });
});
