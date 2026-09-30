import type { ReactNode } from "react";

import type { TreeNode } from "../../../design-system/patterns/trees";
import { gameFolderChildren, type GameFolder } from "../../../lib/savedGameFolders";

/**
 * The top-level row's node id — "everything", the `null` folder. A folder's
 * id is minted by `newRecordId`, which always starts with `g`, so it can
 * never be this.
 */
export const FOLDER_TREE_ROOT = "all";

/**
 * **A folder list as tree nodes** (CTA-110): each folder under its parent,
 * name-sorted at every level (`gameFolderChildren` — the one rule every
 * folder list follows), a folder with sub-folders a branch, one without a
 * leaf, all of them selectable. A parent that does not resolve reads as the
 * top level and a cycle is cut where it was entered, as every walk over the
 * model does — a half-broken store still shows every folder once.
 */
export const folderTreeNodes = (
  folders: readonly GameFolder[],
  { counts, icon }: { counts?: Readonly<Record<string, number>>; icon?: (open: boolean) => ReactNode } = {},
): TreeNode[] => {
  const seen = new Set<string>();
  const walk = (parentId: string | null): TreeNode[] =>
    gameFolderChildren(folders, parentId).flatMap((folder) => {
      if (seen.has(folder.id)) return [];
      seen.add(folder.id);
      const children = walk(folder.id);
      return [
        {
          id: folder.id,
          label: folder.name,
          dir: "auto" as const,
          selectable: true,
          icon: icon?.(false),
          secondary: counts?.[folder.id],
          ...(children.length > 0 && { children }),
        },
      ];
    });
  return walk(null);
};
