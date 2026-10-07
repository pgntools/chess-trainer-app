import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import {
  analysesListPath,
  analysisBoardPath,
  DEFAULT_LIST_SORT,
  listContextOf,
  siblingAnalysesOf,
  siblingPlaceOf,
} from "./analysesListContext";
import { batchAnalysesOf, type SavedAnalysis } from "./savedAnalyses";

/** A record of one game filed under `folderId`, named by its tags unless `name` says. */
const analysis = (id: string, folderId: string | null, updatedAt: string, white = "Anand", name = ""): SavedAnalysis => ({
  ...batchAnalysesOf(
    () => id,
    [{ name, pgn: `[White "${white}"]\n[Black "Kasparov"]\n[Result "1-0"]\n\n1. e4 e5 1-0` }],
    folderId,
    DEFAULT_ANALYSIS_SETTINGS,
  )[0],
  updatedAt,
});

const params = (search: string) => new URLSearchParams(search);

describe("listContextOf — where an analysis was opened from", () => {
  it("is the folder and the table's default order for a bare ?folder=", () => {
    expect(listContextOf(params("analysis=a&folder=f1"))).toEqual({ folderId: "f1", sort: DEFAULT_LIST_SORT });
    expect(DEFAULT_LIST_SORT).toEqual({ column: "updated", direction: "desc" });
  });

  it("reads an empty ?folder= as the top level", () => {
    expect(listContextOf(params("folder="))).toEqual({ folderId: null, sort: DEFAULT_LIST_SORT });
  });

  it("reads the table's sort and direction, each column opening its own way", () => {
    expect(listContextOf(params("folder=f1&sort=white"))?.sort).toEqual({ column: "white", direction: "asc" });
    expect(listContextOf(params("folder=f1&sort=moves"))?.sort).toEqual({ column: "moves", direction: "desc" });
    expect(listContextOf(params("folder=f1&sort=white&dir=desc"))?.sort).toEqual({ column: "white", direction: "desc" });
  });

  it("reads a column off the whitelist and a direction that is neither as the default", () => {
    expect(listContextOf(params("folder=f1&sort=nope&dir=sideways"))?.sort).toEqual(DEFAULT_LIST_SORT);
  });

  it("is nothing without a ?folder=", () => {
    expect(listContextOf(params("analysis=a"))).toBeNull();
    expect(listContextOf(params("sort=white"))).toBeNull();
  });
});

describe("analysisBoardPath and analysesListPath", () => {
  it("is the bare board link without a context", () => {
    expect(analysisBoardPath("a 1")).toBe("/tools/analysis?analysis=a+1");
  });

  it("writes only what differs from the table's defaults", () => {
    expect(analysisBoardPath("a", { folderId: "f1", sort: DEFAULT_LIST_SORT })).toBe("/tools/analysis?analysis=a&folder=f1");
    expect(analysisBoardPath("a", { folderId: "f1", sort: { column: "white", direction: "asc" } })).toBe(
      "/tools/analysis?analysis=a&folder=f1&sort=white",
    );
    expect(analysisBoardPath("a", { folderId: "f1", sort: { column: "white", direction: "desc" } })).toBe(
      "/tools/analysis?analysis=a&folder=f1&sort=white&dir=desc",
    );
    expect(analysisBoardPath("a", { folderId: "f1", sort: { column: "updated", direction: "asc" } })).toBe(
      "/tools/analysis?analysis=a&folder=f1&dir=asc",
    );
  });

  it("names the top level by an empty ?folder=", () => {
    expect(analysisBoardPath("a", { folderId: null, sort: DEFAULT_LIST_SORT })).toBe("/tools/analysis?analysis=a&folder=");
  });

  it("round-trips through listContextOf", () => {
    for (const context of [
      { folderId: "f 1", sort: { column: "whiteElo" as const, direction: "asc" as const } },
      { folderId: null, sort: { column: "name" as const, direction: "desc" as const } },
    ]) {
      expect(listContextOf(params(analysisBoardPath("a", context).split("?")[1]))).toEqual(context);
    }
  });

  it("sends Close to the list on the same folder and sort, the top level with no ?folder=", () => {
    expect(analysesListPath({ folderId: "f1", sort: DEFAULT_LIST_SORT })).toBe("/tools/analysis/saved?folder=f1");
    expect(analysesListPath({ folderId: "f1", sort: { column: "white", direction: "desc" } })).toBe(
      "/tools/analysis/saved?folder=f1&sort=white&dir=desc",
    );
    expect(analysesListPath({ folderId: null, sort: DEFAULT_LIST_SORT })).toBe("/tools/analysis/saved");
    expect(analysesListPath({ folderId: null, sort: { column: "white", direction: "asc" } })).toBe("/tools/analysis/saved?sort=white");
  });
});

describe("siblingAnalysesOf", () => {
  const all = [
    analysis("old", "f1", "2026-01-01T00:00:00.000Z", "Zed"),
    analysis("new", "f1", "2026-03-01T00:00:00.000Z", "Abe"),
    analysis("mid", "f1", "2026-02-01T00:00:00.000Z", "Mo"),
    analysis("elsewhere", "f2", "2026-04-01T00:00:00.000Z"),
    analysis("unfiled", null, "2026-04-02T00:00:00.000Z"),
  ];
  const ids = (list: readonly SavedAnalysis[]) => list.map((saved) => saved.id);

  it("lists the folder's own analyses, newest updated first by default", () => {
    expect(ids(siblingAnalysesOf(all, "f1", DEFAULT_LIST_SORT))).toEqual(["new", "mid", "old"]);
  });

  it("follows the column and direction of the table", () => {
    expect(ids(siblingAnalysesOf(all, "f1", { column: "white", direction: "asc" }))).toEqual(["new", "mid", "old"]);
    expect(ids(siblingAnalysesOf(all, "f1", { column: "white", direction: "desc" }))).toEqual(["old", "mid", "new"]);
    expect(ids(siblingAnalysesOf(all, "f1", { column: "updated", direction: "asc" }))).toEqual(["old", "mid", "new"]);
  });

  it("lists the Unfiled ones for the top level", () => {
    expect(ids(siblingAnalysesOf(all, null, DEFAULT_LIST_SORT))).toEqual(["unfiled"]);
  });

  it("is empty for a folder with nothing filed directly in it", () => {
    expect(siblingAnalysesOf(all, "nowhere", DEFAULT_LIST_SORT)).toEqual([]);
  });
});

describe("siblingPlaceOf", () => {
  const ordered = ["a", "b", "c"].map((id) => analysis(id, "f1", "2026-01-01T00:00:00.000Z"));

  it("names the neighbours either side", () => {
    const place = siblingPlaceOf(ordered, "b");
    expect(place.previous?.id).toBe("a");
    expect(place.next?.id).toBe("c");
  });

  it("has no previous at the start and no next at the end", () => {
    expect(siblingPlaceOf(ordered, "a").previous).toBeUndefined();
    expect(siblingPlaceOf(ordered, "c").next).toBeUndefined();
  });

  it("has neither for an analysis that is not among them", () => {
    expect(siblingPlaceOf(ordered, "z")).toEqual({ previous: undefined, next: undefined });
  });
});
