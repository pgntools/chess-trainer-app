import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Box from "@mui/material/Box";

import { Bracket, type BracketGame, type BracketRound, type BracketSide } from "../../../design-system/patterns/tables";
import type { Knockout, KnockoutBracket as Bracketed, KnockoutMatch } from "../../../lib/knockout";
import { POINTS } from "../../../lib/tournament";
import { federationFlag, formatScore, teamFlag, titleBadgeOf, type TournamentLinks } from "../tournamentTable";

export type KnockoutBracketProps = {
  /**
   * The knockout — `knockoutOf(headers)` (`lib/knockout.ts`); a double
   * elimination's has a losers' bracket, and a team knockout's sides are
   * teams. `undefined` while its games are read.
   */
  knockout: Knockout | undefined;
  /** The bracket's name — the event's ("Dutch championship 2026 — bracket"). A double elimination's two take it with their own after it. */
  ariaLabel: string;
  /** `dense` tightens the match boxes. */
  density?: "normal" | "dense";
  /**
   * Each side's name a link (CTA-128) — a player, or in a team knockout the
   * team (its `id` and `name` the team's name). Absent, or `undefined` for
   * one, plain text.
   */
  playerLink?: TournamentLinks["playerLink"];
  /**
   * Each match's games as links under it (CTA-128), `game` the game's index
   * in the headers the knockout was read from: a link per game, showing the
   * first side's points — in a team knockout a link per leg, showing its
   * board points both ways and opening the leg's first board.
   */
  gameLink?: TournamentLinks["gameLink"];
  /**
   * The root. The bracket is `-winners` (a double elimination's losers'
   * bracket `-losers`), each with `Bracket`'s ids under it: `-round-<n>`,
   * `-match-<round>-<n>` (round 2's third match `-match-2-3`), a side's line
   * `-match-<round>-<n>-<0|1>` (its name's link `-…-link`), the games
   * `-match-<round>-<n>-games` (`-games-<game or leg>`); a double
   * elimination's brackets' names `-winners-title`, `-losers-title`.
   */
  testId: string;
};

/** A round's name: "Round 2" — or, in a plain knockout, the last three rounds' own when they halve to one match. */
const roundTitle = (t: TFunction, bracket: Bracketed, index: number, named: boolean): string => {
  const fromEnd = bracket.rounds.length - 1 - index;
  // A match for third place beside the final does not count: its round is still the final.
  const sizes = bracket.rounds.slice(index).map((round) => round.matches.filter((match) => !match.thirdPlace).length);
  // Each round from here to the final halves: 4, 2, 1 — the stages have their names.
  const halving = sizes.every((size, step) => size === 2 ** (sizes.length - 1 - step));
  if (named && halving && fromEnd <= 2) return t(["tournament.knockout.final", "tournament.knockout.semiFinals", "tournament.knockout.quarterFinals"][fromEnd]);
  return t("tournament.knockout.round", { round: bracket.rounds[index].round });
};

/** One side of a match as a bracket's line: the title before the name, the score — a team's board points after it. */
const sideOf = (t: TFunction, language: string, match: KnockoutMatch, index: 0 | 1, teams: boolean, links: TournamentLinks): BracketSide => {
  const side = match.sides[index];
  // A team's flag before its name, a player's after it (CTA-128).
  const flag = teams ? teamFlag(side.competitor.federation, language) : federationFlag(side.competitor, language);
  return {
    id: String(index),
    name: side.competitor.name,
    prefix: side.competitor.title,
    badge: titleBadgeOf(t, side.competitor.title),
    ...(flag !== undefined && { flag }),
    score: formatScore(side.score),
    ...(teams && { detail: `(${formatScore(side.boardPoints ?? 0)})` }),
    winner: match.winner === index,
    link: links.playerLink?.(side.competitor),
  };
};

/** A result as a PGN writes it, a half as "½": "1–0", "½–½", "*". */
const resultWords = (outcome: KnockoutMatch["games"][number]["outcome"]): string =>
  outcome === "unfinished" ? "*" : `${formatScore(POINTS[outcome])}–${formatScore(1 - POINTS[outcome])}`;

/**
 * A match's games as links (CTA-128): a link per game, showing the first
 * side's points — or, in a team knockout, a link per leg, showing its board
 * points both ways and opening its first board.
 */
const gamesOf = (t: TFunction, match: KnockoutMatch, teams: boolean, gameLink: NonNullable<TournamentLinks["gameLink"]>): BracketGame[] => {
  const [first, second] = match.sides.map((side) => side.competitor);
  const gained = (game: KnockoutMatch["games"][number], side: string) =>
    game.outcome === "unfinished" ? 0 : game.white === side ? POINTS[game.outcome] : 1 - POINTS[game.outcome];
  const linked = (id: string, game: number, label: string, name: string): BracketGame[] => {
    const link = gameLink(game);
    return link === undefined ? [] : [{ id, label, name, link }];
  };
  if (!teams) {
    return match.games.flatMap((game, index) =>
      linked(
        String(index + 1),
        game.game,
        game.outcome === "unfinished" ? "*" : formatScore(gained(game, first.id)),
        t("tournament.knockout.game", {
          number: index + 1,
          white: game.white === first.id ? first.name : second.name,
          black: game.white === first.id ? second.name : first.name,
          result: resultWords(game.outcome),
        }),
      ),
    );
  }
  // A team match's legs, in the order the file plays them: each one's board points, and its first board.
  const legs = new Map<number, { first: number; points: [number, number] }>();
  for (const game of match.games) {
    const leg = legs.get(game.part ?? 1) ?? { first: game.game, points: [0, 0] };
    leg.points = [leg.points[0] + gained(game, first.id), leg.points[1] + gained(game, second.id)];
    legs.set(game.part ?? 1, leg);
  }
  return [...legs.entries()].flatMap(([leg, { first: game, points }]) =>
    linked(
      String(leg),
      game,
      `${formatScore(points[0])}–${formatScore(points[1])}`,
      t("tournament.knockout.leg", { leg, first: first.name, own: formatScore(points[0]), second: second.name, other: formatScore(points[1]) }),
    ),
  );
};

const roundsOf = (t: TFunction, language: string, bracket: Bracketed, teams: boolean, named: boolean, links: TournamentLinks): BracketRound[] =>
  bracket.rounds.map((round, index) => ({
    id: String(round.round),
    title: roundTitle(t, bracket, index, named),
    matches: round.matches.map((match: KnockoutMatch, position) => {
      const words = match.sides.map((side) =>
        teams
          ? t("tournament.knockout.teamSide", { name: side.competitor.name, score: formatScore(side.score), boardPoints: formatScore(side.boardPoints ?? 0) })
          : t("tournament.knockout.side", { name: side.competitor.name, score: formatScore(side.score) }),
      );
      const through = match.winner === undefined ? "" : `: ${t("tournament.knockout.through", { name: match.sides[match.winner].competitor.name })}`;
      const caption = match.thirdPlace ? t("tournament.knockout.thirdPlace") : undefined;
      return {
        ...(caption !== undefined && { caption }),
        // Its place, not its players: a test id with no names in it ("2-3", round 2's third match).
        id: `${round.round}-${position + 1}`,
        label: `${caption === undefined ? "" : `${caption}: `}${words.join(", ")}${through}`,
        sides: [sideOf(t, language, match, 0, teams, links), sideOf(t, language, match, 1, teams, links)],
        ...(links.gameLink !== undefined && { games: gamesOf(t, match, teams, links.gameLink) }),
      };
    }),
  }));

/**
 * **A knockout's bracket** (CTA-128) — `Bracket` over a `Knockout`: a column
 * per round, a box per match, each side's title before its name and its
 * score after it (game points; in a team knockout the legs won, the board
 * points muted beside them), the side that went through marked. A plain
 * knockout's last rounds take their names when they halve to the final —
 * Quarter-finals, Semi-finals, Final; anything else is "Round n". A match for
 * third place sits under the final, captioned.
 *
 * **A double elimination** is two brackets, one under the other, each under
 * its name — the winners', then the losers' — and each read by the bracket's
 * name with its own after it.
 *
 * **Links** (CTA-128), both optional: `playerLink` makes each name a link,
 * `gameLink` adds each match's games (a team match's legs) under it.
 *
 * Presentational: the knockout is a prop (a screen reads the games and calls
 * `knockoutOf`), and so are the links. Its words are the app's
 * (`tournament.knockout.*`).
 */
function KnockoutBracket({ knockout, ariaLabel, density, playerLink, gameLink, testId }: KnockoutBracketProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const double = knockout?.losers !== undefined;

  const brackets = useMemo(() => {
    if (knockout === undefined) return undefined;
    const links = { playerLink, gameLink };
    const winners = { id: "winners", title: t("tournament.knockout.winners"), rounds: roundsOf(t, language, knockout.winners, knockout.teams, !double, links) };
    return knockout.losers === undefined
      ? [winners]
      : [winners, { id: "losers", title: t("tournament.knockout.losers"), rounds: roundsOf(t, language, knockout.losers, knockout.teams, false, links) }];
  }, [knockout, double, t, language, playerLink, gameLink]);

  const common = {
    emptyLabel: t("tournament.knockout.empty"),
    loadingLabel: t("tournament.knockout.loading"),
    gamesLabel: t(knockout?.teams ? "tournament.knockout.legs" : "tournament.knockout.games"),
    density,
  };
  if (brackets === undefined) {
    return (
      <Box data-testid={testId}>
        <Bracket rounds={[]} loading ariaLabel={ariaLabel} testId={`${testId}-winners`} {...common} />
      </Box>
    );
  }

  return (
    <Box data-testid={testId} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {brackets.map((bracket) =>
        double ? (
          <Box key={bracket.id}>
            <Box sx={{ typography: "subtitle1", fontWeight: 600, mb: 1 }} data-testid={`${testId}-${bracket.id}-title`}>
              {bracket.title}
            </Box>
            <Bracket rounds={bracket.rounds} ariaLabel={`${ariaLabel} — ${bracket.title}`} testId={`${testId}-${bracket.id}`} {...common} />
          </Box>
        ) : (
          <Bracket key={bracket.id} rounds={bracket.rounds} ariaLabel={ariaLabel} testId={`${testId}-${bracket.id}`} {...common} />
        ),
      )}
    </Box>
  );
}

export default KnockoutBracket;
