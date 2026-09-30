import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { EmptyTableRow, LoadingTableRow, TableFrame, type TableName } from "../../../components/tables";
import { CompetitorCells, CompetitorHeadingCells, HeadingCell, ResultLegend, ResultsCell, ScoreCells, ScoreHeadingCells } from "../competitorCells";
import type { Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "../competitors";

/** A row of the standings: the competitor, and what each round brought. */
export type StandingsRow = Competitor & {
  /**
   * One entry per round, in order — every result of that round (one, as a
   * rule). A round with no game is the caller's own `none` mark, so its
   * words say so; an entry left out is an empty cell.
   */
  rounds: readonly (readonly ResultEntry[])[];
};

export type StandingsTableLabels = CompetitorLabels & {
  /** A round column's full name — "Round 3". Its header shows the number alone. */
  round: (round: number) => string;
};

export type StandingsTableProps = TableName & {
  /** The rows, in rank order — the table shows them as they come. */
  rows: readonly StandingsRow[];
  /** How many round columns there are. */
  rounds: number;
  labels: StandingsTableLabels;
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
  /** The header stays in view while the body scrolls (the default). */
  stickyHeader?: boolean;
  /**
   * The root. The parts: `-frame` (the scrolling region; its table
   * `-frame-table`), `-row-<id>` (its name `-row-<id>-name`, its points
   * `-row-<id>-points`, a tie-break `-row-<id>-<column>`), a round's cell
   * `-round-<id>-<round>`, `-loading`, `-empty`, `-legend`.
   */
  testId: string;
};

/**
 * **A standings table** (CTA-120) — a Swiss tournament's: a row per
 * competitor in rank order, with the rank, the name (a prefix and a suffix
 * muted around it), an optional rating, **one cell per round**, the points
 * and the tie-break columns.
 *
 * - **A round's cell shows the result only** — `1`, `½`, `0`, toned by its
 *   outcome; `*` for an unfinished game; a dash for no game (`ResultMark`).
 *   Who it was against is in the mark's words, read in the glyph's place.
 * - **The tie-breaks are data** (`tieBreaks`, each row's values by column
 *   id): a caller adds or removes one without changing the table.
 * - Every row shows — there is no paging. The one frame scrolls both ways, so
 *   many rows scroll down under a sticky header and many rounds sideways.
 *
 * **Accessible**: named by an `ariaLabel` or a `caption`; busy while
 * `loading`; the name is its row's header and every column has one — an
 * abbreviation read by its full name; a result is read by its words, never
 * told by its colour alone.
 *
 * It fills its parent's flex column (`flex: 1; minHeight: 0`). Generic: it
 * knows no chess — its rows and words arrive as props.
 */
function StandingsTable({
  rows,
  rounds,
  labels,
  tieBreaks = [],
  formatPoints,
  legend,
  loading = false,
  loadingLabel,
  emptyLabel,
  density = "normal",
  stickyHeader = true,
  ariaLabel,
  caption,
  testId,
}: StandingsTableProps) {
  const name: TableName = caption !== undefined ? { caption } : { ariaLabel: ariaLabel ?? "" };
  const roundNumbers = Array.from({ length: rounds }, (_, index) => index + 1);
  const rating = labels.rating !== undefined;
  const colSpan = 2 + (rating ? 1 : 0) + rounds + 1 + tieBreaks.length;

  return (
    <Box data-testid={testId} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
      <TableFrame testId={`${testId}-frame`} density={density} stickyHeader={stickyHeader} busy={loading} {...name}>
        <TableHead>
          <TableRow>
            <CompetitorHeadingCells labels={labels} />
            {roundNumbers.map((round) => (
              <HeadingCell key={round} header={<bdi dir="ltr">{round}</bdi>} name={labels.round(round)} align="center" />
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
            rows.map((row) => {
              const rowTest = `${testId}-row-${row.id}`;
              return (
                <TableRow key={row.id} hover data-testid={rowTest}>
                  <CompetitorCells competitor={row} rating={rating} testId={rowTest} />
                  {roundNumbers.map((round) => (
                    <ResultsCell key={round} results={row.rounds[round - 1] ?? []} testId={`${testId}-round-${row.id}-${round}`} />
                  ))}
                  <ScoreCells competitor={row} tieBreaks={tieBreaks} formatPoints={formatPoints} testId={rowTest} />
                </TableRow>
              );
            })
          )}
        </TableBody>
      </TableFrame>
      {/* A legend explains the rows' glyphs: with no row to show there is nothing to explain. */}
      {legend !== undefined && legend.length > 0 && !loading && rows.length > 0 && (
        <ResultLegend entries={legend} testId={`${testId}-legend`} />
      )}
    </Box>
  );
}

export default StandingsTable;
