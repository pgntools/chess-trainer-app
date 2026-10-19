import { addAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf, type AnalysisProject } from "../../../lib/analysisProjects";
import { createAnalysisProject, loadAnalysisProjects } from "../../../lib/analysisProjectStore";
import type { GameTree } from "../../../lib/gameTree";
import { newRecordId } from "../../../lib/recordId";

/** A session's Case, made: where it is. */
export type SessionCase = { projectId: string; caseId: string };

/** **The Find Best Move project** — the first at the top level named `name` (the reader's language's); `undefined` before the first session. */
export const sessionProjectOf = <T extends Pick<AnalysisProject, "folderId" | "name">>(projects: readonly T[], name: string): T | undefined =>
  projects.find((each) => each.folderId === null && each.name === name);

/**
 * **A Find Best Move session's Case** (CTA-238; its PGN the whole session
 * since CTA-239) — made as the session starts: in the one **Find Best Move**
 * project at the top level (`projectName`, the reader's language's; found by
 * its name, else made), a Game Case named `caseName` of `tree` — the session
 * as its PGN holds it (`withSessionRecord`): a new session's game, its
 * mainline alone, with its tags and positions written, or a session PGN
 * loaded to be resumed. Every later change is the session's autosave and its
 * Evaluate Position jobs'. `undefined` when the browser refuses a write.
 */
export const createSessionCase = async ({
  tree,
  projectName,
  caseName,
  now = new Date(),
}: {
  tree: GameTree;
  projectName: string;
  caseName: string;
  now?: Date;
}): Promise<SessionCase | undefined> => {
  const project = sessionProjectOf(await loadAnalysisProjects(), projectName) ?? (await createAnalysisProject(projectName, null, now));
  if (project === undefined) return undefined;
  const record = gameCaseOf({ id: newRecordId(now), projectId: project.id, name: caseName, now }, tree);
  const problem = await addAnalysisCases([record]);
  return problem === undefined ? { projectId: project.id, caseId: record.id } : undefined;
};
