import FolderOutlined from "@mui/icons-material/FolderOutlined";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";

import type { LinkTarget } from "../../../design-system/components/link";
import type { TreeNode } from "../../../design-system/patterns/trees";
import type { SortDirection } from "../../../lib/libraryCollections";
import {
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
 * whole. A folder naming a missing parent reads as top level, and a cycle is
 * cut where it was entered, as every walk over the folder model does.
 */
export const analysesTreeNodes = ({ folders, rootId, rows, sort, currentId, shown, locked, linkOf, labels }: AnalysesTreeNodesInput): TreeNode[] => {
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

  /** The analyses filed directly in a folder (`""`: Unfiled), a page of them, and a row for the rest. */
  const filesIn = (key: string): TreeNode[] => {
    const ordered = sortedAnalysisRows(byFolder.get(key) ?? [], sort.column, sort.direction);
    const limit = Math.max(shown?.get(key) ?? ANALYSES_TREE_PAGE, ordered.findIndex((row) => row.id === currentId) + 1);
    const nodes = ordered.slice(0, limit).map(leaf);
    if (ordered.length > limit) nodes.push({ id: `${ANALYSES_TREE_MORE}${key}`, label: labels.showMore(ordered.length - limit) });
    return nodes;
  };

  const seen = new Set<string>();
  /** The folders under `parentId` as branches, and how many analyses they hold between them. */
  const walk = (parentId: string | null): { nodes: TreeNode[]; count: number } => {
    const nodes: TreeNode[] = [];
    let count = 0;
    for (const folder of [...gameFolderChildren(folders, parentId)].sort(compareAnalysisFolders(sort.column, sort.direction))) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      const inside = walk(folder.id);
      const own = byFolder.get(folder.id)?.length ?? 0;
      count += inside.count + own;
      nodes.push({
        id: folder.id,
        label: folder.name === "" ? labels.untitledFolder : folder.name,
        dir: "auto",
        icon: folderIcon,
        secondary: inside.count + own,
        children: [...inside.nodes, ...filesIn(folder.id)],
      });
    }
    return { nodes, count };
  };

  return [...walk(rootId).nodes, ...filesIn(rootId ?? "")];
};
