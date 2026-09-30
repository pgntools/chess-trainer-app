/**
 * **The Tables patterns' public surface** (CTA-110) — a block or a screen
 * imports this section's patterns from here and nowhere deeper: `DataTable`,
 * and the two competition tables, `StandingsTable` and `CrossTable`
 * (CTA-120). The reference is `docs/design/sections/patterns/tables.md`.
 */
export * from "./DataTable";
export * from "./StandingsTable";
export * from "./CrossTable";
// What the two competition tables share (CTA-120): a competitor, a result, a tie-break column.
export type { ColumnHeading, Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "./competitors";
