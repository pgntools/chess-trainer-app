import { ANALYSIS_PROJECTS_CHANNEL, CASE_LINKS_STORE, openAnalysisProjectsDb } from "./analysisProjectsDb";
import { caseLinkFrom, MAX_CASE_LINKS, type CaseLink } from "./analysisProjects";
import { idbRecordStore } from "./idbRecordStore";
import { newRecordId } from "./recordId";

/**
 * **The links between Analysis V2's Cases** (CTA-188) — the `caseLinks`
 * object store of `chessapp.analysisProjects` (`lib/analysisProjectsDb.ts`),
 * over [`idbRecordStore.ts`](./idbRecordStore.ts), oldest first. A link is
 * directed — one Case **links to** another, which is **linked from** it
 * ({@link CaseLink}) — many to many, across Projects, cycles allowed, never a
 * Case to itself and never the same pair twice. A Case deleted takes its links
 * with it (`lib/analysisCaseStore.ts`).
 *
 * Every operation is a promise of `undefined` or a named problem; one that
 * changes nothing writes nothing. Nothing throws.
 */

export type CaseLinkProblem = "storage" | "too-many";

const links = idbRecordStore<CaseLink>({
  db: openAnalysisProjectsDb,
  store: CASE_LINKS_STORE,
  normalise: caseLinkFrom,
  order: "oldest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
});

/** The links, oldest first — `undefined` until the first read lands. Stable between changes. */
export const caseLinksSnapshot = links.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeCaseLinks = links.subscribe;

/** The links, read now if they have not been. */
export const loadCaseLinks = links.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledCaseLinks = links.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetCaseLinkStore = links.reset;

const write = links.write;

const pairOf = (link: Pick<CaseLink, "fromId" | "toId">) => `${link.fromId}\n${link.toId}`;

/**
 * **Link Cases**, each `{ fromId, toId }` — in one write, all or nothing under
 * {@link MAX_CASE_LINKS}. A pair already linked, or a Case to itself, is left
 * out; none left is a no-op.
 */
export const addCaseLinks = async (
  pairs: readonly { fromId: string; toId: string }[],
  now: Date = new Date(),
): Promise<CaseLinkProblem | undefined> => {
  if (pairs.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    const known = new Set(current.map(pairOf));
    const fresh: CaseLink[] = [];
    for (const { fromId, toId } of pairs) {
      if (fromId === toId || known.has(pairOf({ fromId, toId }))) continue;
      known.add(pairOf({ fromId, toId }));
      fresh.push({ id: newRecordId(now), fromId, toId, createdAt: now.toISOString() });
    }
    if (fresh.length === 0) return current;
    if (current.length + fresh.length > MAX_CASE_LINKS) {
      tooMany = true;
      return current;
    }
    return [...current, ...fresh];
  });
  return tooMany ? "too-many" : problem;
};

/** **Link `fromId` to `toId`.** The pair already linked, or a Case to itself, is a no-op. */
export const linkAnalysisCases = (fromId: string, toId: string, now: Date = new Date()): Promise<CaseLinkProblem | undefined> =>
  addCaseLinks([{ fromId, toId }], now);

/** **Unlink** — the link by id. An unknown id is a no-op. */
export const unlinkAnalysisCases = (linkId: string): Promise<CaseLinkProblem | undefined> =>
  write((current) => (current.some((link) => link.id === linkId) ? current.filter((link) => link.id !== linkId) : current));

/** Every link to or from these Cases — they are being deleted. */
export const removeLinksOfCases = (caseIds: readonly string[]): Promise<CaseLinkProblem | undefined> => {
  if (caseIds.length === 0) return Promise.resolve(undefined);
  const gone = new Set(caseIds);
  return write((current) => {
    const next = current.filter((link) => !gone.has(link.fromId) && !gone.has(link.toId));
    return next.length === current.length ? current : next;
  });
};

/**
 * **An import's links** (Settings → Import, CTA-188): the links to or from
 * `removeOf` (the Cases the import replaces or removes) go first, then `add` —
 * each a pair not yet linked (the first of a pair kept), never one to itself —
 * in one write, all or nothing under the cap.
 */
export const importCaseLinks = async ({
  add,
  removeOf,
}: {
  add: readonly CaseLink[];
  removeOf: readonly string[];
}): Promise<CaseLinkProblem | undefined> => {
  if (add.length === 0 && removeOf.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    const gone = new Set(removeOf);
    const kept = current.filter((link) => !gone.has(link.fromId) && !gone.has(link.toId));
    const pairs = new Set(kept.map(pairOf));
    const ids = new Set(kept.map((link) => link.id));
    const fresh: CaseLink[] = [];
    for (const link of add) {
      if (link.fromId === link.toId || pairs.has(pairOf(link)) || ids.has(link.id)) continue;
      pairs.add(pairOf(link));
      ids.add(link.id);
      fresh.push(link);
    }
    if (fresh.length === 0 && kept.length === current.length) return current;
    if (kept.length + fresh.length > MAX_CASE_LINKS) {
      tooMany = true;
      return current;
    }
    return [...kept, ...fresh];
  });
  return tooMany ? "too-many" : problem;
};
