import { EmbedSource } from "./embedSource";
import { TeamStandingsView } from "./tournamentEmbedViews";

/**
 * **A team event from the Library — the older name** (CTA-128; an alias
 * since CTA-140) — `<CollectionTeamStandingsTable _id="/library/<collection>" />`
 * is `<TeamStandingsTable src="/library/<collection>" />`. Kept for the
 * articles written with it; the MDX editor writes the new form. Its ids are
 * `tournament-collection-<collection>-team`, the block's under them.
 */

type CollectionTeamStandingsEmbedProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  teamLink?: boolean;
  gameLink?: boolean;
  density?: "normal" | "dense";
  rowsPerPage?: number | string;
};

export function CollectionTeamStandingsEmbed({ _id, ...table }: CollectionTeamStandingsEmbedProps) {
  return <EmbedSource src={_id}>{(read) => <TeamStandingsView read={read} {...table} />}</EmbedSource>;
}
