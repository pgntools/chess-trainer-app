import { useTranslation } from "react-i18next";

import { SwissStandingsTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { SWISS_TIE_BREAKS } from "../../../lib/tournament";
import { usePgnTournament, useEmbedPaging, usePgnSource, type PgnSourceProps } from "./pgnTournament";

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
 */

type SwissStandingsEmbedProps = PgnSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
};

export function SwissStandingsEmbed({ pgn, load, density, rowsPerPage }: SwissStandingsEmbedProps) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(rowsPerPage);
  const read = usePgnTournament(usePgnSource({ pgn, load }), SWISS_TIE_BREAKS);
  if (read.loading) {
    // The file is a chunk of its own, on its way: the table's own "reading" state, named until its event is known.
    return (
      <SwissStandingsTable
        tournament={undefined}
        ariaLabel={t("tournament.embed.standings", { event: t("tournament.embed.untitled") })}
        density={density}
        testId="tournament-standings-loading"
      />
    );
  }
  if (read.made === undefined) {
    return (
      <InlineAlert severity="warning" testId="tournament-standings-unreadable" detail={read.error}>
        {t("tournament.embed.unreadable")}
      </InlineAlert>
    );
  }
  return (
    <SwissStandingsTable
      tournament={read.made}
      ariaLabel={t("tournament.embed.standings", { event: read.event ?? t("tournament.embed.untitled") })}
      density={density}
      paging={paging}
      testId={`tournament-standings-${read.slug}`}
    />
  );
}
