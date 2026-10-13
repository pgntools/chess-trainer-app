/**
 * **Analysis V2's addresses** (CTA-186, shipped in CTA-192): the Projects browser at `/analysis`
 * (`?folder=<id>` the folder on screen), a Project's Cases at
 * `/analysis/projects/<id>`, a Case's board at
 * `/analysis/projects/<id>/cases/<caseId>`, and Jobs V2 at `/analysis/jobs`
 * (`?job=<id>` the job open, CTA-188).
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

/**
 * **Which screen of the Case board's left panel** — the Project's Cases
 * (`CaseSiblings`) or the Case's own view (`CaseDetails`, `?view=case`) — added
 * to the table's context for a Case's address. Never carried back to the table.
 */
export const withCaseView = (context: string, details: boolean): string => {
  const params = new URLSearchParams(context);
  if (details) params.set("view", "case");
  else params.delete("view");
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
};

/** A Project's Cases — with the table's context (`caseListContextOf`), when there is one. */
export const projectPath = (projectId: string, context = ""): string =>
  `${ANALYSIS_V2_PATH}/projects/${encodeURIComponent(projectId)}${context}`;

/** A Case's board — with the Cases table's context, when there is one. */
export const casePath = (projectId: string, caseId: string, context = ""): string =>
  `${ANALYSIS_V2_PATH}/projects/${encodeURIComponent(projectId)}/cases/${encodeURIComponent(caseId)}${context}`;

/** The Jobs V2 view (CTA-188), at one job — or none. */
export const jobsV2Path = (jobId?: string): string =>
  jobId === undefined ? `${ANALYSIS_V2_PATH}/jobs` : `${ANALYSIS_V2_PATH}/jobs?job=${encodeURIComponent(jobId)}`;
