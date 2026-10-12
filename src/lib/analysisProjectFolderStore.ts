import { ANALYSIS_PROJECTS_CHANNEL, openAnalysisProjectsDb, PROJECT_FOLDERS_STORE } from "./analysisProjectsDb";
import {
  MAX_PROJECT_FOLDERS,
  MAX_PROJECT_NAME,
  projectFolderFrom,
  projectFolderSubtree,
  type ProjectFolder,
} from "./analysisProjects";
import { refileProjectsIn, removeProjectsInFolders } from "./analysisProjectStore";
import { idbRecordStore } from "./idbRecordStore";
import { newRecordId } from "./recordId";

/**
 * **Analysis V2's folders** (CTA-186) — the `folders` object store of
 * `chessapp.analysisProjects`, oldest first, the legacy analyses' folder
 * store's rules (`savedAnalysisFolderStore.ts`): {@link createProjectFolder}
 * hands back what it made, {@link moveProjectFolder} refuses the folder's own
 * subtree, {@link removeProjectFolder} keeps what it held — sub-folders and
 * Projects move up a level — and {@link removeProjectFolderDeep} takes the
 * whole subtree, every Project in it and their Cases. Every write is a
 * promise; nothing throws.
 */

export type ProjectFolderProblem = "storage" | "too-many";

const folders = idbRecordStore<ProjectFolder>({
  db: openAnalysisProjectsDb,
  store: PROJECT_FOLDERS_STORE,
  normalise: projectFolderFrom,
  order: "oldest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
});

/** The folders, oldest first — `undefined` until the first read lands. Stable between changes. */
export const projectFoldersSnapshot = folders.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeProjectFolders = folders.subscribe;

/** The folders, read now if they have not been. */
export const loadProjectFolders = folders.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledProjectFolders = folders.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetProjectFolderStore = folders.reset;

const write = folders.write;

const nameOf = (name: string): string => name.trim().slice(0, MAX_PROJECT_NAME);

/**
 * Create a folder under `parentId` (`null`: the top level) and hand it back —
 * `undefined` when nothing was made: a blank name, a parent that is not
 * there, the cap, a refused write.
 */
export const createProjectFolder = async (
  name: string,
  parentId: string | null,
  now: Date = new Date(),
): Promise<ProjectFolder | undefined> => {
  const trimmed = nameOf(name);
  if (trimmed === "") return undefined;
  const folder: ProjectFolder = {
    id: newRecordId(now),
    name: trimmed,
    parentId,
    savedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  let made = false;
  const problem = await write((current) => {
    if (current.length >= MAX_PROJECT_FOLDERS) return current;
    if (parentId !== null && !current.some((row) => row.id === parentId)) return current;
    made = true;
    return [...current, folder];
  });
  return made && problem === undefined ? folder : undefined;
};

/** Rename a folder in place. A blank or unchanged name is a no-op. */
export const renameProjectFolder = (
  id: string,
  name: string,
  now: Date = new Date(),
): Promise<ProjectFolderProblem | undefined> => {
  const trimmed = nameOf(name);
  if (trimmed === "") return Promise.resolve(undefined);
  return write((current) => {
    const existing = current.find((folder) => folder.id === id);
    if (existing === undefined || existing.name === trimmed) return current;
    return current.map((folder) =>
      folder.id === id ? { ...folder, name: trimmed, updatedAt: now.toISOString() } : folder,
    );
  });
};

/**
 * Move a folder under another (`null`: the top level). **Never into its own
 * subtree** — that would loop every path through it — nor under a folder
 * that is not there; a move that changes nothing is a no-op.
 */
export const moveProjectFolder = (
  id: string,
  parentId: string | null,
  now: Date = new Date(),
): Promise<ProjectFolderProblem | undefined> =>
  write((current) => {
    const existing = current.find((folder) => folder.id === id);
    if (existing === undefined || existing.parentId === parentId) return current;
    if (parentId !== null) {
      if (!current.some((folder) => folder.id === parentId)) return current;
      if (projectFolderSubtree(current, id).has(parentId)) return current;
    }
    return current.map((folder) =>
      folder.id === id ? { ...folder, parentId, updatedAt: now.toISOString() } : folder,
    );
  });

/**
 * **Delete a folder, keeping what it held**: its sub-folders and its Projects
 * move up to its own parent. An unknown id is a no-op.
 */
export const removeProjectFolder = async (
  id: string,
  now: Date = new Date(),
): Promise<ProjectFolderProblem | undefined> => {
  let parentId: string | null | undefined;
  const problem = await write((current) => {
    const existing = current.find((folder) => folder.id === id);
    if (existing === undefined) return current;
    parentId = existing.parentId;
    return current
      .filter((folder) => folder.id !== id)
      .map((folder) =>
        folder.parentId === id ? { ...folder, parentId: existing.parentId, updatedAt: now.toISOString() } : folder,
      );
  });
  if (problem !== undefined || parentId === undefined) return problem;
  return refileProjectsIn(id, parentId, now);
};

/**
 * **Delete a folder with everything under it** — the reader's explicit
 * choice: its whole subtree of folders, every Project filed in them and
 * their Cases. An unknown id is a no-op.
 */
export const removeProjectFolderDeep = async (id: string): Promise<ProjectFolderProblem | undefined> => {
  let gone = new Set<string>();
  const problem = await write((current) => {
    if (!current.some((folder) => folder.id === id)) return current;
    gone = projectFolderSubtree(current, id);
    return current.filter((folder) => !gone.has(folder.id));
  });
  if (problem !== undefined || gone.size === 0) return problem;
  return removeProjectsInFolders(gone);
};

/**
 * **An import's folders** (Settings → Import), made whole elsewhere — ids,
 * names and parents — added at the end in one write, parents before
 * children. All or nothing: past the cap it is refused with `"too-many"`.
 */
export const addProjectFolders = async (
  added: readonly ProjectFolder[],
): Promise<ProjectFolderProblem | undefined> => {
  if (added.length === 0) return undefined;
  let tooMany = false;
  const problem = await write((current) => {
    if (current.length + added.length > MAX_PROJECT_FOLDERS) {
      tooMany = true;
      return current;
    }
    return [...current, ...added];
  });
  return tooMany ? "too-many" : problem;
};
