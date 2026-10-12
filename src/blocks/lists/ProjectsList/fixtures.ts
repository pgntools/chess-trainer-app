import type { AnalysisProject, ProjectFolder } from "../../../lib/analysisProjects";

/*
  Analysis V2's browser rows (CTA-186), typed with `src/lib/analysisProjects.ts`.
  Imported only by the block's gallery and its test.
*/

const AT = "2026-10-12T09:30:00.000Z";

const folder = (id: string, name: string): ProjectFolder => ({ id, name, parentId: null, savedAt: AT, updatedAt: AT });
const project = (id: string, name: string): AnalysisProject => ({ id, name, folderId: null, createdAt: AT, updatedAt: AT });

export const FOLDERS = [
  { folder: folder("fopen", "Openings"), projects: 3 },
  { folder: folder("fend", "Endgames"), projects: 1 },
];

export const PROJECTS = [
  { project: project("pnaj", "Najdorf ideas"), cases: 4 },
  { project: project("pcarl", "Carlsen's endgames, the whole collection with a long name"), cases: 1 },
  { project: project("pnew", "New project"), cases: 0 },
];

export const HEBREW = {
  folders: [{ folder: folder("fheb", "פתיחות"), projects: 2 }],
  projects: [{ project: project("pheb", "הגנה סיציליאנית"), cases: 2 }],
};

export const manyProjects = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ project: project(`p${index}`, `Project ${index + 1}`), cases: index % 5 }));
