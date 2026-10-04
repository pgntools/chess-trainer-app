import { useTranslation } from "react-i18next";

import { RoundRobinCrossTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { ROUND_ROBIN_TIE_BREAKS } from "../../../lib/tournament";
import { usePgnTournament, useEmbedPaging, usePgnSource, type PgnSourceProps } from "./pgnTournament";

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

type RoundRobinCrossTableEmbedProps = PgnSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
};

export function RoundRobinCrossTableEmbed({ pgn, load, density, rowsPerPage }: RoundRobinCrossTableEmbedProps) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(rowsPerPage);
  const read = usePgnTournament(usePgnSource({ pgn, load }), ROUND_ROBIN_TIE_BREAKS);
  if (read.loading) {
    // The file is a chunk of its own, on its way: the table's own "reading" state, named until its event is known.
    return (
      <RoundRobinCrossTable
        tournament={undefined}
        ariaLabel={t("tournament.embed.crosstable", { event: t("tournament.embed.untitled") })}
        density={density}
        testId="tournament-crosstable-loading"
      />
    );
  }
  if (read.made === undefined) {
    return (
      <InlineAlert severity="warning" testId="tournament-crosstable-unreadable" detail={read.error}>
        {t("tournament.embed.unreadable")}
      </InlineAlert>
    );
  }
  return (
    <RoundRobinCrossTable
      tournament={read.made}
      ariaLabel={t("tournament.embed.crosstable", { event: read.event ?? t("tournament.embed.untitled") })}
      density={density}
      paging={paging}
      testId={`tournament-crosstable-${read.slug}`}
    />
  );
}
