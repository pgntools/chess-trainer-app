import { useTranslation } from "react-i18next";

import { TeamStandingsTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { teamTournamentOf } from "../../../lib/teamTournament";
import { usePgnEvent } from "./pgnTournament";

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
 */

type TeamStandingsEmbedProps = {
  /** The event's games as PGN — only their tags are read. */
  pgn: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
};

export function TeamStandingsEmbed({ pgn, density }: TeamStandingsEmbedProps) {
  const { t } = useTranslation();
  const read = usePgnEvent(pgn, teamTournamentOf);
  if (read.made === undefined) {
    return (
      <InlineAlert severity="warning" testId="tournament-team-standings-unreadable" detail={read.error}>
        {t("tournament.embed.unreadable")}
      </InlineAlert>
    );
  }
  return (
    <TeamStandingsTable
      tournament={read.made}
      ariaLabel={t("tournament.embed.standings", { event: read.event ?? t("tournament.embed.untitled") })}
      density={density}
      testId={`tournament-team-standings-${read.slug}`}
    />
  );
}
