import { EmbedSource, type EmbedSourceProps } from "./embedSource";
import { KnockoutView } from "./tournamentEmbedViews";

/**
 * **A knockout's bracket in an article** (CTA-128) —
 * `<KnockoutBracket pgn={games} />` (the MDX name; the block is
 * `src/blocks/tables/KnockoutBracket`): the event's games as one PGN, read
 * for their tags alone (`knockoutOf`) — `Round "R.G"` is round R, game G of
 * its match, tiebreaks included. A file whose every game names its teams is
 * a team knockout, scored in legs.
 *
 * `losersFromRound="51"` makes it a **double elimination**: rounds from 51
 * up are the losers' bracket, as The Week in Chess numbers them. The bracket
 * is named after the `Event` tag ("ch-NED KO 2026 — bracket"), and its ids
 * are `tournament-bracket-<event, slugified>`. A PGN with no game in it says
 * so.
 *
 * **Any source** (CTA-140): `pgn={games}` (or `load`) for a PGN of the
 * article's own, or `src` — a Library collection's address
 * (`src="/library/<collection>"`), or any other the app keeps
 * (`lib/embedSource.ts`) — read by `<EmbedSource>`; a Library source's
 * names and results link into the Library (`tournamentEmbedViews.tsx`).
 */

type KnockoutBracketEmbedProps = EmbedSourceProps & {
  /** Where a double elimination's losers' bracket starts — TWIC's `51`. Absent, one bracket. */
  losersFromRound?: number | string;
  /** `dense` tightens the match boxes. */
  density?: "normal" | "dense";
  /** A Library source: each name a link to the collection's games of that player — or team. Default on. */
  playerLink?: boolean;
  /** A Library source: each match's games as links under it, to the Library's board. Default on. */
  gameLink?: boolean;
};

export function KnockoutBracketEmbed({ src, pgn, load, ...table }: KnockoutBracketEmbedProps) {
  return (
    <EmbedSource src={src} pgn={pgn} load={load}>
      {(read) => <KnockoutView read={read} {...table} />}
    </EmbedSource>
  );
}
