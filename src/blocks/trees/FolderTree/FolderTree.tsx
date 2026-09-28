import { useMemo } from "react";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import InventoryOutlined from "@mui/icons-material/Inventory2Outlined";

import { TreeView, type TreeNode } from "../../../design-system/patterns/trees";
import type { GameFolder } from "../../../lib/savedGameFolders";
import { FOLDER_TREE_ROOT, folderTreeNodes } from "./folderTreeNodes";

/** Every word the block shows — the screen's `t(…)`s, or a fixture's. */
export type FolderTreeLabels = {
  /** The tree's accessible name ("Folders"). */
  tree: string;
  /** How the tree is worked, read with it by a screen reader (CTA-112) — `hints.tree`. */
  hint: string;
  /** The top-level row, the `null` folder ("All analyses"). Absent, there is no such row. */
  root?: string;
  /** A folder's chevron: "Open ‹name›" / "Close ‹name›". */
  toggle: (name: string, open: boolean) => string;
};

export type FolderTreeProps = {
  /** The reader's folders — the app's one nested-folder model, as a store holds them. */
  folders: readonly GameFolder[];
  /** A figure beside each folder — what is filed in it — by folder id; `root` for the top-level row. */
  counts?: Readonly<Record<string, number>>;
  /** The folder on screen; `null` is the top-level row. */
  selectedId: string | null | undefined;
  onSelect: (folderId: string | null) => void;
  /** The open folders' ids. Controlled: the screen decides what opens with the folder on screen. */
  open: ReadonlySet<string>;
  onToggle: (folderId: string) => void;
  /** Build them once (or memoise them): the nodes are rebuilt when they change. */
  labels: FolderTreeLabels;
  /** The tree; a folder's row is `-<folder id>`, the top-level row `-all`. */
  testId: string;
};

const folderIcon = () => <FolderOutlined fontSize="small" />;

/**
 * **The reader's folders as a tree** (CTA-110) — the second tree view the
 * app has after the sidebar's, and the first block of the Trees family: the
 * `GameFolder` model (`lib/savedGameFolders.ts`, the saved analyses' and the
 * Library's folders) drawn by the `TreeView` pattern. Every folder is a
 * destination — its row selects it, its chevron opens it — with an optional
 * count, and an optional top-level row for "everything".
 *
 * Presentational: the folders, the counts, the selection and the open
 * branches arrive as props; it reads no store and no route.
 */
function FolderTree({ folders, counts, selectedId, onSelect, open, onToggle, labels, testId }: FolderTreeProps) {
  const nodes = useMemo<TreeNode[]>(() => {
    const tree = folderTreeNodes(folders, { counts, icon: folderIcon });
    if (labels.root === undefined) return tree;
    return [
      { id: FOLDER_TREE_ROOT, label: labels.root, icon: <InventoryOutlined fontSize="small" />, secondary: counts?.[FOLDER_TREE_ROOT] },
      ...tree,
    ];
  }, [folders, counts, labels.root]);

  return (
    <TreeView
      nodes={nodes}
      open={open}
      onToggle={onToggle}
      activeId={selectedId === null ? FOLDER_TREE_ROOT : selectedId}
      onSelect={(node) => onSelect(node.id === FOLDER_TREE_ROOT ? null : node.id)}
      toggleLabel={(node, isOpen) => labels.toggle(String(node.label), isOpen)}
      ariaLabel={labels.tree}
      hint={labels.hint}
      testId={testId}
    />
  );
}

export default FolderTree;
