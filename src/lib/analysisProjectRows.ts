import type { AnalysisProject, ProjectFolder } from "./analysisProjects";
import { folderTreeRows, type FolderTreeRows } from "./folderTreeRows";

/**
 * **Analysis V2's Projects browser as a tree table** (CTA-186) — the legacy
 * saved analyses' (`savedAnalysisRows.ts`, CTA-144): the folders and the
 * Projects filed in them as one table's rows over `folderTreeRows`, folders
 * first at every level, each opened in place, sorted by a column, and
 * narrowed by a words box that opens the folders above a match. Pure.
 */

/** The table's columns — every one a sort header. */
export const PROJECT_COLUMNS = ["name", "cases", "updated"] as const;

export type ProjectColumn = (typeof PROJECT_COLUMNS)[number];

/** One Project as the table shows it. */
export type ProjectRow = {
  id: string;
  /** Where the tree files it — `null` the top level (as is a folder that is gone). */
  folderId: string | null;
  project: AnalysisProject;
  /** The reader's name; `""` shown as the generic. */
  name: string;
  /** How many Cases it holds. */
  cases: number;
  /** ISO 8601. */
  updated: string;
};

export type ProjectTreeRow = FolderTreeRows<ProjectRow>["rows"][number];

/** A Project's row. */
export const projectRowOf = (project: AnalysisProject, cases: number): ProjectRow => ({
  id: project.id,
  folderId: project.folderId,
  project,
  name: project.name,
  cases,
  updated: project.updatedAt,
});

/** Which way a column opens: counts and dates high first, names A first. */
export const projectFirstDirection = (column: ProjectColumn): "asc" | "desc" => (column === "name" ? "asc" : "desc");

const byName = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** Two Projects in a column's order; ties by name. */
const compareProjects =
  (column: ProjectColumn, direction: "asc" | "desc") =>
  (a: ProjectRow, b: ProjectRow): number => {
    const sign = direction === "asc" ? 1 : -1;
    const order =
      column === "name"
        ? byName(a.name, b.name)
        : column === "cases"
          ? a.cases - b.cases
          : a.updated < b.updated
            ? -1
            : a.updated > b.updated
              ? 1
              : 0;
    return sign * order || byName(a.name, b.name);
  };

/** Two folders: by name — and under Updated, by when each last changed. */
const compareFolders =
  (column: ProjectColumn, direction: "asc" | "desc") =>
  (a: ProjectFolder, b: ProjectFolder): number => {
    if (column === "updated") {
      const order = a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0;
      return (direction === "asc" ? order : -order) || byName(a.name, b.name);
    }
    return (column === "name" && direction === "desc" ? -1 : 1) * byName(a.name, b.name);
  };

/** The words typed, lower-cased — none for blank text. */
const wordsOf = (text: string): string[] => text.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");

/**
 * **The tree's rows**: the folders and Projects as `folderTreeRows` walks
 * them — folders first, each level sorted by the column, a folder's contents
 * only while it is open (`isOpen`; `auto` is whether the words open it). The
 * words keep the Projects whose name holds every one, and the folders whose
 * name does with all in them; the folders above a match open for it.
 */
export const projectTreeRows = ({
  folders,
  rows,
  isOpen,
  column,
  direction,
  text,
}: {
  folders: readonly ProjectFolder[];
  rows: readonly ProjectRow[];
  isOpen: (folderId: string, auto: boolean) => boolean;
  column: ProjectColumn;
  direction: "asc" | "desc";
  text: string;
}): FolderTreeRows<ProjectRow> => {
  const words = wordsOf(text);
  const holds = (name: string) => {
    const lower = name.toLocaleLowerCase();
    return words.every((word) => lower.includes(word));
  };
  return folderTreeRows({
    folders,
    items: rows,
    isOpen,
    compareFolders: compareFolders(column, direction),
    compareItems: compareProjects(column, direction),
    sizeOf: () => 1,
    ...(words.length > 0 && { match: { folder: (folder: ProjectFolder) => holds(folder.name), item: (row: ProjectRow) => holds(row.name) } }),
  });
};
