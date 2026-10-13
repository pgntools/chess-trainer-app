import type { ProjectTreeRow } from "./analysisProjectRows";
import { projectFolderSubtree, type AnalysisCase, type AnalysisProject, type ProjectFolder } from "./analysisProjects";

/**
 * **Analysis V2's picks in the Projects browser** (CTA-191) — the legacy
 * saved analyses' (`analysisPicksOf` in `savedAnalysisFolders.ts`, CTA-147)
 * one level deeper: folders hold Projects, Projects hold Cases, and **one set
 * of ids** picks any of them.
 *
 * - **A container's id stands for everything under it**: a folder its
 *   sub-folders, their Projects and those Projects' Cases; a Project its
 *   Cases. Ticking one adds its id and every id under it.
 * - **A box's state is derived** ({@link projectPicksOf}): a Case is picked
 *   when its id is, or its Project's, or a folder's above; a Project checked
 *   when it is picked so, or it has Cases and all are picked, partly ticked
 *   while some are; a folder likewise over every **leaf** under it — each
 *   Case, and each Project that has none (an empty folder only ever by its
 *   own box or one above it).
 * - **Unticking takes a thing, all under it and every container above it**
 *   out — what was picked through those containers stays picked, written out
 *   by id — so no container stays checked, and so deleted whole, over what
 *   is only partly picked.
 * - **A delete** ({@link projectPicksDeletion}) takes every checked folder
 *   with everything in it, every checked Project with its Cases, and every
 *   picked Case.
 *
 * Every id is a record id (`lib/recordId.ts`), so a folder's, a Project's and
 * a Case's never meet. Pure.
 */

/** A box's state: checked, or partly ticked from what is under it. */
export type ProjectPickState = { checked: boolean; indeterminate: boolean };

/** What the picks are read against: the folders, the Projects and the Cases. */
export type ProjectPickModel = {
  folders: readonly ProjectFolder[];
  projects: readonly Pick<AnalysisProject, "id" | "folderId">[];
  cases: readonly Pick<AnalysisCase, "id" | "projectId">[];
};

/** What the picks stand for: every picked Case, and each Project's and folder's box. */
export type ProjectPicks = {
  cases: ReadonlySet<string>;
  projects: ReadonlyMap<string, ProjectPickState>;
  folders: ReadonlyMap<string, ProjectPickState>;
};

/** One row's box — what a tick or select-all is about. */
export type ProjectPickTarget = { kind: "folder" | "project" | "case"; id: string };

/** What a tree row's box is about (`projectTreeRows`' rows). */
export const projectPickTargetOf = (row: ProjectTreeRow): ProjectPickTarget =>
  row.kind === "folder"
    ? { kind: "folder", id: row.folder.id }
    : row.kind === "case"
      ? { kind: "case", id: row.item.id }
      : { kind: "project", id: row.item.id };

const UNPICKED: ProjectPickState = { checked: false, indeterminate: false };

/** The model's indexes: a folder's parent (a dangling one read as the top level), a Project's folder, each Project's Cases. */
const indexOf = ({ folders, projects, cases }: ProjectPickModel) => {
  const known = new Set(folders.map((folder) => folder.id));
  const parentOf = new Map<string, string | null>();
  for (const folder of folders) {
    parentOf.set(
      folder.id,
      folder.parentId !== null && folder.parentId !== folder.id && known.has(folder.parentId) ? folder.parentId : null,
    );
  }
  const folderOf = new Map<string, string | null>();
  for (const project of projects) {
    folderOf.set(project.id, project.folderId !== null && known.has(project.folderId) ? project.folderId : null);
  }
  const casesOf = new Map<string, string[]>();
  const projectOf = new Map<string, string>();
  for (const record of cases) {
    projectOf.set(record.id, record.projectId);
    const list = casesOf.get(record.projectId);
    if (list === undefined) casesOf.set(record.projectId, [record.id]);
    else list.push(record.id);
  }
  return { known, parentOf, folderOf, casesOf, projectOf };
};

/** **Each box's state** from the ids picked. */
export const projectPicksOf = (model: ProjectPickModel, picked: ReadonlySet<string>): ProjectPicks => {
  const { folders, projects, cases } = model;
  const { parentOf, folderOf, casesOf } = indexOf(model);

  // Every folder at or under a picked one.
  const underPicked = new Set<string>();
  for (const folder of folders) {
    if (!picked.has(folder.id)) continue;
    for (const id of projectFolderSubtree(folders, folder.id)) underPicked.add(id);
  }
  const covered = new Set<string>();
  for (const project of projects) {
    const folderId = folderOf.get(project.id) ?? null;
    if (picked.has(project.id) || (folderId !== null && underPicked.has(folderId))) covered.add(project.id);
  }

  const caseIds = new Set<string>();
  for (const record of cases) {
    if (picked.has(record.id) || covered.has(record.projectId)) caseIds.add(record.id);
  }

  // Each Project's box, and the leaves it counts into its folders.
  const projectStates = new Map<string, ProjectPickState>();
  const own = new Map<string, { total: number; picked: number }>();
  for (const project of projects) {
    const ids = casesOf.get(project.id) ?? [];
    const pickedCases = ids.reduce((count, id) => (caseIds.has(id) ? count + 1 : count), 0);
    const checked = covered.has(project.id) || (ids.length > 0 && pickedCases === ids.length);
    projectStates.set(project.id, { checked, indeterminate: !checked && pickedCases > 0 });
    const folderId = folderOf.get(project.id) ?? null;
    if (folderId === null) continue;
    const sums = own.get(folderId) ?? { total: 0, picked: 0 };
    if (ids.length > 0) {
      sums.total += ids.length;
      sums.picked += pickedCases;
    } else {
      sums.total += 1;
      if (checked) sums.picked += 1;
    }
    own.set(folderId, sums);
  }

  // Each folder's leaves, rolled up from its sub-folders.
  const children = new Map<string, string[]>();
  for (const [id, parent] of parentOf) {
    if (parent === null) continue;
    children.set(parent, [...(children.get(parent) ?? []), id]);
  }
  const rolled = new Map<string, { total: number; picked: number }>();
  const roll = (id: string): { total: number; picked: number } => {
    const kept = rolled.get(id);
    if (kept !== undefined) return kept;
    // Set before recursing: a cycle the normaliser somehow missed stops here.
    rolled.set(id, { total: 0, picked: 0 });
    const mine = own.get(id) ?? { total: 0, picked: 0 };
    const sums = { ...mine };
    for (const child of children.get(id) ?? []) {
      const below = roll(child);
      sums.total += below.total;
      sums.picked += below.picked;
    }
    rolled.set(id, sums);
    return sums;
  };
  const folderStates = new Map<string, ProjectPickState>();
  for (const folder of folders) {
    const sums = roll(folder.id);
    const checked = underPicked.has(folder.id) || (sums.total > 0 && sums.picked === sums.total);
    folderStates.set(folder.id, { checked, indeterminate: !checked && sums.picked > 0 });
  }
  return { cases: caseIds, projects: projectStates, folders: folderStates };
};

/** A row's box, read off the picks. */
export const projectPickStateOf = (picks: ProjectPicks, target: ProjectPickTarget): ProjectPickState =>
  target.kind === "case"
    ? { checked: picks.cases.has(target.id), indeterminate: false }
    : ((target.kind === "project" ? picks.projects : picks.folders).get(target.id) ?? UNPICKED);

/** The ids a target stands for: itself and everything under it. */
const idsUnder = (model: ProjectPickModel, index: ReturnType<typeof indexOf>, target: ProjectPickTarget): string[] => {
  if (target.kind === "case") return [target.id];
  if (target.kind === "project") return [target.id, ...(index.casesOf.get(target.id) ?? [])];
  const subtree = projectFolderSubtree(model.folders, target.id);
  const projects = model.projects.filter((project) => {
    const folderId = index.folderOf.get(project.id) ?? null;
    return folderId !== null && subtree.has(folderId);
  });
  return [...subtree, ...projects.flatMap((project) => [project.id, ...(index.casesOf.get(project.id) ?? [])])];
};

/** The containers above a target: a Case's Project, then the folders up to the top. */
const idsAbove = (index: ReturnType<typeof indexOf>, target: ProjectPickTarget): string[] => {
  const above: string[] = [];
  let folderId: string | null;
  if (target.kind === "case") {
    const projectId = index.projectOf.get(target.id);
    if (projectId === undefined) return above;
    above.push(projectId);
    folderId = index.folderOf.get(projectId) ?? null;
  } else if (target.kind === "project") {
    folderId = index.folderOf.get(target.id) ?? null;
  } else {
    folderId = index.parentOf.get(target.id) ?? null;
  }
  const seen = new Set<string>();
  while (folderId !== null && !seen.has(folderId)) {
    seen.add(folderId);
    above.push(folderId);
    folderId = index.parentOf.get(folderId) ?? null;
  }
  return above;
};

/**
 * **Tick or untick some boxes** (`on`) — one row's, or select-all's. Ticked,
 * each target and everything under it join the picks. Unticked, what is
 * picked is first written out by id (a container's pick standing for
 * what is under it), then each target, everything under it and every
 * container above it leave.
 */
export const setProjectPicks = (
  picked: ReadonlySet<string>,
  model: ProjectPickModel,
  targets: readonly ProjectPickTarget[],
  on: boolean,
): Set<string> => {
  const index = indexOf(model);
  if (on) {
    const next = new Set(picked);
    for (const target of targets) for (const id of idsUnder(model, index, target)) next.add(id);
    return next;
  }
  const picks = projectPicksOf(model, picked);
  const next = new Set<string>(picks.cases);
  for (const [id, state] of picks.projects) if (state.checked) next.add(id);
  for (const [id, state] of picks.folders) if (state.checked) next.add(id);
  for (const target of targets) {
    for (const id of idsUnder(model, index, target)) next.delete(id);
    for (const id of idsAbove(index, target)) next.delete(id);
  }
  return next;
};

/** **One row's box clicked**: ticked when it was not checked, else unticked. */
export const toggleProjectPick = (
  picked: ReadonlySet<string>,
  model: ProjectPickModel,
  target: ProjectPickTarget,
): Set<string> => setProjectPicks(picked, model, [target], !projectPickStateOf(projectPicksOf(model, picked), target).checked);

/** What a delete of the picks takes, and how many of each go. */
export type ProjectPicksDeletion = {
  /** The checked folders with none checked above — each deleted with its whole subtree. */
  folderIds: string[];
  /** The checked Projects outside those folders — each deleted with its Cases. */
  projectIds: string[];
  /** The picked Cases outside those. */
  caseIds: string[];
  /** Every folder, Project and Case that goes. */
  counts: { folders: number; projects: number; cases: number };
  /** Every folder that goes — where the reader may be standing. */
  goneFolders: ReadonlySet<string>;
};

/** **What deleting the picks takes** — the fewest deletes, and everything that goes with them. */
export const projectPicksDeletion = (model: ProjectPickModel, picks: ProjectPicks): ProjectPicksDeletion => {
  const index = indexOf(model);
  const checked = (states: ReadonlyMap<string, ProjectPickState>, id: string) => states.get(id)?.checked === true;

  const folderIds: string[] = [];
  const goneFolders = new Set<string>();
  for (const folder of model.folders) {
    if (!checked(picks.folders, folder.id)) continue;
    if (idsAbove(index, { kind: "folder", id: folder.id }).some((id) => checked(picks.folders, id))) continue;
    folderIds.push(folder.id);
    for (const id of projectFolderSubtree(model.folders, folder.id)) goneFolders.add(id);
  }

  const projectIds: string[] = [];
  const goneProjects = new Set<string>();
  for (const project of model.projects) {
    const folderId = index.folderOf.get(project.id) ?? null;
    if (folderId !== null && goneFolders.has(folderId)) goneProjects.add(project.id);
    else if (checked(picks.projects, project.id)) {
      projectIds.push(project.id);
      goneProjects.add(project.id);
    }
  }

  const caseIds: string[] = [];
  let cases = 0;
  for (const record of model.cases) {
    if (goneProjects.has(record.projectId)) cases += 1;
    else if (picks.cases.has(record.id)) {
      caseIds.push(record.id);
      cases += 1;
    }
  }
  return {
    folderIds,
    projectIds,
    caseIds,
    counts: { folders: goneFolders.size, projects: goneProjects.size, cases },
    goneFolders,
  };
};
