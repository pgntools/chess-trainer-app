import { Fragment } from "react";
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";

import { visuallyHidden } from "../../components/a11y";
import { NumberCell, ResultMark } from "../../components/tables";
import type { ColumnHeading, Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "./competitors";

/*
  The cells `StandingsTable` and `CrossTable` both draw (CTA-120): a
  competitor's rank, name and rating at a row's start, the points and the
  tie-breaks at its end, a cell of results between, and the legend under the
  table. One place, so the two tables cannot drift apart.
*/

/** A column that takes only the room its content needs — the name's column gets the rest. */
const NARROW = { width: "1%", whiteSpace: "nowrap" } as const;

type HeadingCellProps = ColumnHeading & {
  align?: "start" | "center" | "end";
  testId?: string;
};

/**
 * A column's header: its words — or, for an abbreviation, the words in view
 * and its full `name` read in their place, shown on hover.
 */
export function HeadingCell({ header, name, align = "start", testId }: HeadingCellProps) {
  return (
    <TableCell title={name} data-testid={testId} sx={{ ...NARROW, textAlign: align }}>
      {name === undefined ? (
        header
      ) : (
        <Box component="span" sx={{ position: "relative" }}>
          <span aria-hidden="true">{header}</span>
          <Box component="span" sx={visuallyHidden}>
            {name}
          </Box>
        </Box>
      )}
    </TableCell>
  );
}

/** The headers of a row's start: the rank, the name, and the rating where the table has one. */
export function CompetitorHeadingCells({ labels }: { labels: CompetitorLabels }) {
  return (
    <>
      <HeadingCell {...labels.rank} align="end" />
      <TableCell>{labels.name}</TableCell>
      {labels.rating !== undefined && <HeadingCell {...labels.rating} align="end" />}
    </>
  );
}

type CompetitorCellsProps = {
  competitor: Competitor;
  /** The table has a rating column. */
  rating: boolean;
  /** The row's test id — the name's cell is `-name`. */
  testId: string;
};

/**
 * A row's start: the rank, the name as the **row's header** (`th
 * scope="row"`, so a screen reader names the competitor with every cell of
 * the row) with its prefix and suffix muted around it, and the rating.
 */
export function CompetitorCells({ competitor, rating, testId }: CompetitorCellsProps) {
  const { rank, name, prefix, suffix } = competitor;
  return (
    <>
      <NumberCell value={rank} secondary />
      <TableCell component="th" scope="row" data-testid={`${testId}-name`} sx={{ whiteSpace: "nowrap" }}>
        {prefix !== undefined && (
          <>
            <Box component="bdi" dir="auto" sx={{ color: "text.secondary" }}>
              {prefix}
            </Box>{" "}
          </>
        )}
        <bdi dir="auto">{name}</bdi>
        {suffix !== undefined && (
          <>
            {" "}
            <Box component="bdi" dir="auto" sx={{ color: "text.secondary", typography: "caption" }}>
              {suffix}
            </Box>
          </>
        )}
      </TableCell>
      {rating && <NumberCell value={competitor.rating} secondary />}
    </>
  );
}

/** The headers of a row's end: the points, then each tie-break. */
export function ScoreHeadingCells({ points, tieBreaks }: { points: ColumnHeading; tieBreaks: readonly TieBreakColumn[] }) {
  return (
    <>
      <HeadingCell {...points} align="end" />
      {tieBreaks.map((column) => (
        <HeadingCell key={column.id} header={column.header} name={column.name} align="end" />
      ))}
    </>
  );
}

type ScoreCellsProps = {
  competitor: Competitor;
  tieBreaks: readonly TieBreakColumn[];
  formatPoints?: (points: number) => string;
  /** The row's test id — the points are `-points`, a tie-break `-<column id>`. */
  testId: string;
};

/** A row's end: the points, then each tie-break's value, muted — a dash where a row has none. */
export function ScoreCells({ competitor, tieBreaks, formatPoints, testId }: ScoreCellsProps) {
  return (
    <>
      <NumberCell value={competitor.points} format={formatPoints} testId={`${testId}-points`} />
      {tieBreaks.map((column) => (
        <NumberCell
          key={column.id}
          value={competitor.tieBreaks?.[column.id]}
          format={column.format}
          secondary
          testId={`${testId}-${column.id}`}
        />
      ))}
    </>
  );
}

type ResultsCellProps = {
  /** Every result the cell holds, in order — one in a round, two between the same pair of a double round robin. */
  results: readonly ResultEntry[];
  testId: string;
};

/**
 * A cell of results: each a `ResultMark`, a space between — the space is
 * what keeps two marks' words apart for a screen reader too.
 */
export function ResultsCell({ results, testId }: ResultsCellProps) {
  return (
    <TableCell data-testid={testId} sx={{ ...NARROW, textAlign: "center" }}>
      {results.map((result, index) => (
        <Fragment key={index}>
          {index > 0 && " "}
          <ResultMark outcome={result.outcome} label={result.label} glyph={result.glyph} />
        </Fragment>
      ))}
    </TableCell>
  );
}

/** Under the table, out of its scroll: what the glyphs that are not numbers mean — "* = unfinished game". */
export function ResultLegend({ entries, testId }: { entries: readonly ResultEntry[]; testId: string }) {
  return (
    <Box data-testid={testId} sx={{ flexShrink: 0, display: "flex", flexWrap: "wrap", columnGap: 3, typography: "caption" }}>
      {entries.map((entry) => (
        <ResultMark key={entry.outcome} legend outcome={entry.outcome} label={entry.label} />
      ))}
    </Box>
  );
}
