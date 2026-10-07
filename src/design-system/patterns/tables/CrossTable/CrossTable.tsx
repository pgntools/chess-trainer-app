import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { EmptyTableRow, LoadingTableRow, TableFrame, TablePager, type TableName } from "../../../components/tables";
import { CompetitorCells, CompetitorHeadingCells, HeadingCell, ResultLegend, ResultsCell, ScoreCells, ScoreHeadingCells } from "../competitorCells";
import type { Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "../competitors";
import { pageOfRows, type TablePaging } from "../paging";

/** A row of the crosstable: the competitor, and every result against each of the others. */
export type CrossTableRow = Competitor & {
  /**
   * Every result against another competitor, by that competitor's `id`, in
   * order — two in a double round robin, one in a single. A pair with no
   * game yet is an empty cell, or the caller's own `none` mark.
   */
  results: Readonly<Record<string, readonly ResultEntry[]>>;
};

export type CrossTableProps = TableName & {
  /** The rows, in rank order. The competitors' columns follow the same order. */
  rows: readonly CrossTableRow[];
  labels: CompetitorLabels;
  /** The tie-break columns after the points, in order. Absent, none. */
  tieBreaks?: readonly TieBreakColumn[];
  /** How the points are written ("7.5"). Absent, as they are. */
  formatPoints?: (points: number) => string;
  /** Under the table, while it has rows: what the glyphs that are not numbers mean — the unfinished game's, the missing game's. */
  legend?: readonly ResultEntry[];
  /** The rows are still being read: one busy row under the header. */
  loading?: boolean;
  /** "Reading…". */
  loadingLabel?: ReactNode;
  /** No row at all ("No games yet"). */
  emptyLabel: ReactNode;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /**
   * Cut the rows into pages, the pager under the frame (CTA-128) — for a long
   * table. Absent, every row shows. The ranks are the rows' own, so page 2
   * starts at its own rank.
   */
  paging?: TablePaging;
  /** The header stays in view while the body scrolls (the default). */
  stickyHeader?: boolean;
  /**
   * The root. The parts: `-frame` (the scrolling region; its table
   * `-frame-table`), `-row-<id>` (its name `-row-<id>-name`, its points
   * `-row-<id>-points`, a tie-break `-row-<id>-<column>`), a competitor's
   * column header `-column-<id>`, the cell of a row against a column
   * `-cell-<row id>-<column id>` (the diagonal's too), `-loading`, `-empty`,
   * `-legend`, `-pager`.
   */
  testId: string;
};

/**
 * **A crosstable** (CTA-120) — a round robin's: a row **and** a column per
 * competitor in rank order, the cell where they meet holding every result
 * between the two (one in a single round robin, two in a double), the
 * diagonal blank; then the points and the tie-break columns.
 *
 * - **A cell shows the results only** — the same glyphs and tones as
 *   `StandingsTable`'s (`ResultMark`); the round and the opponent are in each
 *   mark's words.
 * - A competitor's column is headed by its rank, as a printed crosstable's
 *   is, and read by its name.
 * - **The tie-breaks are data** (`tieBreaks`, each row's values by column id).
 * - An unfinished tournament is cells with fewer results than the rest.
 *
 * **Accessible**: named by an `ariaLabel` or a `caption`; busy while
 * `loading`; the rows' and the columns' headers are real ones (`th` with a
 * `scope`), so a screen reader names both competitors of a cell; a result is
 * read by its words, never told by its colour alone.
 *
 * It fills its parent's flex column (`flex: 1; minHeight: 0`). Generic: it
 * knows no chess — its rows and words arrive as props.
 */
function CrossTable({
  rows,
  labels,
  tieBreaks = [],
  formatPoints,
  legend,
  loading = false,
  loadingLabel,
  emptyLabel,
  density = "normal",
  stickyHeader = true,
  paging,
  ariaLabel,
  caption,
  testId,
}: CrossTableProps) {
  const name: TableName = caption !== undefined ? { caption } : { ariaLabel: ariaLabel ?? "" };
  const rating = labels.rating !== undefined;
  // While the rows are read there are no competitors' columns to draw.
  const columns = loading ? [] : rows;
  const colSpan = 2 + (rating ? 1 : 0) + columns.length + 1 + tieBreaks.length;
  // Only the rows are paged: every competitor keeps its column.
  const { shown, page } = pageOfRows(rows, paging);

  return (
    <Box data-testid={testId} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
      <TableFrame testId={`${testId}-frame`} density={density} stickyHeader={stickyHeader} busy={loading} {...name}>
        <TableHead>
          <TableRow>
            <CompetitorHeadingCells labels={labels} />
            {columns.map((column) => (
              <HeadingCell
                key={column.id}
                header={<bdi dir="ltr">{column.rank}</bdi>}
                name={column.name}
                align="center"
                testId={`${testId}-column-${column.id}`}
              />
            ))}
            <ScoreHeadingCells points={labels.points} tieBreaks={tieBreaks} />
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <LoadingTableRow colSpan={colSpan} testId={`${testId}-loading`}>
              {loadingLabel}
            </LoadingTableRow>
          ) : rows.length === 0 ? (
            <EmptyTableRow colSpan={colSpan} testId={`${testId}-empty`}>
              {emptyLabel}
            </EmptyTableRow>
          ) : (
            shown.map((row) => {
              const rowTest = `${testId}-row-${row.id}`;
              return (
                <TableRow key={row.id} hover data-testid={rowTest}>
                  <CompetitorCells competitor={row} rating={rating} testId={rowTest} />
                  {columns.map((column) =>
                    column.id === row.id ? (
                      // The diagonal: nobody plays themselves.
                      <TableCell key={column.id} data-testid={`${testId}-cell-${row.id}-${column.id}`} sx={{ bgcolor: "action.selected" }} />
                    ) : (
                      <ResultsCell key={column.id} results={row.results[column.id] ?? []} testId={`${testId}-cell-${row.id}-${column.id}`} />
                    ),
                  )}
                  <ScoreCells competitor={row} tieBreaks={tieBreaks} formatPoints={formatPoints} testId={rowTest} />
                </TableRow>
              );
            })
          )}
        </TableBody>
      </TableFrame>
      {paging !== undefined && !loading && rows.length > 0 && (
        <TablePager
          count={rows.length}
          page={page}
          rowsPerPage={paging.rowsPerPage}
          onPageChange={paging.onPageChange}
          onRowsPerPageChange={paging.onRowsPerPageChange}
          labelRowsPerPage={paging.labelRowsPerPage}
          labelDisplayedRows={paging.labelDisplayedRows}
          testId={`${testId}-pager`}
        />
      )}
      {/* A legend explains the rows' glyphs: with no row to show there is nothing to explain. */}
      {legend !== undefined && legend.length > 0 && !loading && rows.length > 0 && (
        <ResultLegend entries={legend} testId={`${testId}-legend`} />
      )}
    </Box>
  );
}

export default CrossTable;
