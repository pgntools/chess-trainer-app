import { describe, expect, it } from "vitest";

import {
  filteredProjectPickerRows,
  projectPickerRowsOf,
  sortedProjectPickerRows,
  type ShownProjectPickerRow,
} from "./analysisProjectPickerRows";
import { positionCaseOfFen, type AnalysisProject, type ProjectFolder } from "./analysisProjects";

const AT = "2026-10-12T09:30:00.000Z";
const folder = (id: string, name: string, parentId: string | null): ProjectFolder => ({ id, name, parentId, savedAt: AT, updatedAt: AT });
const project = (id: string, name: string, folderId: string | null, updatedAt = AT): AnalysisProject => ({ id, name, folderId, createdAt: AT, updatedAt });
const aCase = (id: string, projectId: string) => positionCaseOfFen({ id, projectId, name: "" }, "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1");

const FOLDERS = [folder("f1", "Openings", null), folder("f2", "Sicilian", "f1"), folder("f3", "", null)];

describe("the Project picker's rows (CTA-226)", () => {
  it("gives each Project its folder path, top first, and its count of Cases", () => {
    const rows = projectPickerRowsOf(
      [project("p1", "Najdorf", "f2"), project("p2", "Loose", null), project("p3", "Lost", "gone"), project("p4", "Blank", "f3")],
      FOLDERS,
      [aCase("c1", "p1"), aCase("c2", "p1"), aCase("c3", "p2")],
    );
    expect(rows.map((row) => [row.id, row.folders, row.cases])).toEqual([
      ["p1", ["Openings", "Sicilian"], 2],
      ["p2", [], 1],
      ["p3", [], 0],
      ["p4", [""], 0],
    ]);
  });

  const shown = (id: string, name: string, path: string, cases: number, updated: string): ShownProjectPickerRow => ({
    row: { id, project: project(id, name, null, updated), name, folders: [], cases, updated },
    name,
    path,
  });
  const ROWS = [
    shown("a", "Najdorf ideas", "Openings / Sicilian", 12, "2026-10-14T00:00:00.000Z"),
    shown("b", "endgames", "", 3, "2026-10-10T00:00:00.000Z"),
    shown("c", "Caro-Kann", "Openings", 40, "2026-10-12T00:00:00.000Z"),
    shown("d", "Project 10", "", 3, "2026-10-11T00:00:00.000Z"),
    shown("e", "Project 9", "", 3, "2026-10-11T00:00:00.000Z"),
  ];
  const ids = (rows: readonly ShownProjectPickerRow[]) => rows.map((row) => row.row.id);

  it("keeps the rows holding every word in their name or folder path, any case", () => {
    expect(filteredProjectPickerRows(ROWS, "  ")).toBe(ROWS);
    expect(ids(filteredProjectPickerRows(ROWS, "openings"))).toEqual(["a", "c"]);
    expect(ids(filteredProjectPickerRows(ROWS, "SICILIAN najdorf"))).toEqual(["a"]);
    expect(ids(filteredProjectPickerRows(ROWS, "sicilian caro"))).toEqual([]);
  });

  it("sorts by any column — names numeric-aware and caseless, ties by name", () => {
    expect(ids(sortedProjectPickerRows(ROWS, "name", "asc"))).toEqual(["c", "b", "a", "e", "d"]);
    expect(ids(sortedProjectPickerRows(ROWS, "name", "desc"))).toEqual(["d", "e", "a", "b", "c"]);
    expect(ids(sortedProjectPickerRows(ROWS, "folder", "asc"))).toEqual(["b", "e", "d", "c", "a"]);
    expect(ids(sortedProjectPickerRows(ROWS, "cases", "desc"))).toEqual(["c", "a", "b", "e", "d"]);
    expect(ids(sortedProjectPickerRows(ROWS, "updated", "desc"))).toEqual(["a", "c", "e", "d", "b"]);
  });
});
