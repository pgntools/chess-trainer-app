import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import {
  CASE_COLUMNS,
  caseFirstDirection,
  caseSortValue,
  newestCaseFirst,
  type CaseColumn,
  type CaseRow,
} from "../../../lib/analysisCaseRows";

/** What a Case's row can do. */
export type CaseAction = "rename" | "move" | "duplicate" | "delete";

export type CasesTableProps = {
  /** The Project's Cases as rows (`caseRowOf`), in any order — the table sorts them. */
  rows: readonly CaseRow[];
  /** The sort — the header that shows its arrow. */
  sort: DataTableSort<CaseColumn>;
  /** A header was clicked: the column, and the direction it asks for (a new column opens its own way). */
  onSort: (column: CaseColumn, direction: "asc" | "desc") => void;
  /** The page and its size; absent, every row shows and there is no pager. */
  paging?: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** Where a Case's Name goes — its board. */
  caseLink: (row: CaseRow) => LinkTarget;
  onCaseAction: (action: CaseAction, record: AnalysisCase) => void;
  /** Moving a Case needs another Project to go to — off while there is none. */
  canMove?: boolean;
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

const ACTIONS: readonly { action: CaseAction; icon: typeof DeleteOutlineRoundedIcon }[] = [
  { action: "rename", icon: DriveFileRenameOutlineRoundedIcon },
  { action: "move", icon: DriveFileMoveRoundedIcon },
  { action: "duplicate", icon: ContentCopyRoundedIcon },
  { action: "delete", icon: DeleteOutlineRoundedIcon },
];

/** The columns kept to one line and cut at a width: a name, an event, an opening. */
const WIDTHS: Partial<Record<CaseColumn, number>> = { name: 240, event: 160, opening: 200 };

/** A reader's words on one line, cut with an ellipsis — the whole of it on hover. */
function OneLine({ value }: { value: string }) {
  return (
    <Box component="span" dir="auto" title={value} sx={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
      {value}
    </Box>
  );
}

/**
 * **A Project's Cases as a table** (CTA-186) — the games table's columns: the
 * Case's Name (its link to the board) and Type, then White, Elo, Black, Elo,
 * Result, Date, Event, Round, ECO, Opening, Moves read off a Game's tags —
 * **blank for a Position** — and Updated; every header sorts (a missing value
 * last either way, ties newest first), the rows paged; each row's actions
 * rename, move to another Project, duplicate and delete; a box per row and
 * select-all in the header (over the rows the words box leaves) for the
 * screen's bulk delete; the words box in its filters slot, and a no-match row
 * with its Clear. Presentational: the
 * rows, the sort, the page and the callbacks are props; its words are the
 * app's (`analysisV2.*`).
 */
function CasesTable({
  rows,
  sort,
  onSort,
  paging,
  caseLink,
  onCaseAction,
  canMove = true,
  picked,
  onPickedChange,
  filters,
  filtered = false,
  onClearFilter,
  testId,
}: CasesTableProps) {
  const { t } = useTranslation();

  const columns = useMemo<DataTableColumn<CaseRow, CaseColumn>[]>(() => {
    const direction: Partial<Record<CaseColumn, "auto" | "ltr">> = {
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
    const numeric = (id: CaseColumn) => id === "whiteElo" || id === "blackElo" || id === "moves";
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
      header: t(`analysisV2.case.columns.${id}`),
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
          {ACTIONS.map(({ action, icon: Icon }) => (
            <IconAction
              key={action}
              label={t(`analysisV2.case.${action}Named`, { name: row.name })}
              onClick={() => onCaseAction(action, row.record)}
              disabled={action === "move" && !canMove}
              color={action === "delete" ? "error" : "default"}
              testId={`${testId}-${action}-${row.id}`}
            >
              <Icon fontSize="small" />
            </IconAction>
          ))}
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
