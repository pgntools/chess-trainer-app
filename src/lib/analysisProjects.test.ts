import { describe, expect, it } from "vitest";

import {
  analysisCaseFrom,
  analysisProjectFrom,
  appendedCases,
  byCaseOrder,
  caseCountsOf,
  caseDerivedName,
  caseNode,
  caseStateOf,
  caseTree,
  casesInOrder,
  casesOf,
  compactedCaseOrders,
  copiedCase,
  DEFAULT_CASE_DISPLAY,
  gameCaseDerivedName,
  gameCaseOf,
  moveNumberOf,
  positionCaseOfFen,
  positionCaseOfGame,
  projectsHere,
  projectsUnder,
  reorderedCases,
  sameCaseState,
  withCaseOrders,
  type AnalysisCase,
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
        order: 0,
      });
    });

    it("keeps its place in its Project's order — a record from before, or a bad one, has none (CTA-203)", () => {
      expect(analysisCaseFrom({ ...made, order: 3 })?.order).toBe(3);
      expect(analysisCaseFrom({ ...made, order: undefined })?.order).toBe(0);
      expect(analysisCaseFrom({ ...made, order: -1 })?.order).toBe(0);
      expect(analysisCaseFrom({ ...made, order: 1.5 })?.order).toBe(0);
      expect(analysisCaseFrom({ ...made, order: "2" })?.order).toBe(0);
    });
  });

  describe("a Project's order (CTA-203)", () => {
    /** A Case of Project `projectId`, made on day `day`, at `order`. */
    const at = (id: string, projectId: string, day: number, order: number): AnalysisCase => ({
      ...positionCaseOfFen({ id, projectId, name: "", now: new Date(`2026-10-${String(day).padStart(2, "0")}T10:00:00.000Z`) }, POSITION),
      order,
    });
    const ids = (cases: readonly AnalysisCase[], projectId = "p1") => casesInOrder(cases, projectId).map((record) => `${record.id}:${record.order}`);

    it("is made by the store — a new Case and a copy have no place yet", () => {
      const made = positionCaseOfFen({ id: "n", projectId: "p1", name: "" }, POSITION);
      expect(made.order).toBe(0);
      expect(copiedCase({ ...made, order: 5 }, "copy", "p1", "Copy").order).toBe(0);
    });

    it("sorts by order, a Case without one last, ties oldest first", () => {
      const cases = [at("b", "p1", 2, 0), at("c", "p1", 3, 2), at("a", "p1", 1, 0), at("d", "p1", 4, 1), at("e", "p1", 1, 1)];
      expect([...cases].sort(byCaseOrder).map((record) => record.id)).toEqual(["e", "d", "c", "a", "b"]);
    });

    it("puts new Cases last in their Projects, in the order they come", () => {
      const current = [at("a", "p1", 1, 1), at("b", "p1", 2, 4), at("x", "p2", 1, 1)];
      const added = appendedCases(current, [at("n1", "p1", 5, 0), at("n2", "p2", 5, 9), at("n3", "p1", 5, 0), at("n4", "p3", 5, 0)]);
      expect(added.map((record) => `${record.id}:${record.order}`)).toEqual(["n1:5", "n2:2", "n3:6", "n4:1"]);
    });

    it("gives a record from before its place by date, oldest first, after the Cases that have one", () => {
      const old = [at("b", "p1", 2, 0), at("a", "p1", 1, 0), at("c", "p1", 3, 0)];
      expect(ids(withCaseOrders(old))).toEqual(["a:1", "b:2", "c:3"]);
      const mixed = [at("new", "p1", 9, 1), at("old", "p1", 1, 0), at("other", "p2", 1, 0)];
      expect(ids(withCaseOrders(mixed))).toEqual(["new:1", "old:2"]);
      expect(ids(withCaseOrders(mixed), "p2")).toEqual(["other:1"]);
      const placed = [at("a", "p1", 1, 1)];
      expect(withCaseOrders(placed)).toBe(placed);
    });

    it("moves a Case up, down, to the top and to the bottom — never past an end, never touching a date", () => {
      const cases = [at("a", "p1", 1, 1), at("b", "p1", 2, 2), at("c", "p1", 3, 3), at("d", "p1", 4, 4), at("x", "p2", 1, 1)];
      expect(ids(reorderedCases(cases, "c", "up"))).toEqual(["a:1", "c:2", "b:3", "d:4"]);
      expect(ids(reorderedCases(cases, "b", "down"))).toEqual(["a:1", "c:2", "b:3", "d:4"]);
      expect(ids(reorderedCases(cases, "c", "top"))).toEqual(["c:1", "a:2", "b:3", "d:4"]);
      expect(ids(reorderedCases(cases, "b", "bottom"))).toEqual(["a:1", "c:2", "d:3", "b:4"]);
      expect(reorderedCases(cases, "a", "up")).toBe(cases);
      expect(reorderedCases(cases, "a", "top")).toBe(cases);
      expect(reorderedCases(cases, "d", "down")).toBe(cases);
      expect(reorderedCases(cases, "d", "bottom")).toBe(cases);
      expect(reorderedCases(cases, "gone", "up")).toBe(cases);
      const moved = reorderedCases(cases, "d", "top");
      expect(moved.find((record) => record.id === "x")).toBe(cases[4]);
      expect(moved.map((record) => record.updatedAt)).toEqual(cases.map((record) => record.updatedAt));
    });

    it("closes up a Project's order after a Case leaves it", () => {
      const cases = [at("a", "p1", 1, 1), at("c", "p1", 3, 3), at("d", "p1", 4, 7), at("x", "p2", 1, 5)];
      const closed = compactedCaseOrders(cases, ["p1"]);
      expect(ids(closed)).toEqual(["a:1", "c:2", "d:3"]);
      expect(closed[0]).toBe(cases[0]);
      expect(ids(closed, "p2")).toEqual(["x:5"]);
      expect(compactedCaseOrders(closed, ["p1"])).toBe(closed);
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
    it("starts with every option on, sized by nothing, in classic colours, evaluations written — as an older record reads", () => {
      const made = positionCaseOfFen({ id: "c1", projectId: "p1", name: "" }, POSITION);
      expect(made.display).toEqual(DEFAULT_CASE_DISPLAY);
      expect(DEFAULT_CASE_DISPLAY).toEqual({
        showArrows: true,
        arrowWidthSource: "none",
        arrowPalette: "classic",
        showMoveMarks: true,
        showEvalBar: true,
        showVariations: true,
        writeEvals: true,
      });
      const older: Record<string, unknown> = { ...made };
      delete older.display;
      expect(analysisCaseFrom(older)?.display).toEqual(DEFAULT_CASE_DISPLAY);
    });

    it("reads each field back, an unknown one as its default", () => {
      const made = positionCaseOfFen({ id: "c1", projectId: "p1", name: "" }, POSITION);
      const read = analysisCaseFrom({
        ...made,
        display: { showArrows: false, arrowWidthSource: "games", arrowPalette: "nonsense", showEvalBar: "yes", showVariations: false, writeEvals: false },
      });
      expect(read?.display).toEqual({ ...DEFAULT_CASE_DISPLAY, showArrows: false, arrowWidthSource: "games", showVariations: false, writeEvals: false });
    });

    it("is part of the autosave's state — a change of it is a change", () => {
      const tree = parsePgnTree(GAME);
      const made = gameCaseOf({ id: "c1", projectId: "p1", name: "" }, tree);
      expect(sameCaseState(made, caseStateOf(tree, null, "white"))).toBe(true);
      expect(sameCaseState(made, caseStateOf(tree, null, "white", { ...DEFAULT_CASE_DISPLAY, showEvalBar: false }))).toBe(false);
      expect(sameCaseState(made, caseStateOf(tree, null, "white", { ...DEFAULT_CASE_DISPLAY, writeEvals: false }))).toBe(false);
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
