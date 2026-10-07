import { EmbedSource, type EmbedSourceProps } from "./embedSource";
import { StandingsView } from "./tournamentEmbedViews";

/**
 * **A Swiss tournament's standings in an article** (CTA-128) —
 * `<SwissStandingsTable pgn={games} />` (the MDX name; the block is
 * `src/blocks/tables/SwissStandingsTable`): the tournament's games as one
 * PGN, usually imported beside the article (`import games from
 * "./event.pgn?raw"`), read for their tags alone and ranked by points, then
 * Buchholz, then Sonneborn-Berger (`SWISS_TIE_BREAKS`). A row per player, a
 * cell per round.
 *
 * The table is named after the games' `Event` tag ("20th Werner-Obermeyer —
 * standings"), and its ids are `tournament-standings-<event, slugified>`, so
 * a page shows each tournament's standings once. It shows what the file
 * holds — a file of the top boards only is the standings of those games
 * (`lib/tournament.ts`). A PGN with no game in it says so.
 *
 * **Any source** (CTA-140): `pgn={games}` (or `load`) for a PGN of the
 * article's own, or `src` — a Library collection's address
 * (`src="/library/<collection>"`), or any other the app keeps
 * (`lib/embedSource.ts`) — read by `<EmbedSource>`; a Library source's
 * names and results link into the Library (`tournamentEmbedViews.tsx`).
 */

type SwissStandingsEmbedProps = EmbedSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
  /** A Library source: each name a link to the collection's games of that player. Default on. */
  playerLink?: boolean;
  /** A Library source: each result a link to its game on the Library's board. Default on. */
  gameLink?: boolean;
};

export function SwissStandingsEmbed({ src, pgn, load, ...table }: SwissStandingsEmbedProps) {
  return (
    <EmbedSource src={src} pgn={pgn} load={load}>
      {(read) => <StandingsView read={read} format="swiss" {...table} />}
    </EmbedSource>
  );
}
