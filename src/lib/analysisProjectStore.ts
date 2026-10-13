import {
  addAnalysisCases,
  loadAnalysisCases,
  removeCasesOfProjects,
  type AnalysisCaseProblem,
} from "./analysisCaseStore";
import { ANALYSIS_PROJECTS_CHANNEL, openAnalysisProjectsDb, PROJECTS_STORE } from "./analysisProjectsDb";
import {
  analysisProjectFrom,
  casesOf,
  copiedCase,
  MAX_PROJECT_NAME,
  type AnalysisCase,
  type AnalysisProject,
  MAX_ANALYSIS_PROJECTS,
} from "./analysisProjects";
import { idbRecordStore } from "./idbRecordStore";
import { newRecordId } from "./recordId";

/**
 * **Analysis V2's Projects** (CTA-186) — the `projects` object store of
 * `chessapp.analysisProjects`, over [`idbRecordStore.ts`](./idbRecordStore.ts),
 * newest first. A Project owns its Cases: deleting one deletes them — and
 * their Jobs V2 and their links (CTA-188)
 * ({@link removeAnalysisProject}) — duplicating one copies them
 * ({@link duplicateAnalysisProject}). Every operation is a promise; nothing
 * throws.
 */

export type AnalysisProjectProblem = AnalysisCaseProblem;

const projects = idbRecordStore<AnalysisProject>({
  db: openAnalysisProjectsDb,
  store: PROJECTS_STORE,
  normalise: analysisProjectFrom,
  order: "newest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
});

/** The Projects, newest first — `undefined` until the first read lands. Stable between changes. */
export const analysisProjectsSnapshot = projects.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeAnalysisProjects = projects.subscribe;

/** The Projects, read now if they have not been. */
export const loadAnalysisProjects = projects.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledAnalysisProjects = projects.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetAnalysisProjectStore = projects.reset;

const write = projects.write;

const nameOf = (name: string): string => name.trim().slice(0, MAX_PROJECT_NAME);

/**
 * **Create a Project** in a folder (`null`: the top level) and hand it back —
 * `undefined` when nothing was made: a name that trims to nothing (a
 * Project's name is required), the cap, a refused write.
 */
export const createAnalysisProject = async (
  name: string,
  folderId: string | null,
  now: Date = new Date(),
): Promise<AnalysisProject | undefined> => {
  const trimmed = nameOf(name);
  if (trimmed === "") return undefined;
  const project: AnalysisProject = {
    id: newRecordId(now),
    name: trimmed,
    folderId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  let made = false;
  const problem = await write((current) => {
    if (current.length >= MAX_ANALYSIS_PROJECTS) return current;
    made = true;
    return [project, ...current];
  });
  return made && problem === undefined ? project : undefined;
};

/** Rename a Project in place. A blank or unchanged name is a no-op. */
export const renameAnalysisProject = (
  id: string,
  name: string,
  now: Date = new Date(),
): Promise<AnalysisProjectProblem | undefined> => {
  const trimmed = nameOf(name);
  if (trimmed === "") return Promise.resolve(undefined);
  return write((current) => {
    const existing = current.find((project) => project.id === id);
    if (existing === undefined || existing.name === trimmed) return current;
    return current.map((project) =>
      project.id === id ? { ...project, name: trimmed, updatedAt: now.toISOString() } : project,
    );
  });
};

/** File a Project in another folder (`null`: the top level). The same folder is a no-op. */
export const moveAnalysisProject = (
  id: string,
  folderId: string | null,
  now: Date = new Date(),
): Promise<AnalysisProjectProblem | undefined> =>
  write((current) => {
    const existing = current.find((project) => project.id === id);
    if (existing === undefined || existing.folderId === folderId) return current;
    return current.map((project) =>
      project.id === id ? { ...project, folderId, updatedAt: now.toISOString() } : project,
    );
  });

/**
 * **Duplicate a Project with its Cases**, filed beside it under `name`, and
 * hand the copy back — `undefined` when nothing was made (an unknown
 * Project, a blank name, a cap, a refused write). The Cases go first, all or
 * nothing, so a copy is never left without them.
 */
export const duplicateAnalysisProject = async (
  id: string,
  name: string,
  now: Date = new Date(),
): Promise<AnalysisProject | undefined> => {
  const original = (await projects.load()).find((project) => project.id === id);
  const trimmed = nameOf(name);
  if (original === undefined || trimmed === "") return undefined;
  if ((await projects.load()).length >= MAX_ANALYSIS_PROJECTS) return undefined;

  const copy: AnalysisProject = {
    ...original,
    id: newRecordId(now),
    name: trimmed,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  // In the original's order, which the copies keep at the top of the list.
  const copies: AnalysisCase[] = casesOf(await loadAnalysisCases(), id).map((record) =>
    copiedCase(record, newRecordId(now), copy.id, record.name, now),
  );
  if ((await addAnalysisCases(copies)) !== undefined) return undefined;
  let made = false;
  const problem = await write((current) => {
    if (current.length >= MAX_ANALYSIS_PROJECTS) return current;
    made = true;
    return [copy, ...current];
  });
  if (!made || problem !== undefined) {
    await removeCasesOfProjects([copy.id]);
    return undefined;
  }
  return copy;
};

/** **Delete a Project and its Cases** (their Jobs V2 and links). An unknown id is a no-op. */
export const removeAnalysisProject = async (id: string): Promise<AnalysisProjectProblem | undefined> =>
  removeAnalysisProjects([id]);

/** Delete Projects and their Cases (and the Cases' Jobs V2 and links) — the browser's delete of the picks (CTA-191). Unknown ids are a no-op. */
export const removeAnalysisProjects = async (
  ids: readonly string[],
): Promise<AnalysisProjectProblem | undefined> => {
  if (ids.length === 0) return undefined;
  const gone = new Set(ids);
  const problem = await write((current) => {
    const next = current.filter((project) => !gone.has(project.id));
    return next.length === current.length ? current : next;
  });
  if (problem !== undefined) return problem;
  return removeCasesOfProjects(ids);
};

/** Every Project filed directly in `folderId` re-filed in `parentId` — a folder deleted keeps what it held one level up. */
export const refileProjectsIn = (
  folderId: string,
  parentId: string | null,
  now: Date = new Date(),
): Promise<AnalysisProjectProblem | undefined> =>
  write((current) => {
    if (!current.some((project) => project.folderId === folderId)) return current;
    return current.map((project) =>
      project.folderId === folderId ? { ...project, folderId: parentId, updatedAt: now.toISOString() } : project,
    );
  });

/** Delete every Project filed in these folders, and their Cases — a deep folder delete's. */
export const removeProjectsInFolders = async (
  folderIds: ReadonlySet<string>,
): Promise<AnalysisProjectProblem | undefined> => {
  const ids = (await projects.load())
    .filter((project) => project.folderId !== null && folderIds.has(project.folderId))
    .map((project) => project.id);
  return removeAnalysisProjects(ids);
};

/**
 * **An import's Projects** (Settings → Import): the ids to remove first, then
 * the Projects to add, in one write — all or nothing under the cap. Their
 * Cases are the case store's ({@link importAnalysisCases}).
 */
export const importAnalysisProjects = async ({
  add,
  remove,
}: {
  add: readonly AnalysisProject[];
  remove: readonly string[];
}): Promise<AnalysisProjectProblem | undefined> => {
  if (add.length === 0 && remove.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    const gone = new Set([...remove, ...add.map((project) => project.id)]);
    const kept = current.filter((project) => !gone.has(project.id));
    if (add.length === 0 && kept.length === current.length) return current;
    if (kept.length + add.length > MAX_ANALYSIS_PROJECTS) {
      tooMany = true;
      return current;
    }
    return [...add, ...kept];
  });
  return tooMany ? "too-many" : problem;
};
