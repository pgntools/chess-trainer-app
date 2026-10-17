import { projectFolderPath, type AnalysisCase, type AnalysisCaseType, type AnalysisProject, type ProjectFolder } from "./analysisProjects";
import { folderTreeRows, type FolderTreeRow } from "./folderTreeRows";

/**
 * **Analysis V2's Projects browser as a tree table** (CTA-186) — the legacy
 * saved analyses' (CTA-144, removed in CTA-192): the folders and the
 * Projects filed in them as one table's rows over `folderTreeRows`, folders
 * first at every level, each opened in place, sorted by a column, and
 * narrowed by a words box that opens the folders above a match. Since
 * CTA-191 a Project opens in place too, its Cases the rows under it, and the
 * words read the Cases' names as well. Pure.
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

/** One Case as the browser shows it under its Project (CTA-191). */
export type ProjectCaseRow = {
  id: string;
  projectId: string;
  /** The name the reader reads — its own, else derived (`caseDisplayName`, in the reader's language). */
  name: string;
  type: AnalysisCaseType;
  /** ISO 8601. */
  updated: string;
};

/**
 * One row of the tree: a folder, a Project — `open` whether its Cases show
 * under it, `undefined` when it has none to show — or a Case (CTA-191).
 */
export type ProjectTreeRow =
  | Extract<FolderTreeRow<ProjectRow>, { kind: "folder" }>
  | { kind: "item"; item: ProjectRow; depth: number; open: boolean | undefined }
  | { kind: "case"; item: ProjectCaseRow; depth: number };

export type ProjectTreeRows = { rows: ProjectTreeRow[] };

/** A Project's row. */
export const projectRowOf = (project: AnalysisProject, cases: number): ProjectRow => ({
  id: project.id,
  folderId: project.folderId,
  project,
  name: project.name,
  cases,
  updated: project.updatedAt,
});

/** A Case's row, under the name the screen reads it by. */
export const projectCaseRowOf = (record: AnalysisCase, name: string): ProjectCaseRow => ({
  id: record.id,
  projectId: record.projectId,
  name,
  type: record.type,
  updated: record.updatedAt,
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

/** Two Cases of one Project: by name — and under Updated, by when each last changed. */
const compareCases =
  (column: ProjectColumn, direction: "asc" | "desc") =>
  (a: ProjectCaseRow, b: ProjectCaseRow): number => {
    if (column === "updated") {
      const order = a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : 0;
      return (direction === "asc" ? order : -order) || byName(a.name, b.name);
    }
    return (column === "name" && direction === "desc" ? -1 : 1) * byName(a.name, b.name);
  };

/** The words typed, lower-cased — none for blank text. */
const wordsOf = (text: string): string[] => text.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");

/**
 * **The tree's rows**: the folders and Projects as `folderTreeRows` walks
 * them — folders first, each level sorted by the column, a folder's contents
 * only while it is open (`isOpen`; `auto` is whether the words open it) — and
 * under an open Project its Cases (`isProjectOpen`, CTA-191), one level in.
 *
 * The words keep the Projects whose name holds every one — with all their
 * Cases —, the Cases whose name does, and the folders whose name does with
 * all in them; a Project kept for its Cases shows only those, and opens for
 * them, as the folders above any match open.
 */
export const projectTreeRows = ({
  folders,
  rows,
  cases = [],
  isOpen,
  isProjectOpen = () => false,
  column,
  direction,
  text,
}: {
  folders: readonly ProjectFolder[];
  rows: readonly ProjectRow[];
  /** The Cases, any Project's — those of a Project not in `rows` are never shown. */
  cases?: readonly ProjectCaseRow[];
  isOpen: (folderId: string, auto: boolean) => boolean;
  /** Whether a Project shows its Cases; `auto` is whether the words open it. */
  isProjectOpen?: (projectId: string, auto: boolean) => boolean;
  column: ProjectColumn;
  direction: "asc" | "desc";
  text: string;
}): ProjectTreeRows => {
  const words = wordsOf(text);
  const holds = (name: string) => {
    const lower = name.toLocaleLowerCase();
    return words.every((word) => lower.includes(word));
  };
  const filtering = words.length > 0;

  const casesOf = new Map<string, ProjectCaseRow[]>();
  for (const row of cases) {
    const list = casesOf.get(row.projectId);
    if (list === undefined) casesOf.set(row.projectId, [row]);
    else list.push(row);
  }
  // A Project the words keep for its Cases alone: the Cases they name.
  const matchingCases = new Map<string, ProjectCaseRow[]>();
  if (filtering) {
    for (const [projectId, list] of casesOf) {
      const kept = list.filter((row) => holds(row.name));
      if (kept.length > 0) matchingCases.set(projectId, kept);
    }
  }
  const known = new Set(folders.map((folder) => folder.id));
  const insideMatch = (row: ProjectRow) =>
    row.folderId !== null && known.has(row.folderId) && projectFolderPath(folders, row.folderId).some((step) => holds(step.name));

  const walked = folderTreeRows({
    folders,
    items: rows,
    isOpen,
    compareFolders: compareFolders(column, direction),
    compareItems: compareProjects(column, direction),
    sizeOf: () => 1,
    ...(filtering && {
      match: {
        folder: (folder: ProjectFolder) => holds(folder.name),
        item: (row: ProjectRow) => holds(row.name) || matchingCases.has(row.id),
      },
    }),
  });

  const compare = compareCases(column, direction);
  const out: ProjectTreeRow[] = [];
  for (const row of walked.rows) {
    if (row.kind === "folder") {
      out.push(row);
      continue;
    }
    const all = casesOf.get(row.item.id) ?? [];
    // Every Case — unless the words kept the Project for some of them only.
    const whole = !filtering || holds(row.item.name) || insideMatch(row.item);
    const shown = whole ? all : (matchingCases.get(row.item.id) ?? []);
    const open = shown.length === 0 ? undefined : isProjectOpen(row.item.id, filtering && matchingCases.has(row.item.id));
    out.push({ kind: "item", item: row.item, depth: row.depth, open });
    if (open === true) {
      for (const child of [...shown].sort(compare)) out.push({ kind: "case", item: child, depth: row.depth + 1 });
    }
  }
  return { rows: out };
};
