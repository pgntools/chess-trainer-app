import { addAnalysisCases, editAnalysisCasePgn, type AnalysisCaseProblem } from "../analysisCaseStore";
import { copiedCase, DEFAULT_CASE_DISPLAY, gameCaseOf, type AnalysisCase, type AnalysisProject } from "../analysisProjects";
import { createAnalysisProject, loadAnalysisProjects } from "../analysisProjectStore";
import type { GameHeaders } from "../gameModel";
import { treeToPgn, type GameTree } from "../gameTree";
import { parsePgnTree, readPgnTags } from "../pgn";
import { newRecordId } from "../recordId";
import type { FindBestMoveRecord } from "./model";
import { sessionRecordOf, withSessionTags, withoutSessionTags } from "./pgn";
import { sessionMovetextOf, type AnswerWords } from "./projection";
import { reduceSession, type SessionEvent } from "./reducer";
import { isDone } from "./selectors";
import { answerWordsOf } from "./words";

/**
 * **A session's Case, written** (CTA-244, the design note §6.2). **One
 * function writes a session Case**: {@link editSessionCase} — the screen for
 * every action, the Evaluate Position job for its search. Inside the Case
 * store's queued write it reads the record from the Case's tags (no
 * movetext parse), applies the events, and writes the PGN only when the
 * record changed. Each write applies an **event to the record stored at that
 * moment**, never a snapshot of someone's memory, so the screen's and the
 * job's writes commute — no merge ids.
 */

/**
 * **The session as a game** — the record's movetext (`sessionMovetextOf`)
 * under the source game's own tags and the record's, as one tree: what a
 * session Case's PGN is, and what Download saves.
 */
export const sessionTreeOf = (record: FindBestMoveRecord, headers: Readonly<GameHeaders>, words: AnswerWords = answerWordsOf()): GameTree => {
  // The start is the recorded game's: `treeToPgn` writes `SetUp` / `FEN` from it.
  const own = Object.fromEntries(Object.entries(withoutSessionTags(headers)).filter(([name]) => name !== "SetUp" && name !== "FEN"));
  return sessionMovetextOf(record, words, withSessionTags(own, record, isDone(record)));
};

/** **The session's PGN** — {@link sessionTreeOf} written. Deterministic: the same record, tags and words give the same text. */
export const sessionPgnOf = (record: FindBestMoveRecord, headers: Readonly<GameHeaders>, words?: AnswerWords): string =>
  treeToPgn(sessionTreeOf(record, headers, words));

/** What a write answers: the store's refusal, a Case not there, or one that holds no session. */
export type SessionWriteProblem = AnalysisCaseProblem | "gone" | "not-a-session";

/**
 * **The one writer**: `events` applied to the session its Case holds now —
 * read from its tags, reduced, written whole (every session tag dropped and
 * the record's written, the movetext re-derived) only when the record
 * changed. `"gone"` for a Case not there, `"not-a-session"` for one whose
 * tags are no session (nothing written).
 */
export const editSessionCase = async (
  caseId: string,
  events: readonly SessionEvent[],
  { words, now = new Date() }: { words?: AnswerWords; now?: Date } = {},
): Promise<SessionWriteProblem | undefined> => {
  let session = true;
  const problem = await editAnalysisCasePgn(
    caseId,
    (pgn) => {
      const tags = readPgnTags(pgn);
      const read = sessionRecordOf(tags);
      if (read === undefined) {
        session = false;
        return undefined;
      }
      const next = reduceSession(read.record, events);
      return next === read.record ? undefined : sessionPgnOf(next, tags, words);
    },
    now,
  );
  return problem ?? (session ? undefined : "not-a-session");
};

/** **The Find Best Move project** — the first at the top level named `name` (the reader's language's); `undefined` before the first session. */
export const sessionProjectOf = <T extends Pick<AnalysisProject, "folderId" | "name">>(projects: readonly T[], name: string): T | undefined =>
  projects.find((each) => each.folderId === null && each.name === name);

/**
 * **A session's Case, made** — in the one *Find Best Move* project at the top
 * level (found by its name, else made), a Game Case named `caseName` of the
 * session's PGN, its evaluations never written by an Analysis board (S4,
 * defence in depth). `undefined` when the browser refuses a write.
 */
export const createSessionCase = async ({
  record,
  headers,
  projectName,
  caseName,
  words,
  now = new Date(),
}: {
  record: FindBestMoveRecord;
  headers: Readonly<GameHeaders>;
  projectName: string;
  caseName: string;
  words?: AnswerWords;
  now?: Date;
}): Promise<{ projectId: string; caseId: string } | undefined> => {
  const project = sessionProjectOf(await loadAnalysisProjects(), projectName) ?? (await createAnalysisProject(projectName, null, now));
  if (project === undefined) return undefined;
  const made = gameCaseOf({ id: newRecordId(now), projectId: project.id, name: caseName, now }, sessionTreeOf(record, headers, words), { writeEvals: false });
  return (await addAnalysisCases([made])) === undefined ? { projectId: project.id, caseId: made.id } : undefined;
};

/**
 * **A session Case duplicated as a plain Case** (CTA-244, S3 — Analysis's
 * offer for a session Case it opens read-only): a copy in the same Project,
 * named `name`, its PGN the session's readable game — the movetext as it
 * stands — without the `FindBestMove*` tags, so an ordinary game any board
 * edits; its evaluations written again as a new Case's are. The copy, or
 * `undefined` when its PGN will not read or the browser refuses the write.
 */
export const duplicateSessionAsPlainCase = async (record: AnalysisCase, name: string, now: Date = new Date()): Promise<AnalysisCase | undefined> => {
  let tree: GameTree;
  try {
    tree = parsePgnTree(record.pgn);
  } catch {
    return undefined;
  }
  const pgn = treeToPgn({ ...tree, headers: withoutSessionTags(tree.headers) });
  const copy: AnalysisCase = {
    ...copiedCase(record, newRecordId(now), record.projectId, name, now),
    source: { kind: "pgn", pgn, startPath: [], fen: tree.startFen },
    pgn,
    path: [],
    display: { ...record.display, writeEvals: DEFAULT_CASE_DISPLAY.writeEvals },
    merges: [],
  };
  return (await addAnalysisCases([copy])) === undefined ? copy : undefined;
};
