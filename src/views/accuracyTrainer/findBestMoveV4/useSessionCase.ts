import { useCallback, useMemo, useState } from "react";

import type { AnalysisCase } from "../../../lib/analysisProjects";
import type { FindBestMoveRecord } from "../../../lib/findBestMove/model";
import { sessionRecordOf, type SessionIssue } from "../../../lib/findBestMove/pgn";
import type { AnswerWords } from "../../../lib/findBestMove/projection";
import type { SessionEvent } from "../../../lib/findBestMove/reducer";
import { editSessionCase, type SessionWriteProblem } from "../../../lib/findBestMove/store";
import { readPgnTags } from "../../../lib/pgn";
import { useAnalysisCases } from "../../analysisV2/useAnalysisProjects";

/** A session's Case, as the screen reads it. */
export type SessionCaseState =
  /** The Cases' first read has not landed. */
  | { kind: "loading" }
  /** No such Case. */
  | { kind: "missing" }
  /** A Case whose tags are no session (a plain game, one put there by hand). */
  | { kind: "not-a-session"; caseRecord: AnalysisCase }
  | { kind: "session"; caseRecord: AnalysisCase; record: FindBestMoveRecord; issues: readonly SessionIssue[] };

/** A Case's PGN read once per text — the tags alone, no movetext parse. */
const readingOf = (caseRecord: AnalysisCase): SessionCaseState => {
  const read = sessionRecordOf(readPgnTags(caseRecord.pgn));
  return read === undefined ? { kind: "not-a-session", caseRecord } : { kind: "session", caseRecord, record: read.record, issues: read.issues };
};

/**
 * **A session's Case — the persistence unit** (CTA-244, the design note §7):
 * the Case store's snapshot read, the session parsed from its tags (memoised
 * on the Case's row, so a write of another Case reads nothing), and
 * `dispatch` — every action's write, through `editSessionCase`, the session's
 * one writer. **The record is the store's**: the screen keeps no second copy
 * and no optimistic overlay, so a write the browser refuses leaves the screen
 * as it was, and says so (`writeProblem`).
 */
export const useSessionCase = (caseId: string, words: AnswerWords) => {
  const cases = useAnalysisCases();
  const read = cases !== undefined;
  // The store hands back the same row until it is written, so another Case's write reads nothing here.
  const caseRecord = cases?.find((each) => each.id === caseId);
  const state = useMemo<SessionCaseState>(
    () => (!read ? { kind: "loading" } : caseRecord === undefined ? { kind: "missing" } : readingOf(caseRecord)),
    [read, caseRecord],
  );
  const [writeProblem, setWriteProblem] = useState<SessionWriteProblem | undefined>(undefined);

  /** Events applied in one write — the problem, if any, said until the next write. */
  const dispatch = useCallback(
    async (events: readonly SessionEvent[]): Promise<SessionWriteProblem | undefined> => {
      if (events.length === 0) return undefined;
      const problem = await editSessionCase(caseId, events, { words });
      setWriteProblem(problem);
      return problem;
    },
    [caseId, words],
  );

  return { state, dispatch, writeProblem };
};
