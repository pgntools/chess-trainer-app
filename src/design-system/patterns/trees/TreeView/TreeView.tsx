import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";

import { linkProps, type LinkTarget } from "../../../components/link";

/** One node of a {@link TreeView}: a leaf, or a branch with `children`. */
export type TreeNode = {
  /** Unique in the tree: the node's key, its open state and its test id's tail. */
  id: string;
  label: ReactNode;
  /** An icon before the label, `fontSize="small"`. */
  icon?: ReactNode;
  /** A muted figure at the row's end — a count. */
  secondary?: ReactNode;
  /** Where the node goes: a router link or an `href`. */
  link?: LinkTarget;
  /** A branch's nodes. An empty array is still a branch — an empty folder. */
  children?: readonly TreeNode[];
  /**
   * A branch that is also a destination (a folder whose contents can be
   * shown): its row selects or links, and its chevron is a button of its
   * own. Implied by `link`. A leaf is always selectable.
   */
  selectable?: boolean;
  /** `auto` for a reader's words (a folder's name), so a Hebrew or Latin name reads its own way. */
  dir?: "auto" | "ltr";
};

export type TreeViewProps = {
  nodes: readonly TreeNode[];
  /** The open branches' ids. Controlled: the caller decides what opens with the route, what stays open. */
  open: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** The node on screen: marked selected, `aria-current="page"`. */
  activeId?: string;
  /** A selectable node without a `link` was clicked. */
  onSelect?: (node: TreeNode) => void;
  /** The separate chevron's accessible name, for a selectable branch ("Open Openings"). */
  toggleLabel?: (node: TreeNode, open: boolean) => string;
  /** The list's accessible name. */
  ariaLabel?: string;
  /**
   * The root list. The parts: `-<id>` (a node's row), `-<id>-toggle` (a
   * selectable branch's chevron), `-<id>-group` (a branch's open children).
   */
  testId: string;
};

/** How far a row is set in: two units, and two more per level — the sidebar's rule. */
const indentOf = (depth: number) => 2 + depth * 2;

type RowProps = Omit<TreeViewProps, "nodes" | "ariaLabel"> & { node: TreeNode; depth: number };

function TreeRow({ node, depth, open, onToggle, activeId, onSelect, toggleLabel, testId }: RowProps) {
  const branch = node.children !== undefined;
  const isOpen = branch && open.has(node.id);
  const selectable = !branch || node.selectable === true || node.link !== undefined;
  const active = activeId === node.id;
  const chevron = isOpen ? (
    <ExpandLessRounded fontSize="small" sx={{ color: "text.secondary" }} />
  ) : (
    <ExpandMoreRounded fontSize="small" sx={{ color: "text.secondary" }} />
  );

  /*
    A branch that is only a folder is a toggle, not a destination: its row
    carries `aria-expanded` and stays out of the link count. A selectable
    branch is a destination with a chevron button of its own.
  */
  const rowAction = selectable
    ? node.link !== undefined
      ? linkProps(node.link)
      : { onClick: () => onSelect?.(node) }
    : { onClick: () => onToggle(node.id), "aria-expanded": isOpen };

  return (
    <ListItem disablePadding sx={{ mb: 0.25, display: "block" }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <ListItemButton
          {...rowAction}
          selected={active}
          aria-current={active ? "page" : undefined}
          data-testid={`${testId}-${node.id}`}
          sx={{ gap: 1, paddingInlineStart: indentOf(depth), flex: 1, minWidth: 0 }}
        >
          {node.icon !== undefined && (
            <ListItemIcon sx={{ minWidth: 0, color: active ? "primary.main" : "text.secondary" }}>{node.icon}</ListItemIcon>
          )}
          <ListItemText
            primary={node.label}
            slotProps={{
              primary: {
                dir: node.dir,
                noWrap: true,
                sx: {
                  fontWeight: branch || active ? 700 : 500,
                  color: branch || active ? "text.primary" : "text.secondary",
                },
              },
            }}
          />
          {node.secondary !== undefined && (
            <Box component="span" sx={{ typography: "caption", color: "text.secondary", flexShrink: 0 }}>
              {node.secondary}
            </Box>
          )}
          {branch && !selectable && chevron}
        </ListItemButton>
        {branch && selectable && (
          <IconButton
            size="small"
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={toggleLabel?.(node, isOpen)}
            data-testid={`${testId}-${node.id}-toggle`}
          >
            {chevron}
          </IconButton>
        )}
      </Box>
      {branch && (
        <Collapse in={isOpen} unmountOnExit>
          <List disablePadding dense data-testid={`${testId}-${node.id}-group`}>
            {(node.children ?? []).map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                open={open}
                onToggle={onToggle}
                activeId={activeId}
                onSelect={onSelect}
                toggleLabel={toggleLabel}
                testId={testId}
              />
            ))}
          </List>
        </Collapse>
      )}
    </ListItem>
  );
}

/**
 * **A collapsible tree** (CTA-110) — the look of the app's sidebar, made one
 * pattern: branches that open in place (a chevron, `aria-expanded`), leaves
 * that link or select, the node on screen marked, each level set in by the
 * inline start so the tree mirrors under RTL. A branch can also be a
 * destination (`selectable`, a folder whose contents are shown) — then its
 * chevron is a button of its own.
 *
 * Every piece of state is the caller's: which branches are open, which node
 * is on screen. It knows no route and no record — the gallery's menu builds
 * its nodes from the tiers, a folder tree block from a store's folders.
 */
function TreeView({ nodes, ariaLabel, testId, ...rest }: TreeViewProps) {
  return (
    <List dense disablePadding aria-label={ariaLabel} data-testid={testId}>
      {nodes.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} testId={testId} {...rest} />
      ))}
    </List>
  );
}

export default TreeView;
