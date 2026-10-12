import type { AnalysisProject } from "../../../lib/analysisProjects";

/*
  The Projects a Case can go to (CTA-186). Imported only by the block's
  gallery and its test.
*/

const AT = "2026-10-12T09:30:00.000Z";
const project = (id: string, name: string): AnalysisProject => ({ id, name, folderId: null, createdAt: AT, updatedAt: AT });

export const PROJECTS: readonly AnalysisProject[] = [
  project("pnaj", "Najdorf ideas"),
  project("pend", "Endgames"),
  project("pcar", "Caro-Kann"),
];

export const HEBREW_PROJECTS: readonly AnalysisProject[] = [project("pheb", "הגנה סיציליאנית"), project("pheb2", "סיומים")];
