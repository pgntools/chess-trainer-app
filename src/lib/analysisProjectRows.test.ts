import { describe, expect, it } from "vitest";

import { projectCaseRowOf, projectFirstDirection, projectRowOf, projectTreeRows, type ProjectCaseRow } from "./analysisProjectRows";
import { positionCaseOfFen, type AnalysisProject, type ProjectFolder } from "./analysisProjects";

const folder = (id: string, name: string, parentId: string | null = null, updatedAt = "2026-10-01"): ProjectFolder => ({
  id,
  name,
  parentId,
  savedAt: updatedAt,
  updatedAt,
});
const project = (id: string, name: string, folderId: string | null, updatedAt: string): AnalysisProject => ({
  id,
  name,
  folderId,
  createdAt: updatedAt,
  updatedAt,
});

const FOLDERS = [folder("fopen", "Openings"), folder("fsic", "Sicilian", "fopen"), folder("fend", "Endgames", null, "2026-10-09")];
const ROWS = [
  projectRowOf(project("pnaj", "Najdorf", "fsic", "2026-10-05"), 4),
  projectRowOf(project("pcaro", "Caro-Kann", "fopen", "2026-10-07"), 2),
  projectRowOf(project("pclub", "Club games", null, "2026-10-08"), 9),
  projectRowOf(project("pblitz", "Blitz", null, "2026-10-06"), 1),
];

const walk = (open: string[], column: "name" | "cases" | "updated" = "name", direction: "asc" | "desc" = "asc", text = "") =>
  projectTreeRows({ folders: FOLDERS, rows: ROWS, isOpen: (id, auto) => open.includes(id) || auto, column, direction, text }).rows.map(
    (row) => (row.kind === "folder" ? `${"  ".repeat(row.depth)}[${row.folder.name} ${row.size}]` : `${"  ".repeat(row.depth)}${row.item.name}`),
  );

const caseRow = (id: string, projectId: string, name: string, updated = "2026-10-01"): ProjectCaseRow => ({
  id,
  projectId,
  name,
  type: "game",
  updated,
});
const CASES = [
  caseRow("c1", "pnaj", "Fischer – Spassky", "2026-10-02"),
  caseRow("c2", "pnaj", "Anand – Topalov", "2026-10-03"),
  caseRow("c3", "pclub", "Lucena position"),
  caseRow("c4", "pgone", "Of a Project that is not listed"),
];

/** The walk with Cases: `+` an open Project, `-` a closed one, `·` one with no Cases to show. */
const walkCases = (open: string[], openProjects: string[], text = "", column: "name" | "cases" | "updated" = "name", direction: "asc" | "desc" = "asc") =>
  projectTreeRows({
    folders: FOLDERS,
    rows: ROWS,
    cases: CASES,
    isOpen: (id, auto) => open.includes(id) || auto,
    isProjectOpen: (id, auto) => openProjects.includes(id) || auto,
    column,
    direction,
    text,
  }).rows.map((row) => {
    const indent = "  ".repeat(row.depth);
    if (row.kind === "folder") return `${indent}[${row.folder.name}]`;
    if (row.kind === "case") return `${indent}${row.item.name}`;
    return `${indent}${row.open === undefined ? "·" : row.open ? "+" : "-"}${row.item.name}`;
  });

describe("Analysis V2's Projects as a tree table (CTA-186)", () => {
  it("lists folders first at every level, a folder's contents only while it is open, its size its whole subtree's", () => {
    expect(walk([])).toEqual(["[Endgames 0]", "[Openings 2]", "Blitz", "Club games"]);
    expect(walk(["fopen", "fsic"])).toEqual([
      "[Endgames 0]",
      "[Openings 2]",
      "  [Sicilian 1]",
      "    Najdorf",
      "  Caro-Kann",
      "Blitz",
      "Club games",
    ]);
  });

  it("sorts Projects by the column, folders by name — or by when they changed under Updated", () => {
    expect(walk([], "cases", "desc")).toEqual(["[Endgames 0]", "[Openings 2]", "Club games", "Blitz"]);
    expect(walk([], "updated", "desc")).toEqual(["[Endgames 0]", "[Openings 2]", "Club games", "Blitz"]);
    expect(walk([], "name", "desc")).toEqual(["[Openings 2]", "[Endgames 0]", "Club games", "Blitz"]);
    expect(projectFirstDirection("name")).toBe("asc");
    expect(projectFirstDirection("updated")).toBe("desc");
  });

  it("keeps what the words name — every word, any case — and opens the folders above a match", () => {
    expect(walk([], "name", "asc", "NAJ")).toEqual(["[Openings 2]", "  [Sicilian 1]", "    Najdorf"]);
    // A matching folder brings what is in it, and stays closed until opened.
    expect(walk([], "name", "asc", "sicilian")).toEqual(["[Openings 2]", "  [Sicilian 1]"]);
    expect(walk([], "name", "asc", "club blitz")).toEqual([]);
  });
});

describe("a Project's Cases in the tree (CTA-191)", () => {
  it("shows a Project's Cases under it, one level in, only while it is open — sorted by the column", () => {
    expect(walkCases([], [])).toEqual(["[Endgames]", "[Openings]", "·Blitz", "-Club games"]);
    expect(walkCases(["fopen", "fsic"], ["pnaj", "pclub"])).toEqual([
      "[Endgames]",
      "[Openings]",
      "  [Sicilian]",
      "    +Najdorf",
      "      Anand – Topalov",
      "      Fischer – Spassky",
      "  ·Caro-Kann",
      "·Blitz",
      "+Club games",
      "  Lucena position",
    ]);
    expect(walkCases(["fopen", "fsic"], ["pnaj"], "", "updated", "desc").slice(3, 6)).toEqual([
      "    +Najdorf",
      "      Anand – Topalov",
      "      Fischer – Spassky",
    ]);
    // Name, Z first: Openings comes before Endgames now.
    expect(walkCases(["fopen", "fsic"], ["pnaj"], "", "name", "desc").slice(2, 5)).toEqual([
      "    +Najdorf",
      "      Fischer – Spassky",
      "      Anand – Topalov",
    ]);
  });

  it("finds a Case by words — its Project and the folders above it opened, only the Cases named", () => {
    expect(walkCases([], [], "fischer")).toEqual(["[Openings]", "  [Sicilian]", "    +Najdorf", "      Fischer – Spassky"]);
    // A Project the reader closes stays closed.
    expect(
      projectTreeRows({
        folders: FOLDERS,
        rows: ROWS,
        cases: CASES,
        isOpen: (_, auto) => auto,
        isProjectOpen: () => false,
        column: "name",
        direction: "asc",
        text: "lucena",
      }).rows.map((row) => (row.kind === "item" ? `${row.item.name} ${String(row.open)}` : row.kind)),
    ).toEqual(["Club games false"]);
  });

  it("keeps every Case of a Project the words name, or one inside a folder they name — closed until opened", () => {
    expect(walkCases([], [], "najdorf")).toEqual(["[Openings]", "  [Sicilian]", "    -Najdorf"]);
    expect(walkCases([], ["pnaj"], "najdorf").slice(3)).toEqual(["      Anand – Topalov", "      Fischer – Spassky"]);
    expect(walkCases(["fsic"], ["pnaj"], "sicilian")).toEqual([
      "[Openings]",
      "  [Sicilian]",
      "    +Najdorf",
      "      Anand – Topalov",
      "      Fischer – Spassky",
    ]);
  });

  it("names a Case's row as the screen reads it", () => {
    const record = positionCaseOfFen({ id: "cpos", projectId: "p1", name: "" }, "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41");
    expect(projectCaseRowOf(record, "Black to move, move 41")).toEqual({
      id: "cpos",
      projectId: "p1",
      name: "Black to move, move 41",
      type: "position",
      updated: record.updatedAt,
    });
  });
});
