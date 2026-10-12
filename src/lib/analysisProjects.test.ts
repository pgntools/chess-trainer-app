import { describe, expect, it } from "vitest";

import {
  analysisCaseFrom,
  analysisProjectFrom,
  caseCountsOf,
  caseDerivedName,
  caseNode,
  caseStateOf,
  caseTree,
  casesOf,
  copiedCase,
  DEFAULT_CASE_DISPLAY,
  gameCaseDerivedName,
  gameCaseOf,
  moveNumberOf,
  positionCaseOfFen,
  positionCaseOfGame,
  projectsHere,
  projectsUnder,
  sameCaseState,
  type AnalysisProject,
  type ProjectFolder,
} from "./analysisProjects";
import { fenAtNode, mainline, nodeAtSanPath } from "./gameTree";
import { parsePgnTree } from "./pgn";

const NOW = new Date("2026-10-12T10:00:00.000Z");

const GAME = `[Event "Club Championship"]
[Date "2024.03.05"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 {Best by test} e5 (1... c5 2. Nf3 $1) 2. Nf3 {[%eval 0.3]} Nc6 3. Bb5 1-0`;

const POSITION = "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41";

const folder = (id: string, parentId: string | null = null): ProjectFolder => ({
  id,
  name: id,
  parentId,
  savedAt: "",
  updatedAt: "",
});

const project = (id: string, folderId: string | null): AnalysisProject => ({
  id,
  name: id,
  folderId,
  createdAt: "",
  updatedAt: "",
});

describe("Analysis V2's records (CTA-186)", () => {
  describe("a Project", () => {
    it("reads back what is stored, and defaults what an older row lacks", () => {
      expect(analysisProjectFrom({ id: "p1", name: "Sicilian", folderId: "f1", createdAt: "a", updatedAt: "b" })).toEqual({
        id: "p1",
        name: "Sicilian",
        folderId: "f1",
        createdAt: "a",
        updatedAt: "b",
      });
      expect(analysisProjectFrom({ id: "p1", createdAt: "a" })).toEqual({
        id: "p1",
        name: "",
        folderId: null,
        createdAt: "a",
        updatedAt: "a",
      });
    });

    it("drops a row without an id", () => {
      expect(analysisProjectFrom({ name: "x" })).toBeUndefined();
      expect(analysisProjectFrom({ id: "" })).toBeUndefined();
      expect(analysisProjectFrom("p1")).toBeUndefined();
    });

    it("is listed where it is filed — a folder that is gone reads as the top level", () => {
      const folders = [folder("a"), folder("b", "a")];
      const projects = [project("p1", null), project("p2", "a"), project("p3", "b"), project("p4", "gone")];
      expect(projectsHere(projects, folders, null).map((p) => p.id)).toEqual(["p1", "p4"]);
      expect(projectsHere(projects, folders, "a").map((p) => p.id)).toEqual(["p2"]);
      expect(projectsUnder(projects, folders, "a").map((p) => p.id)).toEqual(["p2", "p3"]);
    });
  });

  describe("a Game Case", () => {
    const tree = parsePgnTree(GAME);
    const made = gameCaseOf({ id: "c1", projectId: "p1", name: "  ", now: NOW }, tree);

    it("keeps the whole game — side lines, comments, NAGs, evaluations — and opens at the start, facing White", () => {
      expect(made).toMatchObject({ id: "c1", projectId: "p1", type: "game", name: "", path: [], orientation: "white" });
      expect(made.pgn).toContain("(1... c5 2. Nf3 $1)");
      expect(made.pgn).toContain("{ Best by test }");
      expect(made.pgn).toContain("[%eval 0.3]");
      expect(made.source).toEqual({ kind: "pgn", pgn: made.pgn, startPath: [], fen: tree.startFen });
      expect(made.createdAt).toBe(NOW.toISOString());
    });

    it("is named by its players, event and year when the reader names it nothing", () => {
      expect(caseDerivedName(made)).toEqual({ kind: "game", text: "Carlsen – Caruana, Club Championship, 2024" });
      expect(gameCaseDerivedName({ White: "?", Black: "?", Event: "?" })).toBe("");
      expect(gameCaseDerivedName({ White: "Tal", Date: "????.??.??" })).toBe("Tal");
    });
  });

  describe("a Position Case", () => {
    it("of a FEN opens on it, facing the side to move", () => {
      const made = positionCaseOfFen({ id: "c2", projectId: "p1", name: "Endgame", now: NOW }, POSITION);
      expect(made).toMatchObject({ type: "position", name: "Endgame", orientation: "black", path: [] });
      expect(made.source).toEqual({ kind: "fen", fen: POSITION });
      expect(caseTree(made)?.startFen).toBe(POSITION);
      expect(caseDerivedName(made)).toEqual({ kind: "position", turn: "b", moveNumber: 41 });
    });

    it("of a PGN keeps the moves before the chosen ply and opens there", () => {
      const tree = parsePgnTree(GAME);
      const at = mainline(tree)[2]; // 2. Nf3 — Black to move
      const made = positionCaseOfGame({ id: "c3", projectId: "p1", name: "", now: NOW }, tree, at.id);
      expect(made.type).toBe("position");
      expect(made.path).toEqual(["e4", "e5", "Nf3"]);
      expect(made.orientation).toBe("black");
      expect(made.source).toMatchObject({ kind: "pgn", startPath: ["e4", "e5", "Nf3"], fen: at.fen });
      const reread = caseTree(made)!;
      expect(fenAtNode(reread, caseNode(made, reread))).toBe(at.fen);
      expect(caseDerivedName(made)).toEqual({ kind: "position", turn: "b", moveNumber: 2 });
    });
  });

  describe("a stored Case", () => {
    const made = positionCaseOfFen({ id: "c2", projectId: "p1", name: "", now: NOW }, POSITION);

    it("round-trips through its normaliser", () => {
      expect(analysisCaseFrom(JSON.parse(JSON.stringify(made)))).toEqual(made);
    });

    it("drops a row without its id, Project or analysis", () => {
      expect(analysisCaseFrom({ ...made, id: "" })).toBeUndefined();
      expect(analysisCaseFrom({ ...made, projectId: undefined })).toBeUndefined();
      expect(analysisCaseFrom({ ...made, pgn: "" })).toBeUndefined();
    });

    it("reads a field it lacks as its default — an unreadable source is its analysis", () => {
      const read = analysisCaseFrom({ id: "c9", projectId: "p1", pgn: "1. e4 *", type: "weird", source: 42 });
      expect(read).toMatchObject({
        type: "game",
        name: "",
        path: [],
        orientation: "white",
        source: { kind: "pgn", pgn: "1. e4 *", startPath: [], fen: "" },
      });
    });
  });

  describe("the analysis on a Case", () => {
    it("is the tree, the place and the orientation; the same again is the same state", () => {
      const tree = parsePgnTree(GAME);
      const nodeId = nodeAtSanPath(tree, ["e4", "c5"]);
      const state = caseStateOf(tree, nodeId, "black");
      expect(state.path).toEqual(["e4", "c5"]);
      const made = { ...gameCaseOf({ id: "c1", projectId: "p1", name: "" }, tree), ...state };
      expect(sameCaseState(made, caseStateOf(tree, nodeId, "black"))).toBe(true);
      expect(sameCaseState(made, caseStateOf(tree, nodeId, "white"))).toBe(false);
      expect(sameCaseState(made, caseStateOf(tree, null, "black"))).toBe(false);
    });

    it("is copied whole into another Project under a new id", () => {
      const original = positionCaseOfFen({ id: "c2", projectId: "p1", name: "Endgame" }, POSITION);
      const copy = copiedCase(original, "c3", "p2", "Endgame (copy)", NOW);
      expect(copy).toEqual({
        ...original,
        id: "c3",
        projectId: "p2",
        name: "Endgame (copy)",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      });
    });
  });

  describe("how a Case's board draws (its Display tab)", () => {
    it("starts with every option on, sized by nothing, in classic colours — as an older record reads", () => {
      const made = positionCaseOfFen({ id: "c1", projectId: "p1", name: "" }, POSITION);
      expect(made.display).toEqual(DEFAULT_CASE_DISPLAY);
      expect(DEFAULT_CASE_DISPLAY).toEqual({
        showArrows: true,
        arrowWidthSource: "none",
        arrowPalette: "classic",
        showMoveMarks: true,
        showEvalBar: true,
        showVariations: true,
      });
      const older: Record<string, unknown> = { ...made };
      delete older.display;
      expect(analysisCaseFrom(older)?.display).toEqual(DEFAULT_CASE_DISPLAY);
    });

    it("reads each field back, an unknown one as its default", () => {
      const made = positionCaseOfFen({ id: "c1", projectId: "p1", name: "" }, POSITION);
      const read = analysisCaseFrom({
        ...made,
        display: { showArrows: false, arrowWidthSource: "games", arrowPalette: "nonsense", showEvalBar: "yes", showVariations: false },
      });
      expect(read?.display).toEqual({ ...DEFAULT_CASE_DISPLAY, showArrows: false, arrowWidthSource: "games", showVariations: false });
    });

    it("is part of the autosave's state — a change of it is a change", () => {
      const tree = parsePgnTree(GAME);
      const made = gameCaseOf({ id: "c1", projectId: "p1", name: "" }, tree);
      expect(sameCaseState(made, caseStateOf(tree, null, "white"))).toBe(true);
      expect(sameCaseState(made, caseStateOf(tree, null, "white", { ...DEFAULT_CASE_DISPLAY, showEvalBar: false }))).toBe(false);
    });
  });

  it("counts and lists a Project's Cases", () => {
    const a = positionCaseOfFen({ id: "a", projectId: "p1", name: "" }, POSITION);
    const b = positionCaseOfFen({ id: "b", projectId: "p2", name: "" }, POSITION);
    const c = positionCaseOfFen({ id: "c", projectId: "p1", name: "" }, POSITION);
    expect(casesOf([a, b, c], "p1").map((x) => x.id)).toEqual(["a", "c"]);
    expect(Object.fromEntries(caseCountsOf([a, b, c]))).toEqual({ p1: 2, p2: 1 });
  });

  it("reads a FEN's move number, 1 where it cannot", () => {
    expect(moveNumberOf(POSITION)).toBe(41);
    expect(moveNumberOf("8/8/8/8/8/8/8/8 w - -")).toBe(1);
  });
});
