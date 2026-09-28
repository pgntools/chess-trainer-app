import { useMemo } from "react";
import Tooltip from "@mui/material/Tooltip";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import {
  DataTable,
  type DataTableColumn,
  type DataTablePaging,
  type DataTableSort,
} from "../../../design-system/patterns/tables";
import { openingLabelOf, type CollectionRow } from "../../../lib/libraryCollections";

export type ExampleGamesColumn = "number" | "white" | "black" | "result" | "date" | "opening" | "moves";

/** Every word the block shows — the screen's `t(…)`s, or a fixture's. */
export type ExampleGamesTableLabels = {
  columns: Record<ExampleGamesColumn, string>;
  /** The table's accessible name. */
  table: string;
  empty: string;
  noMatch: string;
  loading: string;
  rowsPerPage: string;
  /** The mark on a game that will not parse. */
  unreadable: string;
};

export type ExampleGamesTableProps = {
  /** The games the filters leave, every page of them — rows of a collection's index. */
  rows: readonly CollectionRow[];
  sort: DataTableSort<ExampleGamesColumn>;
  onSort: (column: ExampleGamesColumn) => void;
  /** The page and its size — `useTableUrlState`'s, in a screen. The pager's words are `labels.rowsPerPage`. */
  paging: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** Still reading the index. */
  loading?: boolean;
  /** A filter is on. */
  filtered?: boolean;
  /** Where a game opens; the White cell is its link. */
  gameLink: (row: CollectionRow) => LinkTarget;
  /** Build it once (or memoise it): the columns are rebuilt when it changes. */
  labels: ExampleGamesTableLabels;
  testId: string;
};

const muted = (text: string | undefined) => text ?? "–";

/**
 * **The placeholder block** (CTA-110) — here to prove the Blocks layer's
 * wiring end to end, not to be used: a collection's games (`CollectionRow`,
 * from `src/lib/`) as a `DataTable`, its opening named by `lib/`'s own pure
 * `openingLabelOf`, its fixtures in the gallery. It reads no store and no
 * route — its rows, sort, paging and link arrive as props. The real tables
 * (`CollectionGamesTable`, …) replace it as their modules migrate; delete it
 * with the first of them.
 */
function ExampleGamesTable({ rows, sort, onSort, paging, loading, filtered, gameLink, labels, testId }: ExampleGamesTableProps) {
  const columns = useMemo<DataTableColumn<CollectionRow, ExampleGamesColumn>[]>(
    () => [
      {
        id: "number",
        header: labels.columns.number,
        sortable: true,
        align: "end",
        width: 72,
        sortValue: (row) => row.number,
        render: (row) => (
          <>
            {row.unreadable === true && (
              <Tooltip title={labels.unreadable}>
                <WarningAmberRoundedIcon
                  color="warning"
                  aria-label={labels.unreadable}
                  data-testid={`${testId}-unreadable-${row.number}`}
                  sx={{ fontSize: 16, verticalAlign: "text-bottom", marginInlineEnd: 0.5 }}
                />
              </Tooltip>
            )}
            <bdi dir="ltr">{row.number}</bdi>
          </>
        ),
      },
      { id: "white", header: labels.columns.white, sortable: true, dir: "auto", sortValue: (row) => row.white, render: (row) => muted(row.white) },
      { id: "black", header: labels.columns.black, sortable: true, dir: "auto", sortValue: (row) => row.black, render: (row) => muted(row.black) },
      { id: "result", header: labels.columns.result, sortable: true, dir: "ltr", sortValue: (row) => row.result, render: (row) => row.result },
      {
        id: "date",
        header: labels.columns.date,
        sortable: true,
        firstDirection: "desc",
        sortValue: (row) => row.date,
        render: (row) => {
          const shown = tableDate(row.date);
          return shown === undefined ? "–" : <time dir="ltr" dateTime={shown.dateTime}>{shown.text}</time>;
        },
      },
      {
        id: "opening",
        header: labels.columns.opening,
        sortable: true,
        dir: "auto",
        wrap: true,
        sortValue: (row) => openingLabelOf(row),
        render: (row) => muted(openingLabelOf(row)),
      },
      {
        id: "moves",
        header: labels.columns.moves,
        sortable: true,
        align: "end",
        firstDirection: "desc",
        sortValue: (row) => row.moves,
        render: (row) => <bdi dir="ltr">{row.moves}</bdi>,
      },
    ],
    [labels, testId],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowId={(row) => String(row.number)}
      sort={sort}
      onSort={onSort}
      tieBreak={(a, b) => a.number - b.number}
      paging={{ ...paging, labelRowsPerPage: labels.rowsPerPage }}
      rowLink={gameLink}
      linkColumn="white"
      loading={loading}
      loadingLabel={labels.loading}
      emptyLabel={labels.empty}
      noMatchLabel={labels.noMatch}
      filtered={filtered}
      ariaLabel={labels.table}
      testId={testId}
    />
  );
}

export default ExampleGamesTable;
