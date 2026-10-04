import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { StandingsTable, type StandingsRow, type TablePaging } from "../../../design-system/patterns/tables";
import type { Match } from "../../../lib/match";
import { formatScore, playerMarks, tournamentLabels, tournamentLegend, type TournamentLinks } from "../tournamentTable";

export type MatchTableProps = TournamentLinks & {
  /** The match — `matchOf(headers)` (`lib/match.ts`). `undefined` while its games are read. */
  match: Match | undefined;
  /** The table's accessible name — the event's ("Clutch Chess: The Legends 2026 — the match"). */
  ariaLabel: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Cut the rows into pages, the pager under the table — for a long one (CTA-128). Absent, every row shows. */
  paging?: TablePaging;
  /**
   * The table's root, and every id under it (`StandingsTable`'s): `-row-<player id>`
   * (`-name`, `-points`), a game's cell `-round-<player id>-<game>`, `-loading`, `-empty`, `-legend`.
   */
  testId: string;
};

/**
 * **A match between two players** (CTA-128) — `StandingsTable` over a
 * `Match`: two rows, the one ahead first, each with its title, rating and
 * federation; **a column per game**, in order, each cell the result for its
 * row's player (the game, the colour and the opponent in its words); the
 * score at the end, halves as `½`. Every game counts one point, as its
 * `Result` tag says.
 *
 * Presentational: the match is a prop (a screen reads the games and calls
 * `matchOf`). Its words are the app's (`tournament.*`).
 */
function MatchTable({ match, ariaLabel, density, paging, playerLink, gameLink, testId }: MatchTableProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const rows = useMemo<StandingsRow[]>(() => {
    if (match === undefined) return [];
    return match.players.map((player, index) => {
      const opponent = match.players[1 - index].name;
      return {
        id: player.id,
        rank: index + 1,
        name: player.name,
        ...playerMarks(t, language, player),
        link: playerLink?.(player),
        rating: player.rating,
        points: match.points[index],
        rounds: match.games.map((game, number) => [
          {
            outcome: game.outcomes[index],
            link: gameLink?.(game.game),
            label: t(`tournament.match.result.${game.colors[index]}`, {
              game: number + 1,
              opponent,
              result: t(`tournament.result.${game.outcomes[index]}`),
            }),
          },
        ]),
      };
    });
  }, [match, t, language, playerLink, gameLink]);

  const legend = useMemo(() => tournamentLegend(t, { unfinished: (match?.unfinished ?? 0) > 0, none: false }), [match, t]);

  return (
    <StandingsTable
      rows={rows}
      rounds={match?.games.length ?? 0}
      labels={{ ...tournamentLabels(t), round: (game) => t("tournament.match.game", { game }) }}
      formatPoints={formatScore}
      legend={legend}
      loading={match === undefined}
      loadingLabel={t("tournament.loading")}
      emptyLabel={t("tournament.empty")}
      density={density}
      paging={paging}
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

export default MatchTable;
