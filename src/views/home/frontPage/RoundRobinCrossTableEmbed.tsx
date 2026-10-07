import { EmbedSource, type EmbedSourceProps } from "./embedSource";
import { StandingsView } from "./tournamentEmbedViews";

/**
 * **A round robin's crosstable in an article** (CTA-128) —
 * `<RoundRobinCrossTable pgn={games} />` (the MDX name; the block is
 * `src/blocks/tables/RoundRobinCrossTable`): the tournament's games as one
 * PGN, usually imported beside the article (`import games from
 * "./event.pgn?raw"`), read for their tags alone and ranked by points, then
 * Sonneborn-Berger (`ROUND_ROBIN_TIE_BREAKS`). A row and a column per
 * player; where two meet, every game between them — one in a single round
 * robin, two in a double.
 *
 * The table is named after the games' `Event` tag ("FIDE Candidates 2026 —
 * crosstable"), and its ids are `tournament-crosstable-<event, slugified>`,
 * so a page shows each tournament's crosstable once. A PGN with no game in it
 * says so.
 *
 * **Any source** (CTA-140): `pgn={games}` (or `load`) for a PGN of the
 * article's own, or `src` — a Library collection's address
 * (`src="/library/<collection>"`), or any other the app keeps
 * (`lib/embedSource.ts`) — read by `<EmbedSource>`; a Library source's
 * names and results link into the Library (`tournamentEmbedViews.tsx`).
 */

type RoundRobinCrossTableEmbedProps = EmbedSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
  /** A Library source: each name a link to the collection's games of that player. Default on. */
  playerLink?: boolean;
  /** A Library source: each result a link to its game on the Library's board. Default on. */
  gameLink?: boolean;
};

export function RoundRobinCrossTableEmbed({ src, pgn, load, ...table }: RoundRobinCrossTableEmbedProps) {
  return (
    <EmbedSource src={src} pgn={pgn} load={load}>
      {(read) => <StandingsView read={read} format="roundRobin" {...table} />}
    </EmbedSource>
  );
}
