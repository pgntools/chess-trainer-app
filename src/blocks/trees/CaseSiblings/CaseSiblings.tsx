import { useEffect, useMemo, useRef, useState } from "react";
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
import { TablePager } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { TreeView, type TreeNode } from "../../../design-system/patterns/trees";
import type { CaseRow } from "../../../lib/analysisCaseRows";

const NO_OPEN: ReadonlySet<string> = new Set();

/** How many Cases a page of the list shows (CTA-211) — a Project may hold thousands. */
export const CASE_SIBLINGS_PAGE_SIZE = 100;

/** The page that holds the open Case — the first where the rows leave it out. */
const pageHolding = (rows: readonly CaseRow[], currentId: string): number => {
  const at = rows.findIndex((row) => row.id === currentId);
  return at < 0 ? 0 : Math.floor(at / CASE_SIBLINGS_PAGE_SIZE);
};

export type CaseSiblingsProps = {
  /** The Project the Cases are in — the panel's title. */
  projectName: string;
  /** Its Cases as the list shows them: in the table's order, narrowed by the words — all of them; the block pages them. */
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
   * `-tree-<id>`), `-pager` (past one page), `-siblings`, `-previous`, `-next`.
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
 * **Paged, 100 Cases a page** (CTA-211, `CASE_SIBLINGS_PAGE_SIZE`): past one
 * page a `TablePager` under the list — "101–200 of 1,234", previous / next
 * page, no size to choose. It opens on the page holding the open Case, goes
 * to that Case's page again whenever the Case or the words change, and
 * paging by hand changes no Case. Nothing locks it: a Case autosaves.
 * Presentational: the rows arrive ordered and narrowed by the screen, and
 * the block pages them (the page is its own); its words are the app's
 * (`analysisV2.siblings.*`).
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
  const { t, i18n } = useTranslation();
  /*
    The page on screen: the open Case's, again whenever the Case or the words
    change — adjusted during render against the ones it was set for — else
    wherever the reader paged to. A page past the last (rows gone) is the last.
  */
  const [paged, setPaged] = useState(() => ({ currentId, text, page: pageHolding(rows, currentId) }));
  let asked = paged.page;
  if (paged.currentId !== currentId || paged.text !== text) {
    asked = pageHolding(rows, currentId);
    setPaged({ currentId, text, page: asked });
  }
  const lastPage = Math.max(0, Math.ceil(rows.length / CASE_SIBLINGS_PAGE_SIZE) - 1);
  const page = Math.min(asked, lastPage);
  const pageRows = useMemo(() => rows.slice(page * CASE_SIBLINGS_PAGE_SIZE, (page + 1) * CASE_SIBLINGS_PAGE_SIZE), [rows, page]);
  const number = (value: number) => value.toLocaleString(i18n.language);
  // Previous / next point along the reading direction, which runs right to left under RTL.
  const rtl = useTheme().direction === "rtl";
  const Previous = rtl ? NavigateNextRoundedIcon : NavigateBeforeRoundedIcon;
  const Next = rtl ? NavigateBeforeRoundedIcon : NavigateNextRoundedIcon;
  const title = t("analysisV2.siblings.title", { name: projectName });

  const nodes = useMemo(
    (): TreeNode[] =>
      pageRows.map((row) => ({
        id: row.id,
        label: row.name,
        dir: "auto",
        icon: row.type === "game" ? <SportsEsportsOutlinedIcon fontSize="small" /> : <ExtensionOutlinedIcon fontSize="small" />,
        link: linkOf(row),
      })),
    [pageRows, linkOf],
  );

  // The open Case is brought into view on its page: a page holds a hundred. Another page starts at its top.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = scrollerRef.current;
    const current = scroller?.querySelector('[aria-current="page"]');
    if (current) current.scrollIntoView?.({ block: "nearest" });
    else if (scroller) scroller.scrollTop = 0;
  }, [currentId, page]);

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
      {rows.length > CASE_SIBLINGS_PAGE_SIZE && (
        <TablePager
          count={rows.length}
          page={page}
          rowsPerPage={CASE_SIBLINGS_PAGE_SIZE}
          pageSizes={[CASE_SIBLINGS_PAGE_SIZE]}
          onPageChange={(next) => setPaged((before) => ({ ...before, page: next }))}
          onRowsPerPageChange={() => {}}
          labelRowsPerPage={t("analysisV2.siblings.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) => t("analysisV2.siblings.pageRows", { from: number(from), to: number(to), total: number(count) })}
          testId={`${testId}-pager`}
        />
      )}
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
