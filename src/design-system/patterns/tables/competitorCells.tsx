import { Fragment } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import TableCell from "@mui/material/TableCell";
import type { Theme } from "@mui/material/styles";

import { visuallyHidden } from "../../components/a11y";
import { linkProps, type LinkTarget } from "../../components/link";
import { MIN_TARGET_PX } from "../../theme";
import { Flag, LabelChip, NumberCell, ResultMark } from "../../components/tables";
import type { ColumnHeading, Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "./competitors";

/*
  The cells `StandingsTable` and `CrossTable` both draw (CTA-120): a
  competitor's rank, name and rating at a row's start, the points and the
  tie-breaks at its end, a cell of results between, and the legend under the
  table. One place, so the two tables cannot drift apart.
*/

/** A link in a competition table (CTA-128): the theme's ring on focus, underlined on hover only — the cell says it is one by its colour and its pointer. */
const linkSx = (theme: Theme) => ({ "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: 1 } });

/** A link's element and its target: react-router's `Link` and its `to`, or an anchor's `href` (`linkProps`). */
const asLink = (link: LinkTarget) => linkProps(link) as Record<string, unknown>;

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
 * the row) with its prefix and suffix muted around it — or a chip before it
 * and a flag after, or before it too when the flag says so (CTA-128) — and
 * the rating.
 */
export function CompetitorCells({ competitor, rating, testId }: CompetitorCellsProps) {
  const { rank, name, prefix, suffix, badge, flag } = competitor;
  const muted = (words: string, small = false) => (
    <Box component="bdi" dir="auto" sx={{ color: "text.secondary", ...(small && { typography: "caption" }) }}>
      {words}
    </Box>
  );
  return (
    <>
      <NumberCell value={rank} secondary />
      <TableCell component="th" scope="row" data-testid={`${testId}-name`} sx={{ whiteSpace: "nowrap" }}>
        {badge !== undefined ? (
          <>
            <LabelChip {...badge} testId={`${testId}-badge`} />{" "}
          </>
        ) : (
          prefix !== undefined && <>{muted(prefix)} </>
        )}
        {flag?.before === true && (
          <>
            <Flag code={flag.code} label={flag.label} fallback={suffix === undefined ? undefined : muted(suffix, true)} testId={`${testId}-flag`} />{" "}
          </>
        )}
        {competitor.link === undefined ? (
          <bdi dir="auto">{name}</bdi>
        ) : (
          <Link {...asLink(competitor.link)} underline="hover" data-testid={`${testId}-link`} sx={linkSx}>
            <bdi dir="auto">{name}</bdi>
          </Link>
        )}
        {flag?.before === true ? null : flag !== undefined ? (
          <>
            {" "}
            <Flag code={flag.code} label={flag.label} fallback={suffix === undefined ? undefined : muted(suffix, true)} testId={`${testId}-flag`} />
          </>
        ) : (
          suffix !== undefined && <> {muted(suffix, true)}</>
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
          {result.link === undefined ? (
            <ResultMark outcome={result.outcome} label={result.label} glyph={result.glyph} />
          ) : (
            // A result that opens its game (CTA-128): a target of 24 px at least, read by the mark's words.
            <Link
              {...asLink(result.link)}
              underline="hover"
              data-testid={`${testId}-link-${index}`}
              sx={(theme: Theme) => ({
                ...linkSx(theme),
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: MIN_TARGET_PX,
                minHeight: MIN_TARGET_PX,
                verticalAlign: "middle",
              })}
            >
              <ResultMark outcome={result.outcome} label={result.label} glyph={result.glyph} />
            </Link>
          )}
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
