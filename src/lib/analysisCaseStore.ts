import { CASES_STORE, ANALYSIS_PROJECTS_CHANNEL, openAnalysisProjectsDb } from "./analysisProjectsDb";
import {
  analysisCaseFrom,
  copiedCase,
  MAX_CASE_NAME,
  sameCaseState,
  type AnalysisCase,
  type CaseState,
  MAX_ANALYSIS_CASES,
} from "./analysisProjects";
import { idbRecordStore } from "./idbRecordStore";
import { newRecordId } from "./recordId";

/**
 * **Analysis V2's Cases** (CTA-186) — the `cases` object store of
 * `chessapp.analysisProjects` (`lib/analysisProjectsDb.ts`), over the shared
 * [`idbRecordStore.ts`](./idbRecordStore.ts), newest first.
 *
 * Every operation is a promise of `undefined` or a named problem —
 * `"storage"` (IndexedDB refused the write), `"too-many"` (past the cap) —
 * and an operation that changes nothing writes nothing (the same array back:
 * no transaction, no emit). Nothing throws. The autosave
 * ({@link saveCaseState}) writes only what changed, in place.
 */

export type AnalysisCaseProblem = "storage" | "too-many";

const cases = idbRecordStore<AnalysisCase>({
  db: openAnalysisProjectsDb,
  store: CASES_STORE,
  normalise: analysisCaseFrom,
  order: "newest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
});

/** The Cases, newest first — `undefined` until the first read lands. Stable between changes. */
export const analysisCasesSnapshot = cases.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeAnalysisCases = cases.subscribe;

/** The Cases, read now if they have not been. */
export const loadAnalysisCases = cases.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledAnalysisCases = cases.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetAnalysisCaseStore = cases.reset;

const write = cases.write;

/** **Add Cases** at the top, all or nothing under the cap. An id already there is left as it is. */
export const addAnalysisCases = async (added: readonly AnalysisCase[]): Promise<AnalysisCaseProblem | undefined> => {
  if (added.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    const known = new Set(current.map((record) => record.id));
    const fresh = added.filter((record) => !known.has(record.id));
    if (fresh.length === 0) return current;
    if (current.length + fresh.length > MAX_ANALYSIS_CASES) {
      tooMany = true;
      return current;
    }
    return [...fresh, ...current];
  });
  return tooMany ? "too-many" : problem;
};

/** Rename a Case in place — `""` gives it back its derived name. An unchanged name is a no-op. */
export const renameAnalysisCase = (
  id: string,
  name: string,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | undefined> => {
  const trimmed = name.trim().slice(0, MAX_CASE_NAME);
  return write((current) => {
    const existing = current.find((record) => record.id === id);
    if (existing === undefined || existing.name === trimmed) return current;
    return current.map((record) =>
      record.id === id ? { ...record, name: trimmed, updatedAt: now.toISOString() } : record,
    );
  });
};

/** Move a Case to another Project. The same Project, or an unknown Case, is a no-op. */
export const moveAnalysisCase = (
  id: string,
  projectId: string,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | undefined> =>
  write((current) => {
    const existing = current.find((record) => record.id === id);
    if (existing === undefined || existing.projectId === projectId) return current;
    return current.map((record) =>
      record.id === id ? { ...record, projectId, updatedAt: now.toISOString() } : record,
    );
  });

/**
 * **Duplicate a Case** into a Project (its own or another) under `name`, and
 * hand the copy back — `undefined` when nothing was made: an unknown Case, the
 * cap, a refused write.
 */
export const duplicateAnalysisCase = async (
  id: string,
  projectId: string,
  name: string,
  now: Date = new Date(),
): Promise<AnalysisCase | undefined> => {
  const original = (await cases.load()).find((record) => record.id === id);
  if (original === undefined) return undefined;
  const copy = copiedCase(original, newRecordId(now), projectId, name, now);
  return (await addAnalysisCases([copy])) === undefined ? copy : undefined;
};

/** Delete Cases by id. Unknown ids are a no-op. */
export const removeAnalysisCases = (ids: readonly string[]): Promise<AnalysisCaseProblem | undefined> => {
  if (ids.length === 0) return Promise.resolve(undefined);
  const gone = new Set(ids);
  return write((current) => {
    const next = current.filter((record) => !gone.has(record.id));
    return next.length === current.length ? current : next;
  });
};

/** Delete every Case of these Projects — a Project deleted takes its Cases with it. */
export const removeCasesOfProjects = (projectIds: readonly string[]): Promise<AnalysisCaseProblem | undefined> => {
  if (projectIds.length === 0) return Promise.resolve(undefined);
  const gone = new Set(projectIds);
  return write((current) => {
    const next = current.filter((record) => !gone.has(record.projectId));
    return next.length === current.length ? current : next;
  });
};

/**
 * **The autosave**: the analysis on a Case — its tree, where the reader
 * stands, the orientation — written in place. A state the Case already holds
 * writes nothing; an unknown Case (deleted meanwhile) is a no-op.
 */
export const saveCaseState = (
  id: string,
  state: CaseState,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | undefined> =>
  write((current) => {
    const existing = current.find((record) => record.id === id);
    if (existing === undefined || sameCaseState(existing, state)) return current;
    return current.map((record) =>
      record.id === id
        ? { ...record, pgn: state.pgn, path: [...state.path], orientation: state.orientation, updatedAt: now.toISOString() }
        : record,
    );
  });

/**
 * **An import's Cases** (Settings → Import): the ids to remove first, then the
 * Cases to add, in one write — all or nothing under the cap. An added id the
 * store still holds replaces it.
 */
export const importAnalysisCases = async ({
  add,
  remove,
}: {
  add: readonly AnalysisCase[];
  remove: readonly string[];
}): Promise<AnalysisCaseProblem | undefined> => {
  if (add.length === 0 && remove.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    const gone = new Set([...remove, ...add.map((record) => record.id)]);
    const kept = current.filter((record) => !gone.has(record.id));
    if (add.length === 0 && kept.length === current.length) return current;
    if (kept.length + add.length > MAX_ANALYSIS_CASES) {
      tooMany = true;
      return current;
    }
    return [...add, ...kept];
  });
  return tooMany ? "too-many" : problem;
};
