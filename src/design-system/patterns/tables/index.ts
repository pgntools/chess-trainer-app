/**
 * **The Tables patterns' public surface** (CTA-110) — a block or a screen
 * imports this section's patterns from here and nowhere deeper: `DataTable`,
 * the two competition tables, `StandingsTable` and `CrossTable`
 * (CTA-120), and a knockout's `Bracket` (CTA-128). The reference is `docs/design/sections/patterns/tables.md`.
 */
export * from "./DataTable";
export * from "./StandingsTable";
export * from "./CrossTable";
// CTA-128: a knockout's bracket — a column per round, a box per match.
export * from "./Bracket";
// What the two competition tables share (CTA-120): a competitor, a result, a tie-break column.
export type { ColumnHeading, Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "./competitors";
// Every table pattern's optional paging (CTA-128): one shape, `DataTable`'s.
export type { TablePaging } from "./paging";
