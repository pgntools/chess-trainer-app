import FolderOutlined from "@mui/icons-material/FolderOutlined";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";

import type { LinkTarget } from "../../../design-system/components/link";
import type { TreeNode } from "../../../design-system/patterns/trees";
import type { SortDirection } from "../../../lib/libraryCollections";
import {
  analysisMatcherOf,
  compareAnalysisFolders,
  sortedAnalysisRows,
  type SavedAnalysisColumn,
  type SavedAnalysisRow,
} from "../../../lib/savedAnalysisRows";
import { gameFolderChildren, type GameFolder } from "../../../lib/savedGameFolders";

/** The id prefix of a "show more" row — `more:<folder id>`, `more:` for the top level. Never an analysis' or a folder's. */
export const ANALYSES_TREE_MORE = "more:";

/** How many of a folder's analyses its branch lists before "show more". */
export const ANALYSES_TREE_PAGE = 100;

/** The words the nodes carry — the screen's `t(…)`s. */
export type AnalysesTreeNodeLabels = {
  /** An analysis with no name. */
  untitled: string;
  /** A folder with no name. */
  untitledFolder: string;
  /** The row that lists more of a folder's analyses — "Show 40 more". */
  showMore: (remaining: number) => string;
};

export type AnalysesTreeNodesInput = {
  folders: readonly GameFolder[];
  /** The tree's root: the folder the reader is inside (`null`: the top level, Unfiled analyses and all). Its contents are the top rows; nothing outside it is listed. */
  rootId: string | null;
  rows: readonly SavedAnalysisRow[];
  /** The order of every level — the saved analyses table's: its column and direction. */
  sort: { column: SavedAnalysisColumn; direction: SortDirection };
  /**
   * The words the tree is narrowed by (the list's filter: names, notes, players, event, opening…): the analyses holding every
   * word and the folders whose name does, with all that is in them. Empty: everything.
   */
  text: string;
  /** The analysis on the board: always listed, whatever the page says. */
  currentId: string;
  /** How many analyses each folder lists, by folder id (`""`: the top level); absent, a page. */
  shown?: ReadonlyMap<string, number>;
  /** Another analysis cannot be opened now: every leaf but the current one is disabled and links nowhere. */
  locked: boolean;
  linkOf: (row: SavedAnalysisRow) => LinkTarget;
  labels: AnalysesTreeNodeLabels;
};

const folderIcon = <FolderOutlined fontSize="small" />;
const analysisIcon = <GridViewOutlined fontSize="small" />;

/**
 * **The saved analyses as tree nodes** (CTA-145) — the lobby's tree, for the
 * board's side, **rooted at the folder the reader is inside**: that folder's
 * contents are the top rows, and what is filed outside it is not listed. Each
 * folder a branch under its parent (ordered as the table
 * orders folders: by name, or by when they changed under Updated), the
 * analyses filed in it as its leaves after its sub-folders, in the table's
 * order (`sortedAnalysisRows`), the Unfiled ones — when the root is the top level — after the top-level folders. A
 * branch carries the count of everything under it. A folder lists a page of
 * its analyses and a "show more" row for the rest — or all up to the current
 * one, which is always in the tree, so a folder of thousands is never mounted
 * whole. **The words** narrow it as they do the list's table: the analyses
 * holding every one stay, a folder whose name does stays with all that is in
 * it, and a folder with neither is left out. A folder naming a missing parent reads as top level, and a cycle is
 * cut where it was entered, as every walk over the folder model does.
 */
export const analysesTreeNodes = ({ folders, rootId, rows, text, sort, currentId, shown, locked, linkOf, labels }: AnalysesTreeNodesInput): TreeNode[] => {
  const match = analysisMatcherOf(text);
  const known = new Set(folders.map((folder) => folder.id));
  const byFolder = new Map<string, SavedAnalysisRow[]>();
  for (const row of rows) {
    const key = row.folderId !== null && known.has(row.folderId) ? row.folderId : "";
    const list = byFolder.get(key);
    if (list === undefined) byFolder.set(key, [row]);
    else list.push(row);
  }

  const leaf = (row: SavedAnalysisRow): TreeNode => {
    const disabled = locked && row.id !== currentId;
    return {
      id: row.id,
      label: row.name === "" ? labels.untitled : row.name,
      dir: "auto",
      icon: analysisIcon,
      ...(disabled ? { disabled: true } : { link: linkOf(row) }),
    };
  };

  /**
   * The analyses filed directly in a folder (`""`: Unfiled) that the words keep — all of them
   * where the folder's name did — a page of them, and a row for the rest.
   */
  const filesIn = (key: string, all: boolean): TreeNode[] => {
    const here = byFolder.get(key) ?? [];
    const kept = match === undefined || all ? here : here.filter(match.item);
    const ordered = sortedAnalysisRows(kept, sort.column, sort.direction);
    const limit = Math.max(shown?.get(key) ?? ANALYSES_TREE_PAGE, ordered.findIndex((row) => row.id === currentId) + 1);
    const nodes = ordered.slice(0, limit).map(leaf);
    if (ordered.length > limit) nodes.push({ id: `${ANALYSES_TREE_MORE}${key}`, label: labels.showMore(ordered.length - limit) });
    return nodes;
  };

  const seen = new Set<string>();
  /** The folders under `parentId` that the words keep, as branches, and how many analyses they hold between them. `all`: a folder above matched by name. */
  const walk = (parentId: string | null, all: boolean): { nodes: TreeNode[]; count: number } => {
    const nodes: TreeNode[] = [];
    let count = 0;
    for (const folder of [...gameFolderChildren(folders, parentId)].sort(compareAnalysisFolders(sort.column, sort.direction))) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      const everything = all || match === undefined || match.folder(folder);
      const inside = walk(folder.id, everything);
      const files = filesIn(folder.id, everything);
      const own = byFolder.get(folder.id)?.filter((row) => everything || match?.item(row) === true).length ?? 0;
      // A folder the words do not reach, and nothing inside it they do, is not listed.
      if (!everything && inside.nodes.length === 0 && own === 0) continue;
      count += inside.count + own;
      nodes.push({
        id: folder.id,
        label: folder.name === "" ? labels.untitledFolder : folder.name,
        dir: "auto",
        icon: folderIcon,
        secondary: inside.count + own,
        children: [...inside.nodes, ...files],
      });
    }
    return { nodes, count };
  };

  return [...walk(rootId, false).nodes, ...filesIn(rootId ?? "", false)];
};
