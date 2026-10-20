import { removeLinksOfCases } from "./analysisCaseLinkStore";
import { CASES_STORE, ANALYSIS_PROJECTS_CHANNEL, openAnalysisProjectsDb } from "./analysisProjectsDb";
import {
  analysisCaseFrom,
  appendedCases,
  byCaseOrder,
  caseDerivedName,
  compactedCaseOrders,
  copiedCase,
  isBehindMerges,
  MAX_CASE_NAME,
  onlyCasePathDiffers,
  reorderedCases,
  sameCaseState,
  withCaseOrders,
  type AnalysisCase,
  type CaseOrderMove,
  type CaseState,
} from "./analysisProjects";
import type { CatalogGame } from "./gameCatalog";
import { mainlineGame } from "./gameTree";
import { idbRecordStore } from "./idbRecordStore";
import { parsePgnTree } from "./pgn";
import { ANALYSIS_CASE_ENTITY, ANALYSIS_PROJECT_ENTITY } from "./jobs/entityTypes";
import { removeUnfinishedJobsOf } from "./jobs/subjectDeletion";
import { newRecordId } from "./recordId";

/**
 * **Analysis V2's Cases** (CTA-186) — the `cases` object store of
 * `chessapp.analysisProjects` (`lib/analysisProjectsDb.ts`), over the shared
 * [`idbRecordStore.ts`](./idbRecordStore.ts), newest first.
 *
 * Every operation is a promise of `undefined` or `"storage"` (IndexedDB
 * refused the write) — **no cap**: a Project's limit of Cases (CTA-225,
 * `MAX_CASES_PER_PROJECT`) is a warning the screens give, never a refusal —
 * and an operation that changes nothing writes nothing (the same array back:
 * no transaction, no emit). Nothing throws. The autosave
 * ({@link saveCaseState}) writes only what changed, in place. A Case deleted
 * takes its unfinished jobs (the Jobs module's deletion rule, CTA-221,
 * `lib/jobs/subjectDeletion.ts`) and its links (`lib/analysisCaseLinkStore.ts`)
 * with it, and a computer-analysis job is merged into one by
 * {@link mergeIntoAnalysisCase}.
 *
 * **Each Project's Cases have the reader's order** (CTA-203, `order`): a Case
 * added or moved in goes last, one deleted or moved away closes the gap
 * behind it, {@link moveAnalysisCaseInOrder} reorders — and a record from
 * before is given its place as the store reads it (`withCaseOrders`, written
 * back). The list itself stays newest first; the order is a field.
 */

/** `"too-many"` is never the Cases' own (CTA-225) — the links' cap and the Projects', whose stores share this type. */
export type AnalysisCaseProblem = "storage" | "too-many";

const cases = idbRecordStore<AnalysisCase>({
  db: openAnalysisProjectsDb,
  store: CASES_STORE,
  normalise: analysisCaseFrom,
  order: "newest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
  repair: withCaseOrders,
});

/** The Cases, newest first — `undefined` until the first read lands. Stable between changes. */
export const analysisCasesSnapshot = cases.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeAnalysisCases = cases.subscribe;

/** The Cases, read now if they have not been. */
export const loadAnalysisCases = cases.load;
/** The browser's words for the last write of Cases it refused — `"QuotaExceededError: …"` (CTA-208). */
export const lastAnalysisCaseWriteError = cases.lastWriteError;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledAnalysisCases = cases.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetAnalysisCaseStore = cases.reset;

const write = cases.write;

/** Each Case as a stored game, built once per record (a record that will not parse is `null`). */
const catalogEntries = new WeakMap<AnalysisCase, CatalogGame | null>();

/**
 * **A Case as a stored game** (CTA-192) — what `case/<projectId>/<caseId>`
 * names (`lib/gameReference.ts`): an article's embed reads a Case by it. Out
 * of what has been read (`loadAnalysisCases` first); `undefined` for a Case
 * that is not there, is in another Project, or whose PGN will not parse. The
 * name is English and only a fallback (the embed's heading, the MDX editor's
 * label): the Case's own, else its game's players.
 */
export const findAnalysisCaseGame = (segments: readonly string[]): CatalogGame | undefined => {
  if (segments.length !== 2) return undefined;
  const [projectId, caseId] = segments;
  const record = analysisCasesSnapshot()?.find((candidate) => candidate.id === caseId && candidate.projectId === projectId);
  if (record === undefined) return undefined;
  let entry = catalogEntries.get(record);
  if (entry === undefined) {
    try {
      const derived = caseDerivedName(record);
      entry = {
        id: record.id,
        name: record.name || (derived.kind === "game" ? derived.text : "") || "Analysis case",
        pgn: record.pgn,
        game: mainlineGame(parsePgnTree(record.pgn)),
      };
    } catch {
      entry = null;
    }
    catalogEntries.set(record, entry);
  }
  return entry ?? undefined;
};

/**
 * **Add Cases** at the top, all or nothing, each **last in its Project's
 * order**, in the order given. An id already there is left as it is. No cap
 * (CTA-225): a Project past its limit of Cases was asked about by the screen
 * that adds them, and a job's outputs, a duplicate or a move are never asked.
 */
export const addAnalysisCases = async (added: readonly AnalysisCase[]): Promise<AnalysisCaseProblem | undefined> => {
  if (added.length === 0) return undefined;
  return write((current) => {
    const known = new Set(current.map((record) => record.id));
    const fresh = added.filter((record) => !known.has(record.id));
    if (fresh.length === 0) return current;
    return [...appendedCases(current, fresh), ...current];
  });
};

/**
 * **A Case moved in its Project's order** (CTA-203): one place up or down, or
 * to the top or the bottom — its Project numbered 1, 2, … again, no
 * `updatedAt` touched (it is not an edit of the analysis). An unknown Case, or
 * a move past an end, writes nothing.
 */
export const moveAnalysisCaseInOrder = (id: string, move: CaseOrderMove): Promise<AnalysisCaseProblem | undefined> =>
  write((current) => reorderedCases(current, id, move));

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

/**
 * **Move Cases to another Project** (CTA-226 — the Project view's picks), in
 * one write: last in its order, in the order they had where they were, the
 * gaps they leave closed. Unknown ids, and Cases in that Project already, are
 * skipped; none left is a no-op. Their ids stay, so their links, jobs and
 * everything else keyed by them are untouched. No limit asked (CTA-225).
 */
export const moveAnalysisCases = (
  ids: readonly string[],
  projectId: string,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | undefined> => {
  const wanted = new Set(ids);
  return write((current) => {
    const leaving = current.filter((record) => wanted.has(record.id) && record.projectId !== projectId).sort(byCaseOrder);
    if (leaving.length === 0) return current;
    const updatedAt = now.toISOString();
    const moved = new Map(
      appendedCases(current, leaving.map((record) => ({ ...record, projectId, updatedAt }))).map((record) => [record.id, record]),
    );
    return compactedCaseOrders(
      current.map((record) => moved.get(record.id) ?? record),
      leaving.map((record) => record.projectId),
    );
  });
};

/** Move a Case to another Project — {@link moveAnalysisCases} of one. The same Project, or an unknown Case, is a no-op. */
export const moveAnalysisCase = (id: string, projectId: string, now: Date = new Date()): Promise<AnalysisCaseProblem | undefined> =>
  moveAnalysisCases([id], projectId, now);

/**
 * **Duplicate a Case** into a Project (its own or another) under `name`, and
 * hand the copy back — `undefined` when nothing was made: an unknown Case, a
 * refused write.
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

/**
 * Delete Cases by id — their Projects' orders closed up behind them —, their
 * unfinished jobs (the Jobs module's deletion rule, CTA-221 — a running one
 * aborted; finished ones kept) and their links. Unknown ids are a no-op.
 */
export const removeAnalysisCases = async (ids: readonly string[]): Promise<AnalysisCaseProblem | undefined> => {
  if (ids.length === 0) return undefined;
  const gone = new Set(ids);
  const problem = await write((current) => {
    const next = current.filter((record) => !gone.has(record.id));
    if (next.length === current.length) return current;
    return compactedCaseOrders(
      next,
      current.filter((record) => gone.has(record.id)).map((record) => record.projectId),
    );
  });
  if (problem !== undefined) return problem;
  // The deletion rule (CTA-221): their unfinished jobs go, a running one aborted; finished ones stay.
  await removeUnfinishedJobsOf(ids.map((id) => ({ type: ANALYSIS_CASE_ENTITY, id })));
  return removeLinksOfCases(ids);
};

/** Delete every Case of these Projects, their unfinished jobs (and the Projects') and their links — a Project deleted takes its Cases with it. */
export const removeCasesOfProjects = async (projectIds: readonly string[]): Promise<AnalysisCaseProblem | undefined> => {
  if (projectIds.length === 0) return undefined;
  const gone = new Set(projectIds);
  const caseIds: string[] = [];
  const problem = await write((current) => {
    const next = current.filter((record) => !gone.has(record.projectId));
    caseIds.push(...current.filter((record) => gone.has(record.projectId)).map((record) => record.id));
    return next.length === current.length ? current : next;
  });
  if (problem !== undefined) return problem;
  await removeUnfinishedJobsOf([
    ...projectIds.map((id) => ({ type: ANALYSIS_PROJECT_ENTITY, id })),
    ...caseIds.map((id) => ({ type: ANALYSIS_CASE_ENTITY, id })),
  ]);
  return removeLinksOfCases(caseIds);
};

/**
 * **The autosave**: the analysis on a Case — its tree, where the reader
 * stands, the orientation — and how its board draws, written in place. A state the Case already holds
 * writes nothing; an unknown Case (deleted meanwhile) is a no-op.
 *
 * **A state from before a merge** (CTA-188 — a computer analysis's merge the record
 * lists and the state does not, `isBehindMerges`) never writes its tree: the
 * record keeps the merged one, and only the place, the orientation and the
 * display are written. The board takes the merge in and writes again.
 *
 * **A step is written quietly** (CTA-222, `onlyCasePathDiffers`): a state that
 * differs only in the move on screen — the reader stepping through the game —
 * is written at once, as every state is, but this tab's subscribers are not
 * called for it (the record store's `quiet`): the board already shows it, and
 * a redraw of the route per arrow press is what made stepping lag. Other tabs
 * are told as ever.
 */
export const saveCaseState = (
  id: string,
  state: CaseState,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | undefined> => {
  // A step alone — the move on screen, nothing else — is written quietly (CTA-222): the board already shows it.
  let step = false;
  return write(
    (current) => {
      const existing = current.find((record) => record.id === id);
      if (existing === undefined || sameCaseState(existing, state)) return current;
      step = onlyCasePathDiffers(existing, state);
      const behind = isBehindMerges(existing, state);
      return current.map((record) =>
        record.id === id
          ? {
              ...record,
              ...(behind ? {} : { pgn: state.pgn, merges: [...(state.merges ?? [])] }),
              path: [...state.path],
              orientation: state.orientation,
              display: { ...state.display },
              updatedAt: now.toISOString(),
            }
          : record,
      );
    },
    { quiet: () => step },
  );
};

/**
 * **A computer-analysis job merged into a Case** (CTA-188; the Jobs module's `analysis.computer-analysis` since CTA-221): `edit` takes
 * the Case's tree as the store holds it **now** (its PGN) and answers the
 * merged one — the reader's moves, side lines and comments kept — and the
 * record lists `mergeId` in its `merges`, so an open board takes it in and its
 * autosave never writes the tree from before back. `"gone"` for a Case not
 * there; a merge it already holds, or an edit answering `undefined`, writes
 * nothing.
 */
export const mergeIntoAnalysisCase = (
  id: string,
  mergeId: string,
  edit: (pgn: string) => string | undefined,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | "gone" | undefined> =>
  editCasePgn(id, (record) => (record.merges.includes(mergeId) ? undefined : edit(record.pgn)), now, (record) => [...record.merges, mergeId]);

/**
 * **A Case's PGN edited in the store's queue** (CTA-244): `edit` takes the
 * Case's PGN as the store holds it **now** and answers the next one — read,
 * modified and written in one queued write, so two edits issued back to back
 * each see the other's result. `"gone"` for a Case not there; an edit
 * answering `undefined`, or the same text, writes nothing. The Find Best Move
 * session's one writer (`lib/findBestMove/store.ts`) is built on it.
 */
export const editAnalysisCasePgn = (
  id: string,
  edit: (pgn: string) => string | undefined,
  now: Date = new Date(),
): Promise<AnalysisCaseProblem | "gone" | undefined> => editCasePgn(id, (record) => edit(record.pgn), now);

/** The one write under both: `merges`, where given, the record's next ones. */
const editCasePgn = async (
  id: string,
  edit: (record: AnalysisCase) => string | undefined,
  now: Date,
  merges?: (record: AnalysisCase) => string[],
): Promise<AnalysisCaseProblem | "gone" | undefined> => {
  let found = false;
  const problem = await write((current) => {
    const existing = current.find((record) => record.id === id);
    if (existing === undefined) return current;
    found = true;
    const pgn = edit(existing);
    // A merge is recorded even where its text is the Case's already; a plain edit answering the same text is none.
    if (pgn === undefined || (merges === undefined && pgn === existing.pgn)) return current;
    return current.map((record) =>
      record.id === id
        ? { ...record, pgn, ...(merges === undefined ? {} : { merges: merges(record) }), updatedAt: now.toISOString() }
        : record,
    );
  });
  return problem ?? (found ? undefined : "gone");
};

/**
 * **An import's Cases** (Settings → Import): the ids to remove first, then the
 * Cases to add, in one write — all or nothing, no cap (CTA-225). An added id the
 * store still holds replaces it. **Their order** (CTA-203): into a Project
 * that keeps Cases of its own (a Merge) they go last, in the zip's order; into
 * one they fill, the zip's order is kept — a Case from an older zip, with
 * none, given its place by date (`withCaseOrders`).
 */
export const importAnalysisCases = async ({
  add,
  remove,
}: {
  add: readonly AnalysisCase[];
  remove: readonly string[];
}): Promise<AnalysisCaseProblem | undefined> => {
  if (add.length === 0 && remove.length === 0) return undefined;
  return write((current) => {
    const gone = new Set([...remove, ...add.map((record) => record.id)]);
    const kept = current.filter((record) => !gone.has(record.id));
    if (add.length === 0 && kept.length === current.length) return current;
    const keptProjects = new Set(kept.map((record) => record.projectId));
    const intoKept = add.filter((record) => keptProjects.has(record.projectId));
    const appended = new Map(appendedCases(kept, [...intoKept].sort(byCaseOrder)).map((record) => [record.id, record]));
    return withCaseOrders([...add.map((record) => appended.get(record.id) ?? record), ...kept]);
  });
};
