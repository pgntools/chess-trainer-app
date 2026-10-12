/**
 * **Analysis V2's addresses** (CTA-186) — dev-only while it is built
 * (`routes.tsx`'s `devRoutes`): the Projects browser at `/analysis`
 * (`?folder=<id>` the folder on screen), a Project's Cases at
 * `/analysis/projects/<id>`, a Case's board at
 * `/analysis/projects/<id>/cases/<caseId>`.
 */

const ANALYSIS_V2_PATH = "/analysis";

/** The browser, on a folder (`null`: the top level). */
export const browserPath = (folderId: string | null): string =>
  folderId === null ? ANALYSIS_V2_PATH : `${ANALYSIS_V2_PATH}?folder=${encodeURIComponent(folderId)}`;

/** A Project's Cases. */
export const projectPath = (projectId: string): string =>
  `${ANALYSIS_V2_PATH}/projects/${encodeURIComponent(projectId)}`;

/** A Case's board. */
export const casePath = (projectId: string, caseId: string): string =>
  `${projectPath(projectId)}/cases/${encodeURIComponent(caseId)}`;
