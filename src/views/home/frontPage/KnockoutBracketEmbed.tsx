import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { KnockoutBracket } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import type { GameHeaders } from "../../../lib/gameModel";
import { knockoutOf } from "../../../lib/knockout";
import { usePgnEvent, usePgnSource, type PgnSourceProps } from "./pgnTournament";

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
 */

type KnockoutBracketEmbedProps = PgnSourceProps & {
  /** Where a double elimination's losers' bracket starts — TWIC's `51`. Absent, one bracket. */
  losersFromRound?: number | string;
  /** `dense` tightens the match boxes. */
  density?: "normal" | "dense";
};

export function KnockoutBracketEmbed({ pgn, load, losersFromRound, density }: KnockoutBracketEmbedProps) {
  const { t } = useTranslation();
  const losers = losersFromRound === undefined || losersFromRound === "" ? undefined : Number(losersFromRound);
  const read = usePgnEvent(
    usePgnSource({ pgn, load }),
    useCallback((headers: GameHeaders[]) => knockoutOf(headers, { losersFromRound: Number.isFinite(losers) ? losers : undefined }), [losers]),
  );
  if (read.loading) {
    // The file is a chunk of its own, on its way: the table's own "reading" state, named until its event is known.
    return (
      <KnockoutBracket
        knockout={undefined}
        ariaLabel={t("tournament.embed.bracket", { event: t("tournament.embed.untitled") })}
        density={density}
        testId="tournament-bracket-loading"
      />
    );
  }
  if (read.made === undefined) {
    return (
      <InlineAlert severity="warning" testId="tournament-bracket-unreadable" detail={read.error}>
        {t("tournament.embed.unreadable")}
      </InlineAlert>
    );
  }
  return (
    <KnockoutBracket
      knockout={read.made}
      ariaLabel={t("tournament.embed.bracket", { event: read.event ?? t("tournament.embed.untitled") })}
      density={density}
      testId={`tournament-bracket-${read.slug}`}
    />
  );
}
