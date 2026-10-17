import type { FolderTreeRow } from "./folderTreeRows";
import type { CollectionSummary } from "./libraryCollections";
import { gameFolderSubtree, type GameFolder } from "./savedGameFolders";

/**
 * **The Library's picks in its lobby** (CTA-235) — Analysis V2's model
 * (`lib/analysisProjectPicks.ts`, CTA-191) over the Library's tree: the
 * reader's folders hold collections, and **one set of ids** picks either.
 *
 * - **A folder's id stands for everything under it**: its sub-folders and
 *   the collections filed in any of them. Ticking one adds its id and every
 *   id under it.
 * - **A box's state is derived** ({@link libraryPicksOf}): a collection is
 *   picked when its id is, or a folder's above it; a folder checked when it
 *   is picked so, or it holds collections and all are picked, partly ticked
 *   while some are (an empty folder only ever by its own box or one above).
 * - **Unticking takes a thing, all under it and every folder above it** out —
 *   what was picked through those folders stays picked, written out by id —
 *   so no folder stays checked, and so deleted whole, over what is only
 *   partly picked.
 * - **The picked collections keep the order they were ticked in** — the
 *   merge's order — a folder's in the order the model lists them (the
 *   table's), one filed later under a picked folder last.
 * - **A delete** ({@link libraryPicksDeletion}) takes every checked folder
 *   with its sub-folders and the uploads under them, and every picked
 *   upload; a built-in collection is never deleted, only counted.
 *
 * **Built-in is not a folder here**: it is not a record, has no box, and its
 * shipped collections — whose `folderId` names it — are read as the top
 * level, each picked by its own box. Every id is a record id or a shipped
 * slug, so a folder's and a collection's never meet. Pure.
 */

/** A box's state: checked, or partly ticked from what is under it. */
export type LibraryPickState = { checked: boolean; indeterminate: boolean };

/** A collection as the picks read it — the summary's own fields. */
export type LibraryPickCollection = Pick<CollectionSummary, "id" | "name" | "source" | "count"> & { folderId: string | null };

/** What the picks are read against: the reader's folders, and every collection in the table's order. */
export type LibraryPickModel = {
  folders: readonly GameFolder[];
  collections: readonly LibraryPickCollection[];
};

/** What the picks stand for: every picked collection, in the order picked, and each folder's box. */
export type LibraryPicks = {
  collections: ReadonlySet<string>;
  folders: ReadonlyMap<string, LibraryPickState>;
};

/** One row's box — what a tick or select-all is about. */
export type LibraryPickTarget = { kind: "folder" | "collection"; id: string };

const UNPICKED: LibraryPickState = { checked: false, indeterminate: false };

/** What a tree row's box is about (`folderTreeRows`' rows) — `undefined` for Built-in's, which has none. */
export const libraryPickTargetOf = (
  row: FolderTreeRow<{ id: string }>,
  builtInFolderId: string,
): LibraryPickTarget | undefined =>
  row.kind === "item"
    ? { kind: "collection", id: row.item.id }
    : row.folder.id === builtInFolderId
      ? undefined
      : { kind: "folder", id: row.folder.id };

/**
 * **What select-all covers**: the leaves of the tree walked with every folder
 * open and the words applied — each collection, and each reader's folder
 * with nothing shown under it — so a folder is ticked through what the words
 * keep in it, never more (Analysis V2's rule, CTA-191).
 */
export const librarySelectAllTargets = (
  rows: readonly FolderTreeRow<{ id: string }>[],
  builtInFolderId: string,
): LibraryPickTarget[] =>
  rows.flatMap((row, index) => {
    const next = rows[index + 1];
    const target = libraryPickTargetOf(row, builtInFolderId);
    return target === undefined || (row.kind === "folder" && next !== undefined && next.depth > row.depth) ? [] : [target];
  });

/** The model's indexes: a folder's parent and a collection's folder (one not there read as the top level), each folder's collections. */
const indexOf = ({ folders, collections }: LibraryPickModel) => {
  const known = new Set(folders.map((folder) => folder.id));
  const parentOf = new Map<string, string | null>();
  for (const folder of folders) {
    parentOf.set(
      folder.id,
      folder.parentId !== null && folder.parentId !== folder.id && known.has(folder.parentId) ? folder.parentId : null,
    );
  }
  const folderOf = new Map<string, string | null>();
  const collectionsIn = new Map<string, string[]>();
  for (const collection of collections) {
    const folderId = collection.folderId !== null && known.has(collection.folderId) ? collection.folderId : null;
    folderOf.set(collection.id, folderId);
    if (folderId === null) continue;
    const list = collectionsIn.get(folderId);
    if (list === undefined) collectionsIn.set(folderId, [collection.id]);
    else list.push(collection.id);
  }
  return { known, parentOf, folderOf, collectionsIn };
};

/** **Each box's state** from the ids picked. */
export const libraryPicksOf = (model: LibraryPickModel, picked: ReadonlySet<string>): LibraryPicks => {
  const { folders, collections } = model;
  const { known, parentOf, folderOf, collectionsIn } = indexOf(model);

  // Every folder at or under a picked one.
  const underPicked = new Set<string>();
  for (const id of picked) {
    if (!known.has(id)) continue;
    for (const under of gameFolderSubtree(folders, id)) underPicked.add(under);
  }
  const covered = (id: string) => {
    const folderId = folderOf.get(id) ?? null;
    return picked.has(id) || (folderId !== null && underPicked.has(folderId));
  };

  // The order ticked first (the set's), then the rest covered in the model's.
  const pickedCollections = new Set<string>();
  for (const id of picked) if (folderOf.has(id) && covered(id)) pickedCollections.add(id);
  for (const collection of collections) if (covered(collection.id)) pickedCollections.add(collection.id);

  // Each folder's collections, rolled up from its sub-folders.
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
    const own = collectionsIn.get(id) ?? [];
    const sums = { total: own.length, picked: own.filter((each) => pickedCollections.has(each)).length };
    for (const child of children.get(id) ?? []) {
      const below = roll(child);
      sums.total += below.total;
      sums.picked += below.picked;
    }
    rolled.set(id, sums);
    return sums;
  };
  const folderStates = new Map<string, LibraryPickState>();
  for (const folder of folders) {
    const sums = roll(folder.id);
    const checked = underPicked.has(folder.id) || (sums.total > 0 && sums.picked === sums.total);
    folderStates.set(folder.id, { checked, indeterminate: !checked && sums.picked > 0 });
  }
  return { collections: pickedCollections, folders: folderStates };
};

/** A row's box, read off the picks. */
export const libraryPickStateOf = (picks: LibraryPicks, target: LibraryPickTarget): LibraryPickState =>
  target.kind === "collection"
    ? { checked: picks.collections.has(target.id), indeterminate: false }
    : (picks.folders.get(target.id) ?? UNPICKED);

/** Select-all's box over its targets: checked when every one is, partly while any is. */
export const librarySelectAllStateOf = (picks: LibraryPicks, targets: readonly LibraryPickTarget[]): LibraryPickState => {
  const states = targets.map((target) => libraryPickStateOf(picks, target));
  const checked = states.length > 0 && states.every((state) => state.checked);
  return { checked, indeterminate: !checked && states.some((state) => state.checked || state.indeterminate) };
};

/** The ids a target stands for: itself and everything under it, a folder's collections in the model's order. */
const idsUnder = (model: LibraryPickModel, index: ReturnType<typeof indexOf>, target: LibraryPickTarget): string[] => {
  if (target.kind === "collection") return [target.id];
  if (!index.known.has(target.id)) return [];
  const subtree = gameFolderSubtree(model.folders, target.id);
  const inside = model.collections.filter((collection) => {
    const folderId = index.folderOf.get(collection.id) ?? null;
    return folderId !== null && subtree.has(folderId);
  });
  return [...subtree, ...inside.map((collection) => collection.id)];
};

/** The folders above a target, up to the top. */
const idsAbove = (index: ReturnType<typeof indexOf>, target: LibraryPickTarget): string[] => {
  const above: string[] = [];
  let folderId = (target.kind === "collection" ? index.folderOf : index.parentOf).get(target.id) ?? null;
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
 * picked is first written out by id (a folder's pick standing for what is
 * under it), then each target, everything under it and every folder above
 * it leave.
 */
export const setLibraryPicks = (
  picked: ReadonlySet<string>,
  model: LibraryPickModel,
  targets: readonly LibraryPickTarget[],
  on: boolean,
): Set<string> => {
  const index = indexOf(model);
  if (on) {
    const next = new Set(picked);
    for (const target of targets) for (const id of idsUnder(model, index, target)) next.add(id);
    return next;
  }
  const picks = libraryPicksOf(model, picked);
  const next = new Set<string>(picks.collections);
  for (const [id, state] of picks.folders) if (state.checked) next.add(id);
  for (const target of targets) {
    for (const id of idsUnder(model, index, target)) next.delete(id);
    for (const id of idsAbove(index, target)) next.delete(id);
  }
  return next;
};

/** **One row's box clicked**: ticked when it was not checked, else unticked. */
export const toggleLibraryPick = (
  picked: ReadonlySet<string>,
  model: LibraryPickModel,
  target: LibraryPickTarget,
): Set<string> => setLibraryPicks(picked, model, [target], !libraryPickStateOf(libraryPicksOf(model, picked), target).checked);

/** What a delete of the picks takes, and what it keeps. */
export type LibraryPicksDeletion = {
  /** The checked folders with none checked above — each deleted with its whole subtree. */
  folderIds: string[];
  /** Every folder that goes. */
  goneFolders: ReadonlySet<string>;
  /** Every upload that goes: the picked ones — those under a checked folder among them — in the order picked. */
  uploads: LibraryPickCollection[];
  /** The built-in collections picked: read-only, they stay. */
  builtInKept: number;
  /** How many folders, collections and games go. */
  counts: { folders: number; collections: number; games: number };
};

/** **What deleting the picks takes** — the fewest folder deletes, and every upload that goes. */
export const libraryPicksDeletion = (model: LibraryPickModel, picks: LibraryPicks): LibraryPicksDeletion => {
  const index = indexOf(model);
  const checked = (id: string) => picks.folders.get(id)?.checked === true;

  const folderIds: string[] = [];
  const goneFolders = new Set<string>();
  for (const folder of model.folders) {
    if (!checked(folder.id)) continue;
    if (idsAbove(index, { kind: "folder", id: folder.id }).some(checked)) continue;
    folderIds.push(folder.id);
    for (const id of gameFolderSubtree(model.folders, folder.id)) goneFolders.add(id);
  }

  const byId = new Map(model.collections.map((collection) => [collection.id, collection]));
  const uploads: LibraryPickCollection[] = [];
  let builtInKept = 0;
  for (const id of picks.collections) {
    const collection = byId.get(id);
    if (collection === undefined) continue;
    if (collection.source === "uploaded") uploads.push(collection);
    else builtInKept += 1;
  }
  return {
    folderIds,
    goneFolders,
    uploads,
    builtInKept,
    counts: {
      folders: goneFolders.size,
      collections: uploads.length,
      games: uploads.reduce((sum, collection) => sum + collection.count, 0),
    },
  };
};
