import type { TFunction } from "i18next";

import type { Competitor, CompetitorLabels, ResultEntry, TieBreakColumn } from "../../design-system/patterns/tables";
import type { PlayerGame, TieBreak, Tournament, TournamentStanding } from "../../lib/tournament";

/*
  What the two tournament blocks share (CTA-120) — `SwissStandingsTable` and
  `RoundRobinCrossTable` are each a pattern over `lib/tournament.ts`'s data,
  and the chess words are the same in both: a player's title, rating and
  federation, the headings, White / Black in a result's name. Their words
  are the app's (`tournament.*`).
*/

/** Points and Buchholz to one decimal, Sonneborn-Berger to two — it moves in quarters. */
export const formatPoints = (value: number): string => value.toFixed(1);
const FORMATS: Readonly<Record<TieBreak, (value: number) => string>> = {
  buchholz: formatPoints,
  sonnebornBerger: (value) => value.toFixed(2),
};

/** The headings both tables share: `#`, Player, Rtg, Pts — each abbreviation read by its full name. */
export const tournamentLabels = (t: TFunction): CompetitorLabels => ({
  rank: { header: t("tournament.columns.rank"), name: t("tournament.columns.rankName") },
  name: t("tournament.columns.player"),
  rating: { header: t("tournament.columns.rating"), name: t("tournament.columns.ratingName") },
  points: { header: t("tournament.columns.points"), name: t("tournament.columns.pointsName") },
});

/** The tie-break columns — the ones the tournament was ranked by, in that order, so the columns explain the ranks. */
export const tieBreakColumns = (t: TFunction, tieBreaks: readonly TieBreak[]): TieBreakColumn[] =>
  tieBreaks.map((id) => ({
    id,
    header: t(`tournament.columns.${id}`),
    name: t(`tournament.columns.${id}Name`),
    format: FORMATS[id],
  }));

/** A standing as a row's competitor: the title before the name, the federation after it, the rating in its column. */
export const competitorOf = ({ rank, player, points, tieBreaks }: TournamentStanding): Competitor => ({
  id: player.id,
  rank,
  name: player.name,
  prefix: player.title,
  suffix: player.federation,
  rating: player.rating,
  points,
  tieBreaks,
});

/** Every player's name by id — a result names its opponent. */
export const playerNames = (tournament: Tournament): ReadonlyMap<string, string> =>
  new Map(tournament.standings.map((standing) => [standing.player.id, standing.player.name]));

/**
 * A game as a cell's result: its outcome, and the words read in the glyph's
 * place — the round, the colour played, the opponent and the result
 * ("Round 3, White against Giri, Anish: draw").
 */
export const resultEntryOf = (t: TFunction, game: PlayerGame, names: ReadonlyMap<string, string>): ResultEntry => ({
  outcome: game.outcome,
  label: t(`tournament.game.${game.color}${game.round === undefined ? "NoRound" : ""}`, {
    round: game.round,
    opponent: names.get(game.opponent) ?? game.opponent,
    result: t(`tournament.result.${game.outcome}`),
  }),
});

/** The legend's entries for the glyphs a table shows — none for a table of finished games with no gap. */
export const tournamentLegend = (t: TFunction, shows: { unfinished: boolean; none: boolean }): ResultEntry[] => [
  ...(shows.unfinished ? [{ outcome: "unfinished" as const, label: t("tournament.legend.unfinished") }] : []),
  ...(shows.none ? [{ outcome: "none" as const, label: t("tournament.legend.none") }] : []),
];

/**
 * A score as a chess table writes it (CTA-128): halves as `½` — `2½`, `½`,
 * `3`. For a match's score and a team's board points, where `2.5` would read
 * as a decimal.
 */
export const formatScore = (value: number): string => {
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  return half ? (whole === 0 ? "½" : `${whole}½`) : String(whole);
};
