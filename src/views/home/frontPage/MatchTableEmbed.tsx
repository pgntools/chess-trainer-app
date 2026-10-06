import { EmbedSource, type EmbedSourceProps } from "./embedSource";
import { StandingsView } from "./tournamentEmbedViews";

/**
 * **A match between two players in an article** (CTA-128) —
 * `<MatchTable pgn={games} />` (the MDX name; the block is
 * `src/blocks/tables/MatchTable`): the match's games as one PGN, read for
 * their tags alone (`matchOf`) — two rows, a column per game, the score.
 * Every game counts a point, as its `Result` says.
 *
 * Named after the `Event` tag ("Clutch Chess: The Legends 2026 — the
 * match"); its ids are `tournament-match-<event, slugified>`. A PGN whose
 * games are not all between the same two players says so.
 *
 * **Any source** (CTA-140): `pgn={games}` (or `load`) for a PGN of the
 * article's own, or `src` — a Library collection's address
 * (`src="/library/<collection>"`), or any other the app keeps
 * (`lib/embedSource.ts`) — read by `<EmbedSource>`; a Library source's
 * names and results link into the Library (`tournamentEmbedViews.tsx`).
 */

type MatchTableEmbedProps = EmbedSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
  /** A Library source: each name a link to the collection's games of that player. Default on. */
  playerLink?: boolean;
  /** A Library source: each result a link to its game on the Library's board. Default on. */
  gameLink?: boolean;
};

export function MatchTableEmbed({ src, pgn, load, ...table }: MatchTableEmbedProps) {
  return (
    <EmbedSource src={src} pgn={pgn} load={load}>
      {(read) => <StandingsView read={read} format="match" {...table} />}
    </EmbedSource>
  );
}
