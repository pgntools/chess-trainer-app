import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { StandingsTable, type StandingsRow, type TablePaging } from "../../../design-system/patterns/tables";
import type { Tournament } from "../../../lib/tournament";
import { competitorOf, formatPoints, playerNames, resultEntryOf, tieBreakColumns, tournamentLabels, tournamentLegend } from "../tournamentTable";

export type SwissStandingsTableProps = {
  /**
   * The tournament — `tournamentOf(headers)` (`lib/tournament.ts`), ranked
   * by points, then Buchholz, then Sonneborn-Berger. `undefined` while its
   * games are read.
   */
  tournament: Tournament | undefined;
  /** The table's accessible name — the event's ("Sofia Cup Rapid 2026 — standings"). */
  ariaLabel: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Cut the rows into pages, the pager under the table — for a long one (CTA-128). Absent, every row shows. */
  paging?: TablePaging;
  /**
   * The table's root, and every id under it (`StandingsTable`'s): `-frame`,
   * `-row-<player id>` (`-name`, `-points`, `-buchholz`, `-sonnebornBerger`),
   * a round's cell `-round-<player id>-<round>`, `-loading`, `-empty`,
   * `-legend`.
   */
  testId: string;
};

/**
 * **A Swiss tournament's standings** (CTA-120) — `StandingsTable` over a
 * `Tournament`: a row per player in rank order, the title before the name
 * and the federation after it, the rating, a cell per round, the points and
 * the tie-breaks the tournament was ranked by (Buchholz, then
 * Sonneborn-Berger).
 *
 * A round's cell shows **the result only**, as lichess's Swiss standings do;
 * the round, the colour played and the opponent are in its name. `*` is an
 * unfinished game and a dash a round the file holds no game of — not a bye:
 * the table shows what the file has. The legend under it explains whichever
 * of the two it shows.
 *
 * Presentational: the tournament is a prop (a screen reads the games and
 * calls `tournamentOf`). Its words are the app's (`tournament.*`).
 */
function SwissStandingsTable({ tournament, ariaLabel, density, paging, testId }: SwissStandingsTableProps) {
  const { t } = useTranslation();

  const rows = useMemo<StandingsRow[]>(() => {
    if (tournament === undefined) return [];
    const names = playerNames(tournament);
    return tournament.standings.map((standing) => ({
      ...competitorOf(standing),
      rounds: standing.rounds.map((games, index) =>
        games.length === 0
          ? [{ outcome: "none" as const, label: t("tournament.noGame", { round: index + 1 }) }]
          : games.map((game) => resultEntryOf(t, game, names)),
      ),
    }));
  }, [tournament, t]);

  const legend = useMemo(
    () =>
      tournamentLegend(t, {
        unfinished: (tournament?.unfinished ?? 0) > 0,
        none: tournament?.standings.some((standing) => standing.rounds.some((games) => games.length === 0)) ?? false,
      }),
    [tournament, t],
  );

  return (
    <StandingsTable
      rows={rows}
      rounds={tournament?.rounds ?? 0}
      labels={{ ...tournamentLabels(t), round: (round) => t("tournament.round", { round }) }}
      tieBreaks={tieBreakColumns(t, tournament?.tieBreaks ?? [])}
      formatPoints={formatPoints}
      legend={legend}
      loading={tournament === undefined}
      loadingLabel={t("tournament.loading")}
      emptyLabel={t("tournament.empty")}
      density={density}
      paging={paging}
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

export default SwissStandingsTable;
