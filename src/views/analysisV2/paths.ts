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

/**
 * **Where the Cases table stood** — its sort, direction and words (`?sort=`,
 * `?dir=`, `?q=`), carried from the table to a Case's board and back, so the
 * board's list of the Project's Cases (`CaseSiblings`) is in the table's order
 * and Close returns to the table as it was. `""` when the table had none.
 */
export const caseListContextOf = (params: URLSearchParams): string => {
  const kept = new URLSearchParams();
  for (const key of ["sort", "dir", "q"]) {
    const value = params.get(key);
    if (value !== null && value !== "") kept.set(key, value);
  }
  const query = kept.toString();
  return query === "" ? "" : `?${query}`;
};

/** A Project's Cases — with the table's context (`caseListContextOf`), when there is one. */
export const projectPath = (projectId: string, context = ""): string =>
  `${ANALYSIS_V2_PATH}/projects/${encodeURIComponent(projectId)}${context}`;

/** A Case's board — with the Cases table's context, when there is one. */
export const casePath = (projectId: string, caseId: string, context = ""): string =>
  `${ANALYSIS_V2_PATH}/projects/${encodeURIComponent(projectId)}/cases/${encodeURIComponent(caseId)}${context}`;
