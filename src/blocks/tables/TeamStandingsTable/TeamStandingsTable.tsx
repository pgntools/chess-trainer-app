import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { StandingsTable, type StandingsRow, type TieBreakColumn, type TablePaging } from "../../../design-system/patterns/tables";
import type { TeamTournament } from "../../../lib/teamTournament";
import { flagOfFederation, formatScore } from "../tournamentTable";

export type TeamStandingsTableProps = {
  /** The tournament — `teamTournamentOf(headers)` (`lib/teamTournament.ts`). `undefined` while its games are read. */
  tournament: TeamTournament | undefined;
  /** The table's accessible name — the event's ("FIDE World Rapid Team 2026 — standings"). */
  ariaLabel: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Cut the rows into pages, the pager under the table — for a long one (CTA-128). Absent, every row shows. */
  paging?: TablePaging;
  /**
   * The table's root, and every id under it (`StandingsTable`'s): `-row-<n>`
   * (the team ranked n: `-name`, `-points` — the match points —
   * `-boardPoints`), a round's cell `-round-<n>-<round>`, `-loading`,
   * `-empty`, `-legend`.
   */
  testId: string;
};

/**
 * **A team tournament's standings** (CTA-128) — `StandingsTable` over a
 * `TeamTournament`, the Olympiad's table: a row per team in rank order — its
 * flag after its name where its players share one — **a
 * cell per round showing the team's board points** in that round's match,
 * toned as the match went (won, drawn, lost — the opponent and the score
 * both ways in its words), then the match points and the board points the
 * teams are ranked by.
 *
 * Presentational: the tournament is a prop (a screen reads the games and
 * calls `teamTournamentOf`). Its words are the app's (`tournament.*`).
 */
function TeamStandingsTable({ tournament, ariaLabel, density, paging, testId }: TeamStandingsTableProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const rows = useMemo<StandingsRow[]>(() => {
    if (tournament === undefined) return [];
    return tournament.standings.map((standing) => ({
      // The rank, not the name: a test id with no team's name in it.
      id: String(standing.rank),
      rank: standing.rank,
      name: standing.team,
      // The flag its players all share — an Olympiad's national team; a club has none (CTA-128).
      suffix: standing.federation,
      flag: flagOfFederation(standing.federation, language),
      points: standing.matchPoints,
      tieBreaks: { boardPoints: standing.boardPoints },
      rounds: standing.rounds.map((matches, index) =>
        matches.length === 0
          ? [{ outcome: "none" as const, label: t("tournament.team.noMatch", { round: index + 1 }) }]
          : matches.map((match) => ({
              outcome: match.outcome,
              glyph: formatScore(match.boardPoints),
              label: t("tournament.team.match", {
                round: match.round,
                opponent: match.opponent,
                own: formatScore(match.boardPoints),
                other: formatScore(match.opponentBoardPoints),
                outcome: t(`tournament.team.outcome.${match.outcome}`),
              }),
            })),
      ),
    }));
  }, [tournament, t, language]);

  const tieBreaks = useMemo<TieBreakColumn[]>(
    () => [{ id: "boardPoints", header: t("tournament.columns.boardPoints"), name: t("tournament.columns.boardPointsName"), format: formatScore }],
    [t],
  );

  const legend = useMemo(
    () => [
      ...((tournament?.unfinished ?? 0) > 0 ? [{ outcome: "unfinished" as const, label: t("tournament.team.legend.unfinished") }] : []),
      ...(rows.some((row) => row.rounds.some((round) => round[0]?.outcome === "none")) ? [{ outcome: "none" as const, label: t("tournament.legend.none") }] : []),
    ],
    [tournament, rows, t],
  );

  return (
    <StandingsTable
      rows={rows}
      rounds={tournament?.rounds ?? 0}
      labels={{
        rank: { header: t("tournament.columns.rank"), name: t("tournament.columns.rankName") },
        name: t("tournament.columns.team"),
        points: { header: t("tournament.columns.matchPoints"), name: t("tournament.columns.matchPointsName") },
        round: (round) => t("tournament.round", { round }),
      }}
      tieBreaks={tieBreaks}
      formatPoints={formatScore}
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

export default TeamStandingsTable;
