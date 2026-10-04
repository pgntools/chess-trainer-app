import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { KnockoutBracket } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { knockoutOf } from "../../../lib/knockout";
import { teamPlayersOf } from "../../../lib/teamTournament";
import type { TournamentPlayer } from "../../../lib/tournament";
import { useCollectionEvent } from "./collectionEvent";

/**
 * **A knockout from the Library** (CTA-128) —
 * `<CollectionKnockoutBracket _id="/library/<collection>" />`: a collection
 * drawn as its knockout's bracket, read from its games' tags (`knockoutOf`)
 * as `<KnockoutBracket pgn>` reads a PGN — a team knockout too, where every
 * game names its teams. `<CollectionDoubleEliminationBracket>` is the same
 * with a losers' bracket, from round 51 unless `losersFromRound` says
 * otherwise.
 *
 * - **`playerLink`** (default on) makes each name a link to the collection's
 *   table filtered by that player — a team's name, by every one of its
 *   players (the Library filters by player, not by team).
 * - **`gameLink`** (default on) adds each match's games under it, a link
 *   each to its game on the Library's board (whose back button returns to
 *   the article) — a team match's legs, each to its first board.
 * - `density="dense"` tightens the boxes.
 *
 * Its ids are `tournament-collection-<collection>-knockout` (a double
 * elimination's `-doubleElimination`), the block's under them.
 */

type CollectionKnockoutEmbedProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  /** Where a double elimination's losers' bracket starts — TWIC's `51`. Absent, one bracket. */
  losersFromRound?: number | string;
  /** Each name a link to the collection's games of that player — or team. Default on. */
  playerLink?: boolean;
  /** Each match's games as links under it, to the Library's board. Default on. */
  gameLink?: boolean;
  /** `dense` tightens the match boxes. */
  density?: "normal" | "dense";
};

/** A number from MDX, which may arrive as text ("51"). */
const roundOf = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === "") return undefined;
  const round = Number(value);
  return Number.isInteger(round) && round > 0 ? round : undefined;
};

/** The bracket of a collection — one bracket, or two from `losersFromRound`. `kind` is its ids' word. */
function CollectionBracket({
  _id,
  losersFromRound,
  playerLink = true,
  gameLink = true,
  density,
  kind,
}: CollectionKnockoutEmbedProps & { kind: "knockout" | "doubleElimination" }) {
  const { t } = useTranslation();
  const { headers, event, missing, testId, toPlayers, toGame } = useCollectionEvent(_id);
  const losers = roundOf(losersFromRound);

  const knockout = useMemo(() => (headers === undefined ? undefined : knockoutOf(headers, { losersFromRound: losers })), [headers, losers]);
  const teamPlayers = useMemo(() => (knockout?.teams && headers !== undefined ? teamPlayersOf(headers) : undefined), [knockout, headers]);
  // A player's own name; a team's every player.
  const toCompetitor = useCallback(
    (competitor: TournamentPlayer) => toPlayers(teamPlayers?.get(competitor.id) ?? [competitor.name]),
    [toPlayers, teamPlayers],
  );

  if (missing) {
    return (
      <InlineAlert severity="info" testId={`${testId}-${kind}-missing`} detail={_id}>
        {t("tournament.embed.collectionMissing")}
      </InlineAlert>
    );
  }
  return (
    <KnockoutBracket
      knockout={knockout}
      ariaLabel={t("tournament.embed.bracket", { event: event ?? t("tournament.embed.untitled") })}
      density={density}
      playerLink={playerLink ? toCompetitor : undefined}
      gameLink={gameLink ? toGame : undefined}
      testId={`${testId}-${kind}`}
    />
  );
}

/** `<CollectionKnockoutBracket>` — a knockout's one bracket; `losersFromRound` makes it a double elimination. */
export function CollectionKnockoutEmbed(props: CollectionKnockoutEmbedProps) {
  return <CollectionBracket {...props} kind="knockout" />;
}

/** `<CollectionDoubleEliminationBracket>` — the winners' bracket over the losers', which starts at round 51 unless `losersFromRound` says otherwise. */
export function CollectionDoubleEliminationEmbed({ losersFromRound = 51, ...props }: CollectionKnockoutEmbedProps) {
  return <CollectionBracket {...props} losersFromRound={losersFromRound} kind="doubleElimination" />;
}
