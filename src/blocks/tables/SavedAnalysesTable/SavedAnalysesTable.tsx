import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import {
  SAVED_ANALYSIS_COLUMNS,
  savedAnalysisFirstDirection,
  type SavedAnalysisColumn,
  type SavedAnalysisRow,
} from "../../../lib/savedAnalysisRows";

export type SavedAnalysesTableProps = {
  /**
   * The analyses the filter leaves, every page of them, **in the order to
   * show** — the screen sorts them (`sortedAnalysisRows`), since it parses
   * the page on screen and so must know which rows that is.
   */
  rows: readonly SavedAnalysisRow[];
  /** The sort the rows are in — the header that shows its arrow. */
  sort: DataTableSort<SavedAnalysisColumn>;
  /** A header was clicked: the column, and the direction it asks for (a new column opens its own way). */
  onSort: (column: SavedAnalysisColumn, direction: "asc" | "desc") => void;
  /** The page and its size; absent, every row shows and there is no pager. */
  paging?: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** The picked ids — over every folder; the table counts its own rows through them. */
  picked: ReadonlySet<string>;
  onPickedChange: (picked: Set<string>) => void;
  /** Where an analysis opens — the Analysis Board: the Name cell's link, and a click anywhere on the row. */
  openLink: (row: SavedAnalysisRow) => LinkTarget;
  /** Its settings screen — the row's gear. */
  settingsLink: (row: SavedAnalysisRow) => LinkTarget;
  /** The words box is on: no rows is "no analysis matches", with a way to clear it. */
  filtered?: boolean;
  /** Clears the filter — the no-match row's button. */
  onClearFilter: () => void;
  /** Above the table: the words box. */
  filters?: ReactNode;
  /**
   * The table's root, and every id under it: `-sort-<column>`, `-frame-table`,
   * `-pager`, `-empty`, `-no-match`, `-no-match-clear`, `-note-<id>`,
   * `-settings-<id>`, `-description-<id>`; a row, its link and its pick take
   * the ids the screen's list had — `rowTestId`, `openTestId`, `pickTestId`,
   * `selectAllTestId`.
   */
  testId: string;
  /** A row's id (`<prefix>-<id>`), its Name link's, its pick's, and the header's select-all. */
  rowTestId: string;
  openTestId: string;
  pickTestId: string;
  selectAllTestId: string;
};

/**
 * A text on **one line**, truncated with an ellipsis at the column's width —
 * the whole string on hover (a native `title`), as `CollectionGamesTable`'s
 * Opening cell: the flex wrapper with a `minWidth: 0` child is what keeps a
 * long value from growing the table sideways.
 */
function OneLine({ value, testId, secondary = false }: { value: string; testId?: string; secondary?: boolean }) {
  return (
    <Box component="span" sx={{ display: "flex", minWidth: 0 }}>
      <Box
        component="span"
        dir="auto"
        title={value}
        data-testid={testId}
        sx={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...(secondary && { typography: "caption", color: "text.secondary" }),
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

/** The columns kept to one line and cut at a width: a name, an event, an opening. */
const WIDTHS: Partial<Record<SavedAnalysisColumn, number>> = { name: 220, event: 160, opening: 200 };

/**
 * **The saved analyses of a folder, as a games table** (CTA-144) — the
 * Saved analyses screen's list view: one row per analysis as a `DataTable`,
 * its columns the game's own fields read off its PGN tags — Name, White, Elo,
 * Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves, Updated — every
 * one a sort header; a pick per row with select-all in the header over every
 * row the filter leaves, on every page; the settings gear at the row's end.
 *
 * - **The Name cell is the row's link** to the Analysis Board — the reader's
 *   name, else the players, else "Analysis board" — with the description
 *   under it on one line, the whole of it on hover.
 * - **A missing field is an empty cell**; the placeholders a board's own
 *   analysis is written with already read as missing (`lib/savedAnalysisRows.ts`).
 * - **A record that will not read** keeps its row, which says so across the
 *   columns, and can only be picked or reached by its gear.
 * - **No row left by the filter** says so, distinct from an empty folder, with
 *   a button that clears it.
 * - Players, events, names and openings are the reader's words (`dir="auto"`);
 *   a result, a date, a round and an ECO code stay LTR.
 *
 * Presentational: the rows (filtered and ordered), the sort, the page, the
 * picks, the links and the filter's words are the screen's; its words are
 * the analyses' catalog (`savedAnalyses.*`, `savedList.*`).
 */
function SavedAnalysesTable({
  rows,
  sort,
  onSort,
  paging,
  picked,
  onPickedChange,
  openLink,
  settingsLink,
  filtered = false,
  onClearFilter,
  filters,
  testId,
  rowTestId,
  openTestId,
  pickTestId,
  selectAllTestId,
}: SavedAnalysesTableProps) {
  const { t } = useTranslation();
  const nameOf = (row: SavedAnalysisRow) => row.name || t("savedAnalyses.untitled");

  const columns = useMemo<DataTableColumn<SavedAnalysisRow, SavedAnalysisColumn>[]>(() => {
    const direction: Partial<Record<SavedAnalysisColumn, "auto" | "ltr">> = {
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
    const numeric = (id: SavedAnalysisColumn) => id === "whiteElo" || id === "blackElo" || id === "moves";
    const render = (id: SavedAnalysisColumn) => {
      switch (id) {
        case "name":
          return (row: SavedAnalysisRow) => (
            <>
              <OneLine value={row.name || t("savedAnalyses.untitled")} />
              {row.description !== "" && (
                <OneLine value={row.description} secondary testId={`${testId}-description-${row.id}`} />
              )}
            </>
          );
        case "event":
        case "opening":
          return (row: SavedAnalysisRow) => (row[id] === undefined ? "" : <OneLine value={row[id]} />);
        case "updated":
          return (row: SavedAnalysisRow) => {
            const shown = tableDate(row.updated);
            return shown === undefined ? "" : <time dateTime={shown.dateTime}>{shown.text}</time>;
          };
        default:
          return (row: SavedAnalysisRow) => row[id] ?? "";
      }
    };
    return SAVED_ANALYSIS_COLUMNS.map((id) => ({
      id,
      header: t(`savedAnalyses.table.columns.${id}`),
      sortable: true,
      firstDirection: savedAnalysisFirstDirection(id),
      ...(numeric(id) && { align: "end" as const }),
      ...(direction[id] !== undefined && { dir: direction[id] }),
      ...(WIDTHS[id] !== undefined && { width: WIDTHS[id] }),
      render: render(id),
    }));
  }, [t, testId]);

  return (
    <DataTable<SavedAnalysisRow, SavedAnalysisColumn>
      columns={columns}
      rows={rows}
      rowId={(row) => row.id}
      sorted
      sort={sort}
      onSort={onSort}
      paging={paging === undefined ? undefined : { ...paging, labelRowsPerPage: t("savedAnalyses.rowsPerPage") }}
      picks={{
        picked,
        onChange: onPickedChange,
        selectAllLabel: t("savedAnalyses.selectAll"),
        pickLabel: (row) => t("savedList.selectNamed", { name: nameOf(row) }),
        selectAllTestId,
        pickTestId: (row) => `${pickTestId}-${row.id}`,
      }}
      rowActions={(row) => (
        <IconAction
          label={t("savedList.settingsNamed", { name: nameOf(row) })}
          link={settingsLink(row)}
          testId={`${testId}-settings-${row.id}`}
        >
          <SettingsRoundedIcon fontSize="small" />
        </IconAction>
      )}
      actionsLabel={t("savedAnalyses.table.actions")}
      // A record that will not read has nothing to open: its name and why, across the columns.
      rowLink={(row) => (row.unreadable === true ? undefined : openLink(row))}
      linkColumn="name"
      rowNote={(row) =>
        row.unreadable === true ? (
          <>
            <bdi>{nameOf(row)}</bdi> — {t("savedAnalyses.unreadable")}
          </>
        ) : undefined
      }
      rowTestId={(row) => `${rowTestId}-${row.id}`}
      linkTestId={(row) => `${openTestId}-${row.id}`}
      emptyLabel={t("savedAnalyses.folder.empty")}
      noMatchLabel={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          {t("savedAnalyses.table.noMatch")}
          <Button size="small" variant="outlined" onClick={onClearFilter} data-testid={`${testId}-no-match-clear`}>
            {t("savedAnalyses.table.clearFilter")}
          </Button>
        </Box>
      }
      filtered={filtered}
      filters={filters}
      density="dense"
      ariaLabel={t("savedAnalyses.table.label")}
      hint={t("hints.table.sortAndPick")}
      testId={testId}
    />
  );
}

export default SavedAnalysesTable;
