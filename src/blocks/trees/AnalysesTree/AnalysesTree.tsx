import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardDoubleArrowLeftRounded from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRounded from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";

import type { LinkTarget } from "../../../design-system/components/link";
import { StatusText } from "../../../design-system/components/feedback";
import { SearchField } from "../../../design-system/components/forms";
import { IconAction } from "../../../design-system/components/toolbars";
import { TreeView, type TreeNode } from "../../../design-system/patterns/trees";
import type { SavedAnalysisRow } from "../../../lib/savedAnalysisRows";
import type { GameFolder } from "../../../lib/savedGameFolders";
import {
  ANALYSES_TREE_MORE,
  analysesTreeNodes,
  type AnalysesTreeNodeLabels,
  type AnalysesTreeNodesInput,
} from "./analysesTreeNodes";

/** Every word the block shows — the screen's `t(…)`s, or a fixture's. */
export type AnalysesTreeLabels = AnalysesTreeNodeLabels & {
  /** The panel's heading and the tree's accessible name — the folder it is rooted at, or "Saved analyses". */
  title: string;
  /** The button that folds the panel to a rail. */
  collapse: string;
  /** The rail's button that opens the panel again. */
  expand: string;
  /** The Close button's name — it leaves for the list. */
  close: string;
  /** How the tree is worked, read with it by a screen reader (CTA-112) — `hints.tree`. */
  hint: string;
  /** Why the other analyses cannot be opened now. Shown only while `locked`. */
  locked: string;
  /** The filter box's name — "Filter analyses". */
  filter: string;
  /** The filter box's clear button. */
  filterClear: string;
  /** The words keep nothing — told apart from an empty folder. */
  noMatch: string;
  /** The toolbar's previous / next buttons' names — read only with `siblings`. */
  previous: string;
  next: string;
};

/**
 * Where the toolbar's previous / next go — the open analysis' neighbours in its
 * folder. A side with no neighbour is `undefined` and its button is disabled;
 * while `locked` both are, whatever they hold (the note says why).
 */
export type AnalysesTreeSiblings = {
  previous: LinkTarget | undefined;
  next: LinkTarget | undefined;
  /** The buttons' test ids are `<testId>-previous` and `<testId>-next`. */
  testId: string;
};

export type AnalysesTreeProps = Pick<AnalysesTreeNodesInput, "rootId" | "sort" | "currentId" | "shown" | "locked" | "text"> & {
  folders: readonly GameFolder[];
  rows: readonly SavedAnalysisRow[];
  /** Where an analysis' row goes — its board. */
  linkOf: (row: SavedAnalysisRow) => LinkTarget;
  /** Where Close goes — the saved analyses list. */
  closeLink: LinkTarget;
  /** The previous / next toolbar, sticky at the panel's foot (and in the rail). Absent, none is drawn. */
  siblings?: AnalysesTreeSiblings;
  /** The open folders' ids. Controlled: the screen opens the chain to the current analysis and keeps the rest as the reader left it. */
  open: ReadonlySet<string>;
  onToggle: (folderId: string) => void;
  /** A folder's "show more" row was chosen — `""` for the top level. */
  onShowMore: (folderKey: string) => void;
  /** The words in the filter box — the screen holds them. */
  onTextChange: (text: string) => void;
  /** Folded to a rail: the two buttons that remain — open it again, close it for the list. */
  collapsed: boolean;
  /** Fold the panel, and open it again. Absent, it cannot be folded (a drawer is closed instead). */
  onCollapsedChange?: (collapsed: boolean) => void;
  labels: AnalysesTreeLabels;
  /** The root; the parts are `-title`, `-collapse`, `-expand`, `-close`, `-locked`, `-filter` (and `-filter-clear`), `-no-match`, `-tree` and its rows (`-tree-<id>`). */
  testId: string;
};

/**
 * **The saved analyses as a tree, beside the board** (CTA-145) — what the
 * Analysis Board shows on its left when an analysis was opened from the list:
 * the list's own folders, nested and collapsible in the sidebar's look
 * (`TreeView`), with the analyses in them, every name wrapped and read whole,
 * the open one marked, a **Close** that goes back to the list, a **previous / next toolbar**
 * (`siblings`) at its foot, still there in the rail, and a button that
 * **folds the panel to a rail** (`collapsed`, at the start edge, two buttons) and
 * opens it again. Rooted at the folder the reader is inside. A click on
 * an analysis is a link to its board; while the board holds unsaved work
 * (`locked`) the other analyses are disabled and a note says why — folders
 * still open and close.
 *
 * A **filter box** narrows it by words as the list's does (names, notes,
 * players, event, opening; a folder whose name matches keeps all it holds) and
 * opens every branch that is left. Presentational: the folders, the rows, the
 * words, the order, the open branches, the links and the lock arrive as props; the nodes are `analysesTreeNodes`.
 */
/** Every branch of the nodes — what is open while the words narrow the tree, so each match is in view. */
const branchIdsOf = (nodes: readonly TreeNode[]): string[] =>
  nodes.flatMap((node) => (node.children === undefined ? [] : [node.id, ...branchIdsOf(node.children)]));

function AnalysesTree({ folders, rootId, rows, text, onTextChange, sort, currentId, shown, locked, linkOf, closeLink, siblings, open, onToggle, onShowMore, collapsed, onCollapsedChange, labels, testId }: AnalysesTreeProps) {
  // The arrows point at the start edge, which is the right one under RTL.
  const rtl = useTheme().direction === "rtl";
  const TowardsStart = rtl ? KeyboardDoubleArrowRightRounded : KeyboardDoubleArrowLeftRounded;
  const AwayFromStart = rtl ? KeyboardDoubleArrowLeftRounded : KeyboardDoubleArrowRightRounded;
  const Previous = rtl ? NavigateNextRoundedIcon : NavigateBeforeRoundedIcon;
  const Next = rtl ? NavigateBeforeRoundedIcon : NavigateNextRoundedIcon;
  // Another analysis is not opened over unsaved changes: no link then, and the note's words as the name.
  const siblingButtons = siblings === undefined ? null : (
    <>
      <IconAction
        label={locked ? labels.locked : labels.previous}
        link={locked ? undefined : siblings.previous}
        disabled={locked || siblings.previous === undefined}
        testId={`${siblings.testId}-previous`}
      >
        <Previous fontSize="small" />
      </IconAction>
      <IconAction
        label={locked ? labels.locked : labels.next}
        link={locked ? undefined : siblings.next}
        disabled={locked || siblings.next === undefined}
        testId={`${siblings.testId}-next`}
      >
        <Next fontSize="small" />
      </IconAction>
    </>
  );
  const nodes = useMemo(
    () => analysesTreeNodes({ folders, rootId, rows, text, sort, currentId, shown, locked, linkOf, labels }),
    [folders, rootId, rows, text, sort, currentId, shown, locked, linkOf, labels],
  );

  // Narrowed by words, every branch left is open: the matches are what the reader is after.
  const filtering = text.trim() !== "";
  const shownOpen = useMemo(() => (filtering ? new Set(branchIdsOf(nodes)) : open), [filtering, nodes, open]);

  // The open analysis is brought into view: its folder may be long.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: "nearest" });
  }, [currentId]);

  if (collapsed && onCollapsedChange !== undefined) {
    return (
      <Box component="nav" aria-label={labels.title} data-testid={testId} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <IconAction label={labels.expand} onClick={() => onCollapsedChange(false)} testId={`${testId}-expand`}>
          <AwayFromStart fontSize="small" />
        </IconAction>
        <IconAction label={labels.close} link={closeLink} testId={`${testId}-close`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
        {siblingButtons}
      </Box>
    );
  }

  return (
    <Box component="nav" aria-label={labels.title} data-testid={testId} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <Typography component="h2" variant="subtitle2" data-testid={`${testId}-title`} sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700 }}>
          {labels.title}
        </Typography>
        {onCollapsedChange !== undefined && (
          <IconAction label={labels.collapse} onClick={() => onCollapsedChange(true)} testId={`${testId}-collapse`}>
            <TowardsStart fontSize="small" />
          </IconAction>
        )}
        <IconAction label={labels.close} link={closeLink} testId={`${testId}-close`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
      </Box>
      {locked && (
        <Typography variant="caption" data-testid={`${testId}-locked`} sx={{ color: "text.secondary", display: "block", pb: 1, flexShrink: 0 }}>
          {labels.locked}
        </Typography>
      )}
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <SearchField label={labels.filter} value={text} onChange={onTextChange} clearLabel={labels.filterClear} testId={`${testId}-filter`} />
      </Box>
      <Box ref={scrollerRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {filtering && nodes.length === 0 && (
          <StatusText tone="neutral" testId={`${testId}-no-match`}>
            {labels.noMatch}
          </StatusText>
        )}
        <TreeView
          nodes={nodes}
          open={shownOpen}
          onToggle={onToggle}
          activeId={currentId}
          onSelect={(node) => {
            if (node.id.startsWith(ANALYSES_TREE_MORE)) onShowMore(node.id.slice(ANALYSES_TREE_MORE.length));
          }}
          wrapLabels
          ariaLabel={labels.title}
          hint={labels.hint}
          testId={`${testId}-tree`}
        />
      </Box>
      {siblingButtons !== null && (
        // Sticky at the foot, like the board panel's controls: the tree scrolls above it.
        <Box
          data-testid={`${testId}-siblings`}
          sx={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 1, pt: 1, mt: 1, borderTop: "1px solid", borderColor: "divider" }}
        >
          {siblingButtons}
        </Box>
      )}
    </Box>
  );
}

export default AnalysesTree;
