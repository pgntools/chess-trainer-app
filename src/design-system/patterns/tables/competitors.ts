import type { VisibleLabel } from "../../components/a11y";
import type { ResultMarkProps } from "../../components/tables";

/*
  What the two competition tables share (CTA-120) — `StandingsTable` and
  `CrossTable` are separate components, but a competitor, a result and a
  tie-break column are the same data in both. Generic: a competitor is
  anything ranked by points — the patterns know no chess.
*/

/**
 * One result in a cell: its outcome (the glyph and its tone) and the words
 * read in its place — and, where the outcome's own glyph will not do, the
 * text shown instead (a team match's board points, CTA-128).
 */
export type ResultEntry = Pick<ResultMarkProps, "outcome" | "label" | "glyph">;

/**
 * A column's heading: its words, and — where they are an abbreviation
 * ("Pts", "BH") — the full name a screen reader reads in their place and a
 * pointer sees on hover ("Points", "Buchholz").
 */
export type ColumnHeading = { header: VisibleLabel; name?: string };

/**
 * **A tie-break column** — data, so a caller adds or removes one without
 * changing the table: its heading, and how its values are written. Each
 * row carries its value under the column's `id`.
 */
export type TieBreakColumn = ColumnHeading & {
  id: string;
  /** How a value is written ("30.5", "22.25"). Absent, as it is. */
  format?: (value: number) => string;
};

/** A row's competitor, and what it scored — the columns both tables show. */
export type Competitor = {
  /** Unique in the table: the row's key and its test ids. */
  id: string;
  rank: number;
  /** The competitor's own name — `dir="auto"`. */
  name: string;
  /** A few words before the name, muted — a title. */
  prefix?: string;
  /** A few words after the name, muted — where they are from. */
  suffix?: string;
  /** Shown in its own column when the table has the column's heading (`labels.rating`). */
  rating?: number;
  points: number;
  /** The tie-break columns' values, by column id. A missing one reads as a dash. */
  tieBreaks?: Readonly<Record<string, number | undefined>>;
};

/** The headings of the columns both tables share. */
export type CompetitorLabels = {
  /** "#". */
  rank: ColumnHeading;
  /** "Player" — the row header's column. */
  name: VisibleLabel;
  /** "Rtg". Absent, the table has no rating column. */
  rating?: ColumnHeading;
  /** "Pts". */
  points: ColumnHeading;
};
