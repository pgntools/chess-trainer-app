import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CrossTable, type CrossTableRow } from "../../../design-system/patterns/tables";
import { gamesBetween, type Tournament } from "../../../lib/tournament";
import { competitorOf, formatPoints, playerNames, resultEntryOf, tieBreakColumns, tournamentLabels, tournamentLegend } from "../tournamentTable";

export type RoundRobinCrossTableProps = {
  /**
   * The tournament — `tournamentOf(headers, ROUND_ROBIN_TIE_BREAKS)`
   * (`lib/tournament.ts`), ranked by points, then Sonneborn-Berger.
   * `undefined` while its games are read.
   */
  tournament: Tournament | undefined;
  /** The table's accessible name — the event's ("FIDE Candidates 2026 — crosstable"). */
  ariaLabel: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /**
   * The table's root, and every id under it (`CrossTable`'s): `-frame`,
   * `-row-<player id>` (`-name`, `-points`, `-sonnebornBerger`), a player's
   * column `-column-<player id>`, the cell of a row against a column
   * `-cell-<row's id>-<column's id>`, `-loading`, `-empty`, `-legend`.
   */
  testId: string;
};

/**
 * **A round robin's crosstable** (CTA-120) — `CrossTable` over a
 * `Tournament`: a row and a column per player in rank order, the title
 * before the name and the federation after it, the rating, the cell where two
 * players meet holding **every game between them** in round order (two in a
 * double round robin), then the points and the tie-breaks the tournament was
 * ranked by (Sonneborn-Berger).
 *
 * A cell shows **the results only**; each one's round, colour and opponent
 * are in its name. `*` is an unfinished game, and a dash a pair the file
 * holds no game of — an unfinished tournament is cells with fewer results
 * than the rest. The legend under it explains whichever of the two it shows.
 *
 * Presentational: the tournament is a prop (a screen reads the games and
 * calls `tournamentOf`). Its words are the app's (`tournament.*`).
 */
function RoundRobinCrossTable({ tournament, ariaLabel, density, testId }: RoundRobinCrossTableProps) {
  const { t } = useTranslation();

  const rows = useMemo<CrossTableRow[]>(() => {
    if (tournament === undefined) return [];
    const names = playerNames(tournament);
    return tournament.standings.map((standing) => ({
      ...competitorOf(standing),
      results: Object.fromEntries(
        tournament.standings
          .filter((other) => other !== standing)
          .map(({ player }) => {
            const games = gamesBetween(standing, player.id);
            return [
              player.id,
              games.length === 0
                ? [{ outcome: "none" as const, label: t("tournament.noGameAgainst", { opponent: player.name }) }]
                : games.map((game) => resultEntryOf(t, game, names)),
            ];
          }),
      ),
    }));
  }, [tournament, t]);

  const legend = useMemo(
    () =>
      tournamentLegend(t, {
        unfinished: (tournament?.unfinished ?? 0) > 0,
        none: rows.some((row) => Object.values(row.results).some((results) => results[0]?.outcome === "none")),
      }),
    [tournament, rows, t],
  );

  return (
    <CrossTable
      rows={rows}
      labels={tournamentLabels(t)}
      tieBreaks={tieBreakColumns(t, tournament?.tieBreaks ?? [])}
      formatPoints={formatPoints}
      legend={legend}
      loading={tournament === undefined}
      loadingLabel={t("tournament.loading")}
      emptyLabel={t("tournament.empty")}
      density={density}
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

export default RoundRobinCrossTable;
