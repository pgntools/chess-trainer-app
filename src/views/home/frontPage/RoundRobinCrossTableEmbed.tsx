import { useTranslation } from "react-i18next";

import { RoundRobinCrossTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { ROUND_ROBIN_TIE_BREAKS } from "../../../lib/tournament";
import { usePgnTournament } from "./pgnTournament";

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
 */

type RoundRobinCrossTableEmbedProps = {
  /** The tournament's games as PGN — only their tags are read. */
  pgn: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
};

export function RoundRobinCrossTableEmbed({ pgn, density }: RoundRobinCrossTableEmbedProps) {
  const { t } = useTranslation();
  const read = usePgnTournament(pgn, ROUND_ROBIN_TIE_BREAKS);
  if (read.tournament === undefined) {
    return (
      <InlineAlert severity="warning" testId="tournament-crosstable-unreadable" detail={read.error}>
        {t("tournament.embed.unreadable")}
      </InlineAlert>
    );
  }
  return (
    <RoundRobinCrossTable
      tournament={read.tournament}
      ariaLabel={t("tournament.embed.crosstable", { event: read.event ?? t("tournament.embed.untitled") })}
      density={density}
      testId={`tournament-crosstable-${read.slug}`}
    />
  );
}
