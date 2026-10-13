import type { ProjectPickModel } from "../../../lib/analysisProjectPicks";
import { projectRowOf, projectTreeRows, type ProjectCaseRow, type ProjectTreeRow } from "../../../lib/analysisProjectRows";
import type { AnalysisProject, ProjectFolder } from "../../../lib/analysisProjects";

/*
  Analysis V2's browser as tree rows (CTA-186), walked by
  `projectTreeRows` as the screen walks them — the Projects' Cases too, and
  the model their picks are read against (CTA-191). Imported only by the
  block's gallery and its test.
*/

const AT = "2026-10-12T09:30:00.000Z";
const folder = (id: string, name: string, parentId: string | null = null): ProjectFolder => ({
  id,
  name,
  parentId,
  savedAt: AT,
  updatedAt: AT,
});
const project = (id: string, name: string, folderId: string | null, updatedAt = AT): AnalysisProject => ({
  id,
  name,
  folderId,
  createdAt: AT,
  updatedAt,
});
const caseRow = (id: string, projectId: string, name: string, type: "game" | "position" = "game", updated = AT): ProjectCaseRow => ({
  id,
  projectId,
  name,
  type,
  updated,
});

export const FOLDERS: readonly ProjectFolder[] = [folder("fopen", "Openings"), folder("fsic", "Sicilian", "fopen"), folder("fend", "Endgames")];

export const PROJECTS: readonly AnalysisProject[] = [
  project("pnaj", "Najdorf ideas", "fsic"),
  project("pcaro", "Caro-Kann", "fopen"),
  project("prook", "Rook endings", "fend", "2026-10-11T09:30:00.000Z"),
  project("ploose", "Club games", null, "2026-10-10T09:30:00.000Z"),
];

export const CASES: readonly ProjectCaseRow[] = [
  caseRow("cnaj1", "pnaj", "Fischer – Spassky, Reykjavik, 1972"),
  caseRow("cnaj2", "pnaj", "Black to move, move 14", "position"),
  caseRow("ccaro1", "pcaro", "Advance variation"),
  caseRow("ccaro2", "pcaro", "Karpov – Kasparov, Linares, 1992"),
  caseRow("crook1", "prook", "Lucena position", "position"),
];

/** What the picks are read against — the browser's folders, Projects and Cases. */
export const MODEL: ProjectPickModel = { folders: FOLDERS, projects: PROJECTS, cases: CASES };

/** The tree walked with the folders in `open` and the Projects in `openProjects` opened, and the words `text`. */
export const treeRows = (open: readonly string[] = [], text = "", openProjects: readonly string[] = []): ProjectTreeRow[] =>
  projectTreeRows({
    folders: FOLDERS,
    rows: PROJECTS.map((item) => projectRowOf(item, CASES.filter((row) => row.projectId === item.id).length)),
    cases: CASES,
    isOpen: (id, auto) => open.includes(id) || auto,
    isProjectOpen: (id, auto) => openProjects.includes(id) || auto,
    column: "name",
    direction: "asc",
    text,
  }).rows;

export const HEBREW_ROWS: ProjectTreeRow[] = projectTreeRows({
  folders: [folder("fheb", "פתיחות")],
  rows: [projectRowOf(project("pheb", "הגנה סיציליאנית", "fheb"), 2)],
  cases: [caseRow("cheb1", "pheb", "קספרוב – טופלוב, וייק אן זה, 1999"), caseRow("cheb2", "pheb", "שחור לשחק, מסע 20", "position")],
  isOpen: () => true,
  isProjectOpen: () => true,
  column: "name",
  direction: "asc",
  text: "",
}).rows;
