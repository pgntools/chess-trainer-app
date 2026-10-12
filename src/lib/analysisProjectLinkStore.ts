import { ANALYSIS_PROJECTS_CHANNEL, openAnalysisProjectsDb, PROJECT_LINKS_STORE } from "./analysisProjectsDb";
import { MAX_PROJECT_LINKS, projectLinkFrom, type ProjectLink } from "./analysisProjects";
import { idbRecordStore } from "./idbRecordStore";
import { newRecordId } from "./recordId";

/**
 * **The links between Analysis V2's Projects** (CTA-188) — the `projectLinks`
 * object store of `chessapp.analysisProjects` (version 2,
 * `lib/analysisProjectsDb.ts`), over [`idbRecordStore.ts`](./idbRecordStore.ts),
 * oldest first. A link is directed — one Project **links to** another, which
 * is **linked from** it ({@link ProjectLink}) — many to many, cycles allowed,
 * never a Project to itself and never the same pair twice. A Project deleted
 * takes its links with it (`lib/analysisProjectStore.ts`).
 *
 * Every operation is a promise of `undefined` or a named problem; one that
 * changes nothing writes nothing. Nothing throws.
 */

export type ProjectLinkProblem = "storage" | "too-many";

const links = idbRecordStore<ProjectLink>({
  db: openAnalysisProjectsDb,
  store: PROJECT_LINKS_STORE,
  normalise: projectLinkFrom,
  order: "oldest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
});

/** The links, oldest first — `undefined` until the first read lands. Stable between changes. */
export const projectLinksSnapshot = links.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeProjectLinks = links.subscribe;

/** The links, read now if they have not been. */
export const loadProjectLinks = links.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledProjectLinks = links.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetProjectLinkStore = links.reset;

const write = links.write;

/**
 * **Link `fromId` to `toId`.** The pair already linked, or a Project to
 * itself, is a no-op; past {@link MAX_PROJECT_LINKS} it is refused.
 */
export const linkAnalysisProjects = async (
  fromId: string,
  toId: string,
  now: Date = new Date(),
): Promise<ProjectLinkProblem | undefined> => {
  if (fromId === toId) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    if (current.some((link) => link.fromId === fromId && link.toId === toId)) return current;
    if (current.length >= MAX_PROJECT_LINKS) {
      tooMany = true;
      return current;
    }
    return [...current, { id: newRecordId(now), fromId, toId, createdAt: now.toISOString() }];
  });
  return tooMany ? "too-many" : problem;
};

/** **Unlink** — the link by id. An unknown id is a no-op. */
export const unlinkAnalysisProjects = (linkId: string): Promise<ProjectLinkProblem | undefined> =>
  write((current) => (current.some((link) => link.id === linkId) ? current.filter((link) => link.id !== linkId) : current));

/** Every link to or from these Projects — they are being deleted. */
export const removeLinksOfProjects = (projectIds: readonly string[]): Promise<ProjectLinkProblem | undefined> => {
  if (projectIds.length === 0) return Promise.resolve(undefined);
  const gone = new Set(projectIds);
  return write((current) => {
    const next = current.filter((link) => !gone.has(link.fromId) && !gone.has(link.toId));
    return next.length === current.length ? current : next;
  });
};

/**
 * **An import's links** (Settings → Import, CTA-188): the links to or from
 * `removeOf` go first, then `add` — each one a pair not yet linked (the first
 * of a pair kept), never one to itself — in one write, all or nothing under
 * the cap.
 */
export const importProjectLinks = async ({
  add,
  removeOf,
}: {
  add: readonly ProjectLink[];
  removeOf: readonly string[];
}): Promise<ProjectLinkProblem | undefined> => {
  if (add.length === 0 && removeOf.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    const gone = new Set(removeOf);
    const kept = current.filter((link) => !gone.has(link.fromId) && !gone.has(link.toId));
    const pairs = new Set(kept.map((link) => `${link.fromId}\n${link.toId}`));
    const ids = new Set(kept.map((link) => link.id));
    const fresh: ProjectLink[] = [];
    for (const link of add) {
      const pair = `${link.fromId}\n${link.toId}`;
      if (link.fromId === link.toId || pairs.has(pair) || ids.has(link.id)) continue;
      pairs.add(pair);
      ids.add(link.id);
      fresh.push(link);
    }
    if (fresh.length === 0 && kept.length === current.length) return current;
    if (kept.length + fresh.length > MAX_PROJECT_LINKS) {
      tooMany = true;
      return current;
    }
    return [...kept, ...fresh];
  });
  return tooMany ? "too-many" : problem;
};
