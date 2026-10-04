import type { TFunction } from "i18next";

import type { LabelChipTone } from "../../design-system/components/tables";
import type { Competitor, CompetitorBadge, CompetitorFlag, CompetitorLabels, ResultEntry, TieBreakColumn } from "../../design-system/patterns/tables";
import { federationFlagOf } from "../../lib/federations";
import type { PlayerGame, TieBreak, Tournament, TournamentPlayer, TournamentStanding } from "../../lib/tournament";

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

/** The FIDE titles' tones (CTA-128): a grandmaster's gold, then blue, green and purple down the titles — a woman's title in its counterpart's. */
const TITLE_TONES: Readonly<Record<string, LabelChipTone>> = {
  GM: "warning",
  WGM: "warning",
  IM: "info",
  WIM: "info",
  FM: "success",
  WFM: "success",
  CM: "secondary",
  WCM: "secondary",
};

/**
 * A player's title as a chip (CTA-128): its tone, and — for a FIDE title —
 * what it stands for, read in its place ("Grandmaster"). Any other title
 * (a national one) is a chip in the primary tone, read as written.
 */
export const titleBadgeOf = (t: TFunction, title: string | undefined): CompetitorBadge | undefined => {
  if (title === undefined) return undefined;
  const known = title.toUpperCase();
  const tone = TITLE_TONES[known];
  return tone === undefined ? { label: title, tone: "primary" } : { label: title, tone, name: t(`tournament.titles.${known}`) };
};

/** A federation tag as a flag, named in `language` (CTA-128) — `undefined` for none, or a code with no flag. */
export const flagOfFederation = (federation: string | undefined, language: string): CompetitorFlag | undefined => {
  const flag = federationFlagOf(federation, language);
  return flag === undefined ? undefined : { code: flag.code, label: flag.name };
};

/** A player's — or a team's — federation as a flag (CTA-128). */
export const federationFlag = (player: TournamentPlayer, language: string): CompetitorFlag | undefined =>
  flagOfFederation(player.federation, language);

/**
 * A player's marks around the name (CTA-128): the title as a chip before it,
 * the federation as a flag after it — the words they replace kept as their
 * fallbacks.
 */
export const playerMarks = (t: TFunction, language: string, player: TournamentPlayer) => ({
  prefix: player.title,
  suffix: player.federation,
  badge: titleBadgeOf(t, player.title),
  flag: federationFlag(player, language),
});

/** A standing as a row's competitor: the title as a chip before the name, the federation as a flag after it, the rating in its column. */
export const competitorOf = (t: TFunction, language: string, { rank, player, points, tieBreaks }: TournamentStanding): Competitor => ({
  id: player.id,
  rank,
  name: player.name,
  ...playerMarks(t, language, player),
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
