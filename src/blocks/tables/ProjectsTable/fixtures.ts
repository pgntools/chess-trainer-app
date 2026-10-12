import { projectRowOf, projectTreeRows, type ProjectTreeRow } from "../../../lib/analysisProjectRows";
import type { AnalysisProject, ProjectFolder } from "../../../lib/analysisProjects";

/*
  Analysis V2's browser as tree rows (CTA-186), walked by
  `projectTreeRows` as the screen walks them. Imported only by the block's
  gallery and its test.
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

export const FOLDERS: readonly ProjectFolder[] = [folder("fopen", "Openings"), folder("fsic", "Sicilian", "fopen"), folder("fend", "Endgames")];

export const PROJECTS: readonly AnalysisProject[] = [
  project("pnaj", "Najdorf ideas", "fsic"),
  project("pcaro", "Caro-Kann", "fopen"),
  project("prook", "Rook endings", "fend", "2026-10-11T09:30:00.000Z"),
  project("ploose", "Club games", null, "2026-10-10T09:30:00.000Z"),
];

const CASES: Readonly<Record<string, number>> = { pnaj: 4, pcaro: 2, prook: 7, ploose: 0 };

/** The tree walked with the folders in `open` opened, and the words `text`. */
export const treeRows = (open: readonly string[] = [], text = ""): ProjectTreeRow[] =>
  projectTreeRows({
    folders: FOLDERS,
    rows: PROJECTS.map((item) => projectRowOf(item, CASES[item.id] ?? 0)),
    isOpen: (id, auto) => open.includes(id) || auto,
    column: "name",
    direction: "asc",
    text,
  }).rows;

export const HEBREW_ROWS: ProjectTreeRow[] = projectTreeRows({
  folders: [folder("fheb", "פתיחות")],
  rows: [projectRowOf(project("pheb", "הגנה סיציליאנית", "fheb"), 2)],
  isOpen: () => true,
  column: "name",
  direction: "asc",
  text: "",
}).rows;
