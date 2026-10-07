import { EmbedSource, type EmbedSourceProps } from "./embedSource";
import { TeamStandingsView } from "./tournamentEmbedViews";

/**
 * **A team tournament's standings in an article** (CTA-128) —
 * `<TeamStandingsTable pgn={games} />` (the MDX name; the block is
 * `src/blocks/tables/TeamStandingsTable`): the event's games as one PGN,
 * each naming its teams (`WhiteTeam`, `BlackTeam`), read for their tags
 * alone (`teamTournamentOf`) — a row per team, a round's cell its board
 * points, ranked by match points (2 a win, 1 a draw), then board points.
 *
 * Named after the `Event` tag ("FIDE World Rapid Team — standings"); its
 * ids are `tournament-team-standings-<event, slugified>`. A PGN with no game
 * in it says so.
 *
 * **Any source** (CTA-140): `pgn={games}` (or `load`) for a PGN of the
 * article's own, or `src` — a Library collection's address
 * (`src="/library/<collection>"`), or any other the app keeps
 * (`lib/embedSource.ts`) — read by `<EmbedSource>`; a Library source's
 * names and results link into the Library (`tournamentEmbedViews.tsx`).
 */

type TeamStandingsEmbedProps = EmbedSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
  /** A Library source: each team's name a link to the collection's games of its players. Default on. */
  teamLink?: boolean;
  /** A Library source: each round's match a link to its first board. Default on. */
  gameLink?: boolean;
};

export function TeamStandingsEmbed({ src, pgn, load, ...table }: TeamStandingsEmbedProps) {
  return (
    <EmbedSource src={src} pgn={pgn} load={load}>
      {(read) => <TeamStandingsView read={read} {...table} />}
    </EmbedSource>
  );
}
