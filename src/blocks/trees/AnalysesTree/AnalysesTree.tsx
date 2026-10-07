import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardDoubleArrowLeftRounded from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRounded from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

import type { LinkTarget } from "../../../design-system/components/link";
import { IconAction } from "../../../design-system/components/toolbars";
import { TreeView } from "../../../design-system/patterns/trees";
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
};

export type AnalysesTreeProps = Pick<AnalysesTreeNodesInput, "rootId" | "sort" | "currentId" | "shown" | "locked"> & {
  folders: readonly GameFolder[];
  rows: readonly SavedAnalysisRow[];
  /** Where an analysis' row goes — its board. */
  linkOf: (row: SavedAnalysisRow) => LinkTarget;
  /** Where Close goes — the saved analyses list. */
  closeLink: LinkTarget;
  /** The open folders' ids. Controlled: the screen opens the chain to the current analysis and keeps the rest as the reader left it. */
  open: ReadonlySet<string>;
  onToggle: (folderId: string) => void;
  /** A folder's "show more" row was chosen — `""` for the top level. */
  onShowMore: (folderKey: string) => void;
  /** Folded to a rail: the two buttons that remain — open it again, close it for the list. */
  collapsed: boolean;
  /** Fold the panel, and open it again. Absent, it cannot be folded (a drawer is closed instead). */
  onCollapsedChange?: (collapsed: boolean) => void;
  labels: AnalysesTreeLabels;
  /** The root; the parts are `-title`, `-collapse`, `-expand`, `-close`, `-locked`, `-tree` and its rows (`-tree-<id>`). */
  testId: string;
};

/**
 * **The saved analyses as a tree, beside the board** (CTA-145) — what the
 * Analysis Board shows on its left when an analysis was opened from the list:
 * the list's own folders, nested and collapsible in the sidebar's look
 * (`TreeView`), with the analyses in them, every name wrapped and read whole,
 * the open one marked, a **Close** that goes back to the list and a button that
 * **folds the panel to a rail** (`collapsed`, at the start edge, two buttons) and
 * opens it again. Rooted at the folder the reader is inside. A click on
 * an analysis is a link to its board; while the board holds unsaved work
 * (`locked`) the other analyses are disabled and a note says why — folders
 * still open and close.
 *
 * Presentational: the folders, the rows, the order, the open branches, the
 * links and the lock arrive as props; the nodes are `analysesTreeNodes`.
 */
function AnalysesTree({ folders, rootId, rows, sort, currentId, shown, locked, linkOf, closeLink, open, onToggle, onShowMore, collapsed, onCollapsedChange, labels, testId }: AnalysesTreeProps) {
  // The arrows point at the start edge, which is the right one under RTL.
  const rtl = useTheme().direction === "rtl";
  const TowardsStart = rtl ? KeyboardDoubleArrowRightRounded : KeyboardDoubleArrowLeftRounded;
  const AwayFromStart = rtl ? KeyboardDoubleArrowLeftRounded : KeyboardDoubleArrowRightRounded;
  const nodes = useMemo(
    () => analysesTreeNodes({ folders, rootId, rows, sort, currentId, shown, locked, linkOf, labels }),
    [folders, rootId, rows, sort, currentId, shown, locked, linkOf, labels],
  );

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
      <Box ref={scrollerRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <TreeView
          nodes={nodes}
          open={open}
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
    </Box>
  );
}

export default AnalysesTree;
