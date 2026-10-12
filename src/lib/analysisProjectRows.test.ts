import { describe, expect, it } from "vitest";

import { projectFirstDirection, projectRowOf, projectTreeRows } from "./analysisProjectRows";
import type { AnalysisProject, ProjectFolder } from "./analysisProjects";

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
