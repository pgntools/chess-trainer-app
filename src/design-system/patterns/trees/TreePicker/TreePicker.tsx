import { useState, type MouseEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";

import type { VisibleLabel } from "../../../components/a11y";
import { TreeView, ancestorsOf, type TreeNode } from "../TreeView";

export type TreePickerProps = {
  /** The nodes to pick from, as `TreeView` takes them. */
  nodes: readonly TreeNode[];
  /** The node on screen: its row is marked, and its branch chain opens with the picker. */
  activeId?: string;
  /** A node was picked; the picker closes. */
  onSelect: (node: TreeNode) => void;
  /** The button's words — "Open an article". */
  label: VisibleLabel;
  /** An icon before the button's words. */
  icon?: ReactNode;
  /** The tree's accessible name, as `TreeView` takes it. */
  treeLabel: string;
  /** How the tree is worked, as `TreeView` takes it — read with the tree, out of sight. */
  hint: VisibleLabel;
  /** The button; the tree is `<testId>-tree`, its rows `-tree-<id>`. */
  testId: string;
};

/**
 * **A tree hung from a button** — the `TreeView` pattern behind a labelled
 * button, for picking a node out of a tree (an "Open an article" on a
 * toolbar). The button opens the tree under itself, the chain to the node on
 * screen open with it, as the sidebar opens the route's chain; picking a
 * node hands it to the caller and closes; Escape and a click away close it,
 * the focus back on the button. Which branches the reader opens in the
 * meantime is the picker's own, seeded again the next time it opens.
 */
function TreePicker({ nodes, activeId, onSelect, label, icon, treeLabel, hint, testId }: TreePickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const openPicker = (event: MouseEvent<HTMLButtonElement>) => {
    setOpen(new Set(activeId === undefined ? [] : ancestorsOf(nodes, activeId)));
    setAnchor(event.currentTarget);
  };

  return (
    <>
      <Button
        size="small"
        startIcon={icon}
        aria-haspopup="true"
        aria-expanded={anchor !== null}
        onClick={openPicker}
        data-testid={testId}
      >
        {label}
      </Button>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ maxHeight: 360, overflowY: "auto", py: 1, minWidth: 280 }}>
          <TreeView
            nodes={nodes}
            open={open}
            onToggle={(id) =>
              setOpen((before) => {
                const next = new Set(before);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            activeId={activeId}
            onSelect={(node) => {
              setAnchor(null);
              onSelect(node);
            }}
            ariaLabel={treeLabel}
            hint={hint}
            testId={`${testId}-tree`}
          />
        </Box>
      </Popover>
    </>
  );
}

export default TreePicker;
