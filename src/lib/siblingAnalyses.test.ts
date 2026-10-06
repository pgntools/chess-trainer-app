import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import { batchAnalysesOf, type SavedAnalysis } from "./savedAnalyses";
import {
  analysisBoardPath,
  DEFAULT_SIBLING_SORT,
  siblingAnalysesOf,
  siblingContextOf,
  siblingPlaceOf,
} from "./siblingAnalyses";

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

describe("siblingContextOf — where an analysis was opened from", () => {
  const filed = { folderId: "f1" };

  it("is the folder and the table's default order for a bare ?folder=", () => {
    expect(siblingContextOf(params("analysis=a&folder=f1"), filed)).toEqual({
      folderId: "f1",
      sort: DEFAULT_SIBLING_SORT,
    });
    expect(DEFAULT_SIBLING_SORT).toEqual({ column: "updated", direction: "desc" });
  });

  it("reads the table's sort and direction, each column opening its own way", () => {
    expect(siblingContextOf(params("folder=f1&sort=white"), filed)?.sort).toEqual({ column: "white", direction: "asc" });
    expect(siblingContextOf(params("folder=f1&sort=moves"), filed)?.sort).toEqual({ column: "moves", direction: "desc" });
    expect(siblingContextOf(params("folder=f1&sort=white&dir=desc"), filed)?.sort).toEqual({
      column: "white",
      direction: "desc",
    });
  });

  it("reads a column off the whitelist and a direction that is neither as the default", () => {
    expect(siblingContextOf(params("folder=f1&sort=nope&dir=sideways"), filed)?.sort).toEqual(DEFAULT_SIBLING_SORT);
  });

  it("is nothing without a folder, for an Unfiled or another folder's record, or without a record", () => {
    expect(siblingContextOf(params("analysis=a"), filed)).toBeNull();
    expect(siblingContextOf(params("folder="), filed)).toBeNull();
    expect(siblingContextOf(params("folder=f1"), { folderId: null })).toBeNull();
    expect(siblingContextOf(params("folder=f1"), { folderId: "f2" })).toBeNull();
    expect(siblingContextOf(params("folder=f1"), null)).toBeNull();
  });
});

describe("analysisBoardPath", () => {
  it("is the bare link without a context", () => {
    expect(analysisBoardPath("a 1")).toBe("/tools/analysis?analysis=a+1");
  });

  it("writes only what differs from the table's defaults", () => {
    expect(analysisBoardPath("a", { folderId: "f1", sort: DEFAULT_SIBLING_SORT })).toBe("/tools/analysis?analysis=a&folder=f1");
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

  it("round-trips through siblingContextOf", () => {
    const context = { folderId: "f 1", sort: { column: "whiteElo" as const, direction: "asc" as const } };
    const search = analysisBoardPath("a", context).split("?")[1];
    expect(siblingContextOf(params(search), { folderId: "f 1" })).toEqual(context);
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
    expect(ids(siblingAnalysesOf(all, { folderId: "f1", sort: DEFAULT_SIBLING_SORT }))).toEqual(["new", "mid", "old"]);
  });

  it("follows the column and direction of the table", () => {
    expect(ids(siblingAnalysesOf(all, { folderId: "f1", sort: { column: "white", direction: "asc" } }))).toEqual([
      "new",
      "mid",
      "old",
    ]);
    expect(ids(siblingAnalysesOf(all, { folderId: "f1", sort: { column: "white", direction: "desc" } }))).toEqual([
      "old",
      "mid",
      "new",
    ]);
    expect(ids(siblingAnalysesOf(all, { folderId: "f1", sort: { column: "updated", direction: "asc" } }))).toEqual([
      "old",
      "mid",
      "new",
    ]);
  });

  it("is empty for a folder with nothing filed directly in it", () => {
    expect(siblingAnalysesOf(all, { folderId: "nowhere", sort: DEFAULT_SIBLING_SORT })).toEqual([]);
  });
});

describe("siblingPlaceOf", () => {
  const ordered = ["a", "b", "c"].map((id) => analysis(id, "f1", "2026-01-01T00:00:00.000Z"));

  it("names the neighbours either side", () => {
    const place = siblingPlaceOf(ordered, "b");
    expect(place.index).toBe(1);
    expect(place.previous?.id).toBe("a");
    expect(place.next?.id).toBe("c");
  });

  it("has no previous at the start and no next at the end", () => {
    expect(siblingPlaceOf(ordered, "a").previous).toBeUndefined();
    expect(siblingPlaceOf(ordered, "c").next).toBeUndefined();
  });

  it("has neither for an analysis that is not among them", () => {
    expect(siblingPlaceOf(ordered, "z")).toEqual({ index: -1, previous: undefined, next: undefined });
  });
});
