import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import VerticalAlignBottomRoundedIcon from "@mui/icons-material/VerticalAlignBottomRounded";
import VerticalAlignTopRoundedIcon from "@mui/icons-material/VerticalAlignTopRounded";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import { byCaseOrder, type AnalysisCase } from "../../../lib/analysisProjects";
import {
  CASE_COLUMNS,
  caseFirstDirection,
  caseSortValue,
  newestCaseFirst,
  type CaseColumn,
  type CaseRow,
} from "../../../lib/analysisCaseRows";

/**
 * What a Case's row can do: move it in the Project's order — one place up or
 * down, to the top or the bottom (CTA-203) — rename it, duplicate it.
 * Moving to another Project and deleting are the picks' (CTA-226 and CTA-203
 * took the row's away).
 */
export type CaseAction = "up" | "down" | "top" | "bottom" | "rename" | "duplicate";

/** The actions that move a Case in the Project's order. */
const REORDERS: ReadonlySet<CaseAction> = new Set(["up", "down", "top", "bottom"]);

export type CasesTableProps = {
  /** The Project's Cases as rows (`caseRowOf`), in any order — the table sorts them. */
  rows: readonly CaseRow[];
  /**
   * The sort — the header that shows its arrow. **The rows reorder only under
   * `#` ascending with no words** (CTA-203): the Project's order itself, every
   * Case in it; under any other sort, or `filtered`, the four reorder actions
   * are off, their tooltips saying why.
   */
  sort: DataTableSort<CaseColumn>;
  /** A header was clicked: the column, and the direction it asks for (a new column opens its own way). */
  onSort: (column: CaseColumn, direction: "asc" | "desc") => void;
  /** The page and its size; absent, every row shows and there is no pager. */
  paging?: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** Where a Case's Name goes — its board. */
  caseLink: (row: CaseRow) => LinkTarget;
  onCaseAction: (action: CaseAction, record: AnalysisCase) => void;
  /** The picked Cases' ids — a box per row, select-all in the header over every row the filter leaves. */
  picked: ReadonlySet<string>;
  onPickedChange: (picked: Set<string>) => void;
  /** Above the table: the words box. */
  filters?: ReactNode;
  /** The words box is on: no rows is "no case matches", with a way to clear it. */
  filtered?: boolean;
  /** Clears the words — the no-match row's button. */
  onClearFilter?: () => void;
  /**
   * The prefix of its ids: the table `<testId>` (DataTable's parts — a row
   * `<testId>-row-<id>`, its Name link `<testId>-link-<id>`, a sort header
   * `<testId>-sort-<column>`, the pager `<testId>-pager`, the empty row
   * `<testId>-empty`, the no-match row `<testId>-no-match` and its clear
   * `-no-match-clear`, a row's pick `<testId>-pick-<id>`, the header's
   * `<testId>-select-all`), each action `<testId>-<action>-<id>`.
   */
  testId: string;
};

const ACTIONS: readonly { action: CaseAction; icon: typeof ContentCopyRoundedIcon }[] = [
  { action: "up", icon: ArrowUpwardRoundedIcon },
  { action: "down", icon: ArrowDownwardRoundedIcon },
  { action: "top", icon: VerticalAlignTopRoundedIcon },
  { action: "bottom", icon: VerticalAlignBottomRoundedIcon },
  { action: "rename", icon: DriveFileRenameOutlineRoundedIcon },
  { action: "duplicate", icon: ContentCopyRoundedIcon },
];

/** The columns kept to one line and cut at a width: a name, an event, an opening. */
const WIDTHS: Partial<Record<CaseColumn, number>> = { name: 240, event: 160, opening: 200 };

/** A column's header: an abbreviation in view (`#`), its full name read in its place and shown on hover. */
const abbreviated = (header: string, name: string) => (
  <Box component="span" title={name} sx={{ position: "relative" }}>
    <span aria-hidden="true">{header}</span>
    <Box component="span" sx={visuallyHidden}>
      {name}
    </Box>
  </Box>
);

/** A reader's words on one line, cut with an ellipsis — the whole of it on hover. */
function OneLine({ value }: { value: string }) {
  return (
    <Box component="span" dir="auto" title={value} sx={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
      {value}
    </Box>
  );
}

/**
 * **A Project's Cases as a table** (CTA-186) — `#`, its place in the
 * Project's order (CTA-203), then the games table's columns: the
 * Case's Name (its link to the board) and Type, then White, Elo, Black, Elo,
 * Result, Date, Event, Round, ECO, Opening, Moves read off a Game's tags —
 * **blank for a Position** — and Updated; every header sorts (a missing value
 * last either way, ties newest first), the rows paged; each row's actions
 * move it up, down, to the top or the bottom of the order (only under `#`
 * ascending with no words — the first Case never up, the last never down),
 * rename and duplicate; a box per row and select-all in the header (over
 * the rows the words box leaves) for the screen's bulk move and delete — the
 * only ones (CTA-226); the words box in its filters slot,
 * and a no-match row with its Clear. Presentational: the rows, the sort, the
 * page and the callbacks are props; its words are the app's (`analysisV2.*`).
 */
function CasesTable({
  rows,
  sort,
  onSort,
  paging,
  caseLink,
  onCaseAction,
  picked,
  onPickedChange,
  filters,
  filtered = false,
  onClearFilter,
  testId,
}: CasesTableProps) {
  const { t } = useTranslation();

  // Reordering is the Project's order on screen: `#` ascending, no words — then every Case is a row.
  const sortOff = sort.column !== "order" || sort.direction !== "asc";
  const reorderOff = sortOff && filtered ? "Both" : sortOff ? "Sort" : filtered ? "Filter" : undefined;
  const ends = useMemo(() => {
    if (rows.length === 0) return undefined;
    const ordered = rows.map((row) => row.record).sort(byCaseOrder);
    return { first: ordered[0].id, last: ordered[ordered.length - 1].id };
  }, [rows]);

  const columns = useMemo<DataTableColumn<CaseRow, CaseColumn>[]>(() => {
    const direction: Partial<Record<CaseColumn, "auto" | "ltr">> = {
      order: "ltr",
      name: "auto",
      white: "auto",
      black: "auto",
      event: "auto",
      opening: "auto",
      result: "ltr",
      date: "ltr",
      round: "ltr",
      eco: "ltr",
      updated: "ltr",
    };
    const numeric = (id: CaseColumn) => id === "order" || id === "whiteElo" || id === "blackElo" || id === "moves";
    const render = (id: CaseColumn): ((row: CaseRow) => ReactNode) => {
      switch (id) {
        case "name":
          return (row) => (
            <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Box component="span" aria-hidden="true" sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}>
                {row.type === "game" ? <SportsEsportsOutlinedIcon fontSize="small" /> : <ExtensionOutlinedIcon fontSize="small" />}
              </Box>
              <OneLine value={row.name} />
            </Box>
          );
        case "type":
          return (row) => t(row.type === "game" ? "analysisV2.case.typeGame" : "analysisV2.case.typePosition");
        case "updated":
          return (row) => {
            const shown = tableDate(row.updated);
            return shown === undefined ? "" : <time dateTime={shown.dateTime}>{shown.text}</time>;
          };
        case "event":
        case "opening":
          return (row) => (row[id] === undefined ? "" : <OneLine value={row[id]} />);
        default:
          return (row) => row[id] ?? "";
      }
    };
    return CASE_COLUMNS.map((id) => ({
      id,
      header: id === "order" ? abbreviated("#", t("analysisV2.case.columns.order")) : t(`analysisV2.case.columns.${id}`),
      sortable: true,
      firstDirection: caseFirstDirection(id),
      sortValue: (row: CaseRow) => (id === "type" ? t(`analysisV2.case.${row.type === "game" ? "typeGame" : "typePosition"}`) : caseSortValue(row, id)),
      ...(numeric(id) && { align: "end" as const }),
      ...(direction[id] !== undefined && { dir: direction[id] }),
      ...(WIDTHS[id] !== undefined && { width: WIDTHS[id] }),
      render: render(id),
    }));
  }, [t]);

  return (
    <DataTable<CaseRow, CaseColumn>
      columns={columns}
      rows={rows}
      rowId={(row) => row.id}
      sort={sort}
      onSort={onSort}
      tieBreak={newestCaseFirst}
      paging={paging === undefined ? undefined : { ...paging, labelRowsPerPage: t("analysisV2.case.rowsPerPage") }}
      rowLink={caseLink}
      linkColumn="name"
      rowLinkLabel={(row) => t("analysisV2.case.openNamed", { name: row.name })}
      rowActions={(row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          {ACTIONS.map(({ action, icon: Icon }) => {
            const label = t(`analysisV2.case.${action}Named`, { name: row.name });
            const reorder = REORDERS.has(action);
            const atEnd = (action === "up" || action === "top" ? ends?.first : ends?.last) === row.id;
            return (
              <IconAction
                key={action}
                label={reorder && reorderOff !== undefined ? t(`analysisV2.case.reorderOff${reorderOff}`, { action: label }) : label}
                onClick={() => onCaseAction(action, row.record)}
                disabled={reorder && (reorderOff !== undefined || atEnd)}
                testId={`${testId}-${action}-${row.id}`}
              >
                <Icon fontSize="small" />
              </IconAction>
            );
          })}
        </Box>
      )}
      actionsLabel={t("analysisV2.case.actions")}
      picks={{
        picked,
        onChange: onPickedChange,
        selectAllLabel: t("analysisV2.case.selectAll"),
        pickLabel: (row) => t("analysisV2.case.pick", { name: row.name }),
      }}
      filters={filters}
      filtered={filtered}
      noMatchLabel={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          {t("analysisV2.case.noMatch")}
          {onClearFilter !== undefined && (
            <Button size="small" variant="outlined" onClick={onClearFilter} data-testid={`${testId}-no-match-clear`}>
              {t("analysisV2.case.clearFilter")}
            </Button>
          )}
        </Box>
      }
      emptyLabel={t("analysisV2.case.empty")}
      density="dense"
      ariaLabel={t("analysisV2.case.listLabel")}
      hint={t("analysisV2.case.tableHint")}
      testId={testId}
    />
  );
}

export default CasesTable;
