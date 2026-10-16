import { caseCountsOf, projectFolderPath, type AnalysisCase, type AnalysisProject, type ProjectFolder } from "./analysisProjects";

/**
 * **The Project picker's rows** (CTA-226, `ProjectPickerDialog`) — every
 * Project with the path of folders it is filed in and how many Cases it
 * holds, built by the screen from the stores; and the words box and the sort
 * over them. Built for thousands of Projects: one pass over the Cases, each
 * folder's path walked once. Pure.
 */

/** The picker's columns — every one a sort header. */
export const PROJECT_PICKER_COLUMNS = ["name", "folder", "cases", "updated"] as const;

export type ProjectPickerColumn = (typeof PROJECT_PICKER_COLUMNS)[number];

/** One Project the picker offers. */
export type ProjectPickerRow = {
  id: string;
  project: AnalysisProject;
  /** The reader's name; `""` shown as the generic. */
  name: string;
  /** The names of the folders it is filed in, the top first — none at the top level (or in a folder gone). `""` shown as the generic. */
  folders: readonly string[];
  /** How many Cases it holds. */
  cases: number;
  /** ISO 8601. */
  updated: string;
};

/** Every Project as the picker's rows, in the order given. */
export const projectPickerRowsOf = (
  projects: readonly AnalysisProject[],
  folders: readonly ProjectFolder[],
  cases: readonly AnalysisCase[],
): ProjectPickerRow[] => {
  const counts = caseCountsOf(cases);
  const paths = new Map<string, readonly string[]>();
  const pathOf = (folderId: string | null): readonly string[] => {
    if (folderId === null) return [];
    let path = paths.get(folderId);
    if (path === undefined) {
      path = projectFolderPath(folders, folderId).map((folder) => folder.name);
      paths.set(folderId, path);
    }
    return path;
  };
  return projects.map((project) => ({
    id: project.id,
    project,
    name: project.name,
    folders: pathOf(project.folderId),
    cases: counts.get(project.id) ?? 0,
    updated: project.updatedAt,
  }));
};

/** A new sort column's first direction: the words A to Z, the numbers and dates the most first. */
export const projectPickerFirstDirection = (column: ProjectPickerColumn): "asc" | "desc" =>
  column === "name" || column === "folder" ? "asc" : "desc";

/** A row as the reader reads it — its name and its folder path in their words (the generic for a blank). */
export type ShownProjectPickerRow = { row: ProjectPickerRow; name: string; path: string };

const wordsOf = (text: string): string[] => text.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");

/** The rows holding every word typed in their name or folder path, any case — every row for no words. */
export const filteredProjectPickerRows = (rows: readonly ShownProjectPickerRow[], text: string): readonly ShownProjectPickerRow[] => {
  const words = wordsOf(text);
  if (words.length === 0) return rows;
  return rows.filter((shown) => {
    const haystack = `${shown.name}\n${shown.path}`.toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
};

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** The rows by a column — ties by name, then by id, so the order is total. A Project at the top level sorts first by Folder. */
export const sortedProjectPickerRows = (
  rows: readonly ShownProjectPickerRow[],
  column: ProjectPickerColumn,
  direction: "asc" | "desc",
): ShownProjectPickerRow[] => {
  const sign = direction === "asc" ? 1 : -1;
  const byName = (a: ShownProjectPickerRow, b: ShownProjectPickerRow) => collator.compare(a.name, b.name) || (a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0);
  const compare = (a: ShownProjectPickerRow, b: ShownProjectPickerRow): number => {
    switch (column) {
      case "name":
        return collator.compare(a.name, b.name);
      case "folder":
        return collator.compare(a.path, b.path);
      case "cases":
        return a.row.cases - b.row.cases;
      case "updated":
        return a.row.updated < b.row.updated ? -1 : a.row.updated > b.row.updated ? 1 : 0;
    }
  };
  return [...rows].sort((a, b) => sign * compare(a, b) || byName(a, b));
};
