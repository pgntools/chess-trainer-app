import { useTranslation } from "react-i18next";

import { MatchTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { matchOf } from "../../../lib/match";
import { usePgnEvent, useEmbedPaging, usePgnSource, type PgnSourceProps } from "./pgnTournament";

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
 */

type MatchTableEmbedProps = PgnSourceProps & {
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows, this many a page — 25, 50, 100 or 250 (CTA-128). Absent, every row shows. */
  rowsPerPage?: number | string;
};

export function MatchTableEmbed({ pgn, load, density, rowsPerPage }: MatchTableEmbedProps) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(rowsPerPage);
  const read = usePgnEvent(usePgnSource({ pgn, load }), matchOf, "not a match between two players");
  if (read.loading) {
    // The file is a chunk of its own, on its way: the table's own "reading" state, named until its event is known.
    return (
      <MatchTable
        match={undefined}
        ariaLabel={t("tournament.embed.match", { event: t("tournament.embed.untitled") })}
        density={density}
        testId="tournament-match-loading"
      />
    );
  }
  if (read.made === undefined) {
    return (
      <InlineAlert severity="warning" testId="tournament-match-unreadable" detail={read.error}>
        {read.error === "not a match between two players" ? t("tournament.embed.notAMatch") : t("tournament.embed.unreadable")}
      </InlineAlert>
    );
  }
  return (
    <MatchTable
      match={read.made}
      ariaLabel={t("tournament.embed.match", { event: read.event ?? t("tournament.embed.untitled") })}
      density={density}
      paging={paging}
      testId={`tournament-match-${read.slug}`}
    />
  );
}
