import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import { SearchField } from "../../../design-system/components/forms";
import type { LinkTarget } from "../../../design-system/components/link";
import { IconAction } from "../../../design-system/components/toolbars";
import { TreeView, type TreeNode } from "../../../design-system/patterns/trees";
import type { CaseRow } from "../../../lib/analysisCaseRows";

const NO_OPEN: ReadonlySet<string> = new Set();

export type CaseSiblingsProps = {
  /** The Project the Cases are in — the panel's title. */
  projectName: string;
  /** Its Cases as the list shows them: in the table's order, narrowed by the words. */
  rows: readonly CaseRow[];
  /** The Case on the board — marked current. */
  currentId: string;
  /** Where a Case's row goes — its board. */
  linkOf: (row: CaseRow) => LinkTarget;
  /** Where Close goes — the Project's Cases. */
  closeLink: LinkTarget;
  /** The previous / next Case in the same order — `undefined` at an end. */
  previous: LinkTarget | undefined;
  next: LinkTarget | undefined;
  /** The words in the filter box — the screen holds them. */
  text: string;
  onTextChange: (text: string) => void;
  /**
   * The root; its parts `-close`, `-title`,
   * `-filter` (and `-filter-clear`), `-no-match`, `-tree` (each row
   * `-tree-<id>`), `-siblings`, `-previous`, `-next`.
   */
  testId: string;
};

/**
 * **A Project's Cases beside a Case's board** (CTA-186) — the legacy Saved
 * analyses' tree (CTA-145, removed in CTA-192) for Analysis V2, where a Project
 * has no folders: its Cases as one flat `TreeView` (each named, a Game's or a
 * Position's icon, the open one current and brought into view, every row a
 * link to its board), a words box above it, a Close back to the Project at
 * the head's start, and previous / next at its foot, sticky under the list.
 * Nothing locks it: a Case autosaves. Presentational: the rows arrive ordered
 * and narrowed by the screen; its words are the app's (`analysisV2.siblings.*`).
 */
function CaseSiblings({
  projectName,
  rows,
  currentId,
  linkOf,
  closeLink,
  previous,
  next,
  text,
  onTextChange,
  testId,
}: CaseSiblingsProps) {
  const { t } = useTranslation();
  // Previous / next point along the reading direction, which runs right to left under RTL.
  const rtl = useTheme().direction === "rtl";
  const Previous = rtl ? NavigateNextRoundedIcon : NavigateBeforeRoundedIcon;
  const Next = rtl ? NavigateBeforeRoundedIcon : NavigateNextRoundedIcon;
  const title = t("analysisV2.siblings.title", { name: projectName });

  const nodes = useMemo(
    (): TreeNode[] =>
      rows.map((row) => ({
        id: row.id,
        label: row.name,
        dir: "auto",
        icon: row.type === "game" ? <SportsEsportsOutlinedIcon fontSize="small" /> : <ExtensionOutlinedIcon fontSize="small" />,
        link: linkOf(row),
      })),
    [rows, linkOf],
  );

  // The open Case is brought into view: a Project may hold many.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: "nearest" });
  }, [currentId]);

  return (
    <Box component="nav" aria-label={title} data-testid={testId} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <IconAction label={t("analysisV2.siblings.close", { name: projectName })} link={closeLink} testId={`${testId}-close`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
        <Typography component="h2" variant="subtitle2" dir="auto" data-testid={`${testId}-title`} sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700 }}>
          {projectName}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <SearchField
          label={t("analysisV2.case.filter")}
          value={text}
          onChange={onTextChange}
          clearLabel={t("analysisV2.case.filterClear")}
          testId={`${testId}-filter`}
        />
      </Box>
      <Box ref={scrollerRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {rows.length === 0 && (
          <StatusText tone="neutral" testId={`${testId}-no-match`}>
            {t(text.trim() === "" ? "analysisV2.case.empty" : "analysisV2.case.noMatch")}
          </StatusText>
        )}
        <TreeView
          nodes={nodes}
          open={NO_OPEN}
          onToggle={() => {}}
          activeId={currentId}
          wrapLabels
          ariaLabel={title}
          hint={t("analysisV2.siblings.hint")}
          testId={`${testId}-tree`}
        />
      </Box>
      {/* Sticky at the foot, like the board panel's controls: the list scrolls above it. */}
      <Box
        data-testid={`${testId}-siblings`}
        sx={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 1, pt: 1, mt: 1, borderTop: "1px solid", borderColor: "divider" }}
      >
        <IconAction label={t("analysisV2.siblings.previous")} link={previous} disabled={previous === undefined} testId={`${testId}-previous`}>
          <Previous fontSize="small" />
        </IconAction>
        <IconAction label={t("analysisV2.siblings.next")} link={next} disabled={next === undefined} testId={`${testId}-next`}>
          <Next fontSize="small" />
        </IconAction>
      </Box>
    </Box>
  );
}

export default CaseSiblings;
