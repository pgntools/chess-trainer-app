import type { SideValue } from "../../../design-system/components/forms";
import { sessionPositionsOf, trainingPositionFrom, trainingPositionsOf } from "../../../lib/accuracyTrainer";
import { addAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf, type AnalysisProject } from "../../../lib/analysisProjects";
import { createAnalysisProject, loadAnalysisProjects } from "../../../lib/analysisProjectStore";
import { sessionBaseTree, startSession } from "../../../lib/findBestMoveSession";
import { isSessionTree, sessionRecordOf, withSessionRecord } from "../../../lib/findBestMoveSessionPgn";
import { turnOf } from "../../../lib/computerAnalysis";
import { emptyTree, type GameTree } from "../../../lib/gameTree";
import { newRecordId } from "../../../lib/recordId";
import type { SessionSource } from "./sessionSetup";

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

/** A new session's settings: how many best moves to find, the engine, the next-move arrows. */
export type NewSessionSettings = { moves: number; engine: boolean; showArrows: boolean };

/**
 * **The tree a session starts from** (CTA-239): a session's own PGN as it is
 * — resumed where it was left — or a game's mainline with a new session
 * written in (its positions for the side, the settings); `undefined` with
 * nothing to ask, or a session PGN this build cannot read.
 */
export const sessionStartTreeOf = (source: SessionSource, side: SideValue, settings: NewSessionSettings): GameTree | undefined => {
  if (isSessionTree(source.tree)) return sessionRecordOf(source.tree) === undefined ? undefined : source.tree;
  const trainedSide = side === "all" ? "both" : side === "white" ? "w" : "b";
  const base = sessionBaseTree(source.tree);
  const started = startSession({
    caseRef: { projectId: "", caseId: "" },
    side: trainedSide,
    game: source.name,
    positions: sessionPositionsOf(trainingPositionsOf(source.tree, { unevaluated: settings.engine }), trainedSide),
    wanted: settings.moves,
    tree: base,
  });
  return started === undefined ? undefined : withSessionRecord(base, { ...started, engine: settings.engine, showArrows: settings.showArrows });
};

/**
 * **The tree a session from a position starts from** (CTA-239, the form's
 * Board editor): the position alone, no game — one position to answer, the
 * side to move's, with no line of its own: the engine finds them (the
 * session's engine on, whatever the form's switch says). `game` names it.
 */
export const positionSessionTreeOf = (fen: string, game: string, settings: NewSessionSettings): GameTree | undefined => {
  const tree = emptyTree(fen);
  const turn = turnOf(fen);
  const position = trainingPositionFrom({ nodeId: null, path: [], fen, turn, ply: 1, moveNumber: Number(fen.split(" ")[5]) || 1, playedSan: "" }, []);
  const started = startSession({ caseRef: { projectId: "", caseId: "" }, side: turn, game, positions: [position], wanted: settings.moves, tree });
  return started === undefined ? undefined : withSessionRecord(tree, { ...started, engine: true, showArrows: settings.showArrows });
};
