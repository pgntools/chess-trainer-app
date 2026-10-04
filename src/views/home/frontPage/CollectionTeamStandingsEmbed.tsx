import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { TeamStandingsTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { teamPlayersOf, teamTournamentOf } from "../../../lib/teamTournament";
import { useCollectionEvent } from "./collectionEvent";
import { useEmbedPaging } from "./pgnTournament";

/**
 * **A team event from the Library** (CTA-128) —
 * `<CollectionTeamStandingsTable _id="/library/<collection>" />`: a
 * collection of a team Swiss or round robin (an Olympiad) drawn as its
 * standings, read from its games' tags (`teamTournamentOf`) as
 * `<TeamStandingsTable pgn>` reads a PGN.
 *
 * - **`teamLink`** (default on) makes each team's name a link to the
 *   collection's table filtered by its players — every name its games give
 *   it (the Library filters by player, not by team).
 * - **`gameLink`** (default on) makes each round's match a link to its first
 *   board on the Library's board; the board's Next steps through the match's
 *   other boards, which follow it in the file. Its back button returns to the
 *   article.
 * - `density` and `rowsPerPage` as the other tables'.
 *
 * A collection whose games name no teams says so. Its ids are
 * `tournament-collection-<collection>-team`, the block's under them.
 */

type CollectionTeamStandingsEmbedProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  /** Each team's name a link to the collection's games of its players. Default on. */
  teamLink?: boolean;
  /** Each round's match a link to its first board. Default on. */
  gameLink?: boolean;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows — 25, 50, 100 or 250. Absent, every row shows. */
  rowsPerPage?: number | string;
};

export function CollectionTeamStandingsEmbed({ _id, teamLink = true, gameLink = true, density, rowsPerPage }: CollectionTeamStandingsEmbedProps) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(rowsPerPage);
  const { headers, event, missing, testId, toPlayers, toGame } = useCollectionEvent(_id);

  const tournament = useMemo(() => (headers === undefined ? undefined : teamTournamentOf(headers)), [headers]);
  const players = useMemo(() => (headers === undefined ? undefined : teamPlayersOf(headers)), [headers]);
  const toTeam = useCallback((team: string) => toPlayers(players?.get(team) ?? []), [toPlayers, players]);

  if (missing) {
    return (
      <InlineAlert severity="info" testId={`${testId}-team-missing`} detail={_id}>
        {t("tournament.embed.collectionMissing")}
      </InlineAlert>
    );
  }
  if (headers !== undefined && headers.length > 0 && tournament?.games === 0) {
    return (
      <InlineAlert severity="warning" testId={`${testId}-team-unreadable`} detail={_id}>
        {t("tournament.embed.notATeamEvent")}
      </InlineAlert>
    );
  }
  return (
    <TeamStandingsTable
      tournament={tournament}
      ariaLabel={t("tournament.embed.standings", { event: event ?? t("tournament.embed.untitled") })}
      density={density}
      paging={paging}
      teamLink={teamLink ? toTeam : undefined}
      gameLink={gameLink ? toGame : undefined}
      testId={`${testId}-team`}
    />
  );
}
