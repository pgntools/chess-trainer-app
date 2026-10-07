import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useTheme } from "@mui/material/styles";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";

import { visuallyHidden, type VisibleLabel } from "../../../components/a11y";
import { linkProps, type LinkTarget } from "../../../components/link";
import { visibleNodes, type VisibleNode } from "./treeNodes";

/** One node of a {@link TreeView}: a leaf, or a branch with `children`. */
export type TreeNode = {
  /** Unique in the tree: the node's key, its open state and its test id's tail. */
  id: string;
  label: VisibleLabel;
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
  /**
   * The node cannot be followed or selected now (a record that must not be
   * left over unsaved work): its row stays in the tree and the tab order,
   * `aria-disabled`, and does nothing. A branch still opens.
   */
  disabled?: boolean;
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
  /**
   * The words on a selectable branch's chevron, as its tooltip ("Open
   * Openings"). The chevron is for the pointer; the keyboard opens and closes
   * the branch with the arrow keys.
   */
  toggleLabel?: (node: TreeNode, open: boolean) => string;
  /** The tree's accessible name ("Folders") — required (CTA-111). */
  ariaLabel: string;
  /**
   * How the tree is worked — "Arrow keys to move, right and left to open and
   * close, Enter to open" — read with it by a screen reader (its
   * `aria-describedby`), not shown. Required (CTA-112): a tree's keys are
   * not a web page's, and nothing on screen says what they are.
   */
  hint: VisibleLabel;
  /**
   * Let a long label wrap onto more lines instead of ending in an ellipsis —
   * for names that are the reader's own words and must be read whole.
   */
  wrapLabels?: boolean;
  /**
   * The root list. The parts: `-<id>` (a node's row), `-<id>-toggle` (a
   * selectable branch's chevron), `-<id>-group` (a branch's open children).
   */
  testId: string;
};

/** How far a row is set in: two units, and two more per level — the sidebar's rule. */
const indentOf = (depth: number) => 2 + depth * 2;

/** What every row needs to know of the tree around it — the keyboard's state and the row elements. */
type RowContext = Omit<TreeViewProps, "nodes" | "ariaLabel" | "hint"> & {
  /** The one row the Tab key lands on (the roving tab stop). */
  tabStop: string | undefined;
  onFocusRow: (id: string) => void;
  register: (id: string, element: HTMLElement | null) => void;
  groupIdOf: (id: string) => string;
};

type RowProps = RowContext & { node: TreeNode; depth: number };

function TreeRow({ node, depth, ...context }: RowProps) {
  const { open, onToggle, activeId, onSelect, toggleLabel, wrapLabels, testId, tabStop, onFocusRow, register, groupIdOf } = context;
  const branch = node.children !== undefined;
  const isOpen = branch && open.has(node.id);
  const selectable = !branch || node.selectable === true || node.link !== undefined;
  const active = activeId === node.id;
  const groupId = groupIdOf(node.id);
  const chevron = isOpen ? (
    <ExpandLessRounded fontSize="small" sx={{ color: "text.secondary" }} />
  ) : (
    <ExpandMoreRounded fontSize="small" sx={{ color: "text.secondary" }} />
  );

  /*
    A branch that is only a folder is a toggle, not a destination: its row
    opens and closes it, and stays out of the link count. A selectable branch
    is a destination with a chevron of its own.
  */
  const disabled = node.disabled === true && !branch;
  const rowAction = disabled
    ? {}
    : selectable
    ? node.link !== undefined
      ? linkProps(node.link)
      : { onClick: () => onSelect?.(node) }
    : { onClick: () => onToggle(node.id) };

  return (
    <ListItem role="none" disablePadding sx={{ mb: 0.25, display: "block" }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <ListItemButton
          {...rowAction}
          ref={(element: HTMLElement | null) => register(node.id, element)}
          role="treeitem"
          aria-level={depth + 1}
          aria-expanded={branch ? isOpen : undefined}
          aria-owns={isOpen ? groupId : undefined}
          aria-current={active ? "page" : undefined}
          aria-disabled={disabled || undefined}
          tabIndex={tabStop === node.id ? 0 : -1}
          onFocus={() => onFocusRow(node.id)}
          selected={active}
          data-testid={`${testId}-${node.id}`}
          sx={{
            gap: 1,
            paddingInlineStart: indentOf(depth),
            flex: 1,
            minWidth: 0,
            ...(disabled ? { opacity: 0.6, cursor: "default" } : {}),
          }}
        >
          {node.icon !== undefined && (
            <ListItemIcon aria-hidden sx={{ minWidth: 0, color: active ? "primary.main" : "text.secondary" }}>
              {node.icon}
            </ListItemIcon>
          )}
          <ListItemText
            primary={node.label}
            slotProps={{
              primary: {
                dir: node.dir,
                noWrap: wrapLabels !== true,
                sx: {
                  ...(wrapLabels === true ? { overflowWrap: "anywhere" } : {}),
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
          {branch && !selectable && <Box sx={{ display: "flex" }} aria-hidden>{chevron}</Box>}
        </ListItemButton>
        {branch && selectable && (
          // For the pointer only: the keyboard opens the branch from its row
          // (→ / ←), so the chevron is no tab stop and no second name.
          <IconButton
            size="small"
            tabIndex={-1}
            aria-hidden
            title={toggleLabel?.(node, isOpen)}
            onClick={() => onToggle(node.id)}
            data-testid={`${testId}-${node.id}-toggle`}
          >
            {chevron}
          </IconButton>
        )}
      </Box>
      {branch && (
        <Collapse in={isOpen} unmountOnExit>
          <List id={groupId} role="group" disablePadding dense data-testid={`${testId}-${node.id}-group`}>
            {(node.children ?? []).map((child) => (
              <TreeRow key={child.id} node={child} depth={depth + 1} {...context} />
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
 * chevron is a button of its own, for the pointer.
 *
 * **WAI-ARIA's tree pattern** (CTA-111): a named `tree` of `treeitem`s, each
 * branch owning its open `group`. It is one tab stop — the row last focused,
 * else the node on screen, else the first — and inside it ↓ / ↑ move between
 * the rows in view, Home / End go to the first and last, → opens a closed
 * branch or steps into an open one, ← closes an open branch or steps out to
 * its parent (the two arrows swapped under RTL, as the tree mirrors), and
 * Enter follows the row's link, selects it or opens its folder. Those keys
 * are told in a required `hint`, read with the tree (CTA-112).
 *
 * Every piece of state is the caller's: which branches are open, which node
 * is on screen. It knows no route and no record — the gallery's menu builds
 * its nodes from the tiers, a folder tree block from a store's folders.
 */
function TreeView({ nodes, ariaLabel, hint, testId, ...rest }: TreeViewProps) {
  const { open, onToggle, activeId } = rest;
  const { direction } = useTheme();
  const idBase = useId();
  const rows = useRef(new Map<string, HTMLElement>());
  const [focused, setFocused] = useState<string>();

  const shown = visibleNodes(nodes, open);
  const isShown = (id: string | undefined) => id !== undefined && shown.some((entry) => entry.node.id === id);
  const tabStop = isShown(focused) ? focused : isShown(activeId) ? activeId : shown[0]?.node.id;

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element === null) rows.current.delete(id);
    else rows.current.set(id, element);
  }, []);
  // An id-list attribute (`aria-owns`) splits on spaces, so none may reach one.
  const groupIdOf = useCallback((id: string) => `${idBase}-group-${id.replace(/\s/g, "_")}`, [idBase]);

  const focusRow = (entry: VisibleNode | undefined) => {
    if (entry === undefined) return;
    setFocused(entry.node.id);
    rows.current.get(entry.node.id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const index = shown.findIndex((entry) => rows.current.get(entry.node.id) === event.target);
    if (index < 0) return;
    const entry = shown[index];
    const { node } = entry;
    const branch = node.children !== undefined;
    const inward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const outward = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    let handled = true;
    if (event.key === "ArrowDown") focusRow(shown[index + 1]);
    else if (event.key === "ArrowUp") focusRow(shown[index - 1]);
    else if (event.key === "Home") focusRow(shown[0]);
    else if (event.key === "End") focusRow(shown[shown.length - 1]);
    else if (event.key === inward) {
      if (branch && !open.has(node.id)) onToggle(node.id);
      else if (branch) focusRow(shown[index + 1]?.parentId === node.id ? shown[index + 1] : undefined);
    } else if (event.key === outward) {
      if (branch && open.has(node.id)) onToggle(node.id);
      else focusRow(shown.find((candidate) => candidate.node.id === entry.parentId));
    } else handled = false;
    if (handled) event.preventDefault();
  };

  const hintId = `${idBase}-hint`;
  return (
    <>
    <Box id={hintId} data-testid={`${testId}-hint`} sx={visuallyHidden}>
      {hint}
    </Box>
    <List
      dense
      disablePadding
      role="tree"
      aria-label={ariaLabel}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
      data-testid={testId}
    >
      {nodes.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          testId={testId}
          tabStop={tabStop}
          onFocusRow={setFocused}
          register={register}
          groupIdOf={groupIdOf}
          {...rest}
        />
      ))}
    </List>
    </>
  );
}

export default TreeView;
