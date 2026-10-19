import { addAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { createAnalysisProject, loadAnalysisProjects } from "../../../lib/analysisProjectStore";
import { sessionBaseTree } from "../../../lib/findBestMoveSession";
import type { GameTree } from "../../../lib/gameTree";
import { newRecordId } from "../../../lib/recordId";

/** A session's Case, made: where it is, and the base its tree is built on. */
export type SessionCase = { projectId: string; caseId: string; base: GameTree };

/**
 * **A Find Best Move v2 session's Case** (CTA-238) — made as the session
 * starts: in the one **Find Best Move** project at the top level (`projectName`,
 * the reader's language's; found by its name, else made), a Game Case of the
 * game's mainline alone (`sessionBaseTree`) named `caseName`. Every later
 * change is the session's autosave and its Evaluate Position jobs'.
 * `undefined` when the browser refuses a write.
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
  const projects = await loadAnalysisProjects();
  const project =
    projects.find((each) => each.folderId === null && each.name === projectName) ?? (await createAnalysisProject(projectName, null, now));
  if (project === undefined) return undefined;
  const base = sessionBaseTree(tree);
  const record = gameCaseOf({ id: newRecordId(now), projectId: project.id, name: caseName, now }, base);
  const problem = await addAnalysisCases([record]);
  return problem === undefined ? { projectId: project.id, caseId: record.id, base } : undefined;
};
