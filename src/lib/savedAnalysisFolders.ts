import type { SavedAnalysis } from "./savedAnalyses";
import {
  gameFolderChildren,
  gameFolderFrom,
  gameFolderPath,
  gameFolderSubtree,
  type GameFolder,
} from "./savedGameFolders";

/**
 * **The reader's saved-analysis folders** (CTA-73) — a nested tree, the saved
 * games' model ([`savedGameFolders.ts`](./savedGameFolders.ts)) and the saved
 * openings' before it: a folder is a name and a parent id, the analyses name
 * their folder by `SavedAnalysis.folderId`, `null` is Unfiled.
 *
 * The entity is **the same shape** as a game folder, so it is that type and
 * those reads — the children, the breadcrumb chain, the subtree, the
 * flattened picker list, the normaliser, cycles cut and dangling parents read
 * as the top level — rather than a third copy of them. What is this file's own
 * is what knows what is filed ({@link analysesInFolder}) and the picks model
 * that makes a folder and the records under it one selection
 * ({@link analysisPicksOf}, CTA-147). The
 * storage half is [`savedAnalysisFolderStore.ts`](./savedAnalysisFolderStore.ts),
 * under its own key, so a game folder and an analysis folder never mix.
 */

/** One folder in the reader's saved-analysis tree. Plain JSON. */
export type AnalysisFolder = GameFolder;

export const analysisFolderFrom = gameFolderFrom;
export const analysisFolderChildren = gameFolderChildren;
export const analysisFolderPath = gameFolderPath;
export const analysisFolderSubtree = gameFolderSubtree;

/**
 * The analyses behind a click — everything under the folder, directly and
 * not: a folder card stands for its whole subtree, so its count and its
 * download name the same set. In the caller's order.
 */
export const analysesInFolder = (
  analyses: readonly SavedAnalysis[],
  folders: readonly AnalysisFolder[],
  id: string,
): SavedAnalysis[] => {
  const subtree = gameFolderSubtree(folders, id);
  return analyses.filter(
    (analysis) => analysis.folderId !== null && subtree.has(analysis.folderId),
  );
};

/** How many {@link analysesInFolder} returns — a folder card's count. */
export const analysesUnderFolder = (
  analyses: readonly SavedAnalysis[],
  folders: readonly AnalysisFolder[],
  id: string,
): number => analysesInFolder(analyses, folders, id).length;

/**
 * The analyses filed **directly** in `folderId` (`null`: the top level) — what
 * the browser lists there. One naming a folder that is gone reads as Unfiled,
 * so a half-deleted store still shows every record somewhere.
 */
export const analysesHere = (
  analyses: readonly SavedAnalysis[],
  folders: readonly AnalysisFolder[],
  folderId: string | null,
): SavedAnalysis[] => {
  const known = new Set(folders.map((folder) => folder.id));
  return analyses.filter((analysis) => {
    const parent =
      analysis.folderId !== null && known.has(analysis.folderId) ? analysis.folderId : null;
    return parent === folderId;
  });
};

/*
  Picking folders and records alike (CTA-147). The picks are one set of ids:
  an analysis' own, and a folder's meaning its whole subtree — every analysis
  under a picked folder is picked with it, so the count, the download and the
  delete read the same set everywhere. A folder's checkbox state is derived:
  checked when it is picked itself (an empty folder only ever is) or every
  analysis under it is, indeterminate while some are.
*/

/** A folder's checkbox state, derived over its whole subtree. */
export type AnalysisFolderPickState = { checked: boolean; indeterminate: boolean };

/** What the picks stand for (CTA-147): every analysis they cover, and each folder's checkbox state. */
export type AnalysisPicks = {
  /** Every picked analysis — picked itself, or under a picked folder. */
  analyses: ReadonlySet<string>;
  /** Each folder's checkbox state. */
  folders: ReadonlyMap<string, AnalysisFolderPickState>;
};

export const analysisPicksOf = (
  analyses: readonly SavedAnalysis[],
  folders: readonly AnalysisFolder[],
  picked: ReadonlySet<string>,
): AnalysisPicks => {
  // Every folder under a picked one — an analysis there is picked with it.
  const underPicked = new Set<string>();
  for (const folder of folders) {
    if (!picked.has(folder.id)) continue;
    for (const id of gameFolderSubtree(folders, folder.id)) underPicked.add(id);
  }
  const isPicked = (analysis: SavedAnalysis) =>
    picked.has(analysis.id) || (analysis.folderId !== null && underPicked.has(analysis.folderId));

  // Each folder's own counts, rolled up its parents — O(folders + analyses), not a subtree walk per folder.
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const own = new Map<string, { total: number; picked: number }>();
  for (const folder of folders) own.set(folder.id, { total: 0, picked: 0 });
  for (const analysis of analyses) {
    if (analysis.folderId === null || !byId.has(analysis.folderId)) continue;
    const counts = own.get(analysis.folderId);
    if (counts === undefined) continue;
    counts.total += 1;
    if (isPicked(analysis)) counts.picked += 1;
  }
  const rolled = new Map<string, { total: number; picked: number }>();
  const rollDown = (id: string): { total: number; picked: number } => {
    const kept = rolled.get(id);
    if (kept !== undefined) return kept;
    // Set before recursing: a cycle the normaliser somehow missed stops here, it cannot loop.
    rolled.set(id, { total: 0, picked: 0 });
    const mine = own.get(id) ?? { total: 0, picked: 0 };
    let total = mine.total;
    let pickedCount = mine.picked;
    for (const child of folders) {
      if (child.parentId !== id) continue;
      const below = rollDown(child.id);
      total += below.total;
      pickedCount += below.picked;
    }
    const sums = { total, picked: pickedCount };
    rolled.set(id, sums);
    return sums;
  };

  const analysisIds = new Set<string>();
  for (const analysis of analyses) if (isPicked(analysis)) analysisIds.add(analysis.id);
  const states = new Map<string, AnalysisFolderPickState>();
  for (const folder of folders) {
    const sums = rollDown(folder.id);
    // Checked: picked itself, or everything under it picked — never on nothing (an empty folder only ever by its own box).
    const checked = picked.has(folder.id) || (sums.total > 0 && sums.picked === sums.total);
    states.set(folder.id, { checked, indeterminate: !checked && sums.picked > 0 });
  }
  return { analyses: analysisIds, folders: states };
};

/** Every picked folder at and above `parentId` loses its pick — a folder may not stay checked with what is under it partly picked. */
const demoteFoldersAbove = (next: Set<string>, parentId: string | null, folders: readonly AnalysisFolder[]): void => {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const seen = new Set<string>();
  let id = parentId;
  while (id !== null && !seen.has(id)) {
    seen.add(id);
    next.delete(id);
    id = byId.get(id)?.parentId ?? null;
  }
};

/**
 * Ticking a folder's box (CTA-147): its id and every analysis id under it
 * join the picks. Unticking (`checked`) takes it, its sub-folders and
 * everything under them back out — and demotes the picked folders above, so
 * none stays checked over a subtree it no longer covers whole.
 */
export const toggleAnalysisFolderPick = (
  picked: ReadonlySet<string>,
  folder: AnalysisFolder,
  analyses: readonly SavedAnalysis[],
  folders: readonly AnalysisFolder[],
  checked: boolean,
): Set<string> => {
  const next = new Set(picked);
  if (checked) {
    for (const id of gameFolderSubtree(folders, folder.id)) next.delete(id);
    for (const analysis of analysesInFolder(analyses, folders, folder.id)) next.delete(analysis.id);
    demoteFoldersAbove(next, folder.parentId, folders);
  } else {
    next.add(folder.id);
    for (const analysis of analysesInFolder(analyses, folders, folder.id)) next.add(analysis.id);
  }
  return next;
};

/**
 * Unticking an analysis — idempotent (a `picks.onChange` set that already
 * lacks it gets the same demotion): the picked folders above it lose their
 * pick — no folder may stay checked, and so be deleted whole, with its
 * contents only partly picked (CTA-147).
 */
export const unpickAnalysis = (
  picked: ReadonlySet<string>,
  analysis: Pick<SavedAnalysis, "id" | "folderId">,
  folders: readonly AnalysisFolder[],
): Set<string> => {
  const next = new Set(picked);
  next.delete(analysis.id);
  demoteFoldersAbove(next, analysis.folderId, folders);
  return next;
};

/** Ticking an analysis' box — ticked or not. */
export const toggleAnalysisPick = (
  picked: ReadonlySet<string>,
  analysis: Pick<SavedAnalysis, "id" | "folderId">,
  folders: readonly AnalysisFolder[],
): Set<string> => {
  if (picked.has(analysis.id)) return unpickAnalysis(picked, analysis, folders);
  const next = new Set(picked);
  next.add(analysis.id);
  return next;
};
