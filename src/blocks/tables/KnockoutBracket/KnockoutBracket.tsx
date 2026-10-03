import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Box from "@mui/material/Box";

import { Bracket, type BracketRound, type BracketSide } from "../../../design-system/patterns/tables";
import type { Knockout, KnockoutBracket as Bracketed, KnockoutMatch } from "../../../lib/knockout";
import { formatScore } from "../tournamentTable";

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
   * The root. The bracket is `-winners` (a double elimination's losers'
   * bracket `-losers`), each with `Bracket`'s ids under it: `-round-<n>`,
   * `-match-<round>-<n>` (round 2's third match `-match-2-3`), a side's line
   * `-match-<round>-<n>-<0|1>`; a double elimination's brackets' names
   * `-winners-title`, `-losers-title`.
   */
  testId: string;
};

/** A round's name: "Round 2" — or, in a plain knockout, the last three rounds' own when they halve to one match. */
const roundTitle = (t: TFunction, bracket: Bracketed, index: number, named: boolean): string => {
  const fromEnd = bracket.rounds.length - 1 - index;
  const sizes = bracket.rounds.slice(index).map((round) => round.matches.length);
  // Each round from here to the final halves: 4, 2, 1 — the stages have their names.
  const halving = sizes.every((size, step) => size === 2 ** (sizes.length - 1 - step));
  if (named && halving && fromEnd <= 2) return t(["tournament.knockout.final", "tournament.knockout.semiFinals", "tournament.knockout.quarterFinals"][fromEnd]);
  return t("tournament.knockout.round", { round: bracket.rounds[index].round });
};

/** One side of a match as a bracket's line: the title before the name, the score — a team's board points after it. */
const sideOf = (match: KnockoutMatch, index: 0 | 1, teams: boolean): BracketSide => {
  const side = match.sides[index];
  return {
    id: String(index),
    name: side.competitor.name,
    prefix: side.competitor.title,
    score: formatScore(side.score),
    ...(teams && { detail: `(${formatScore(side.boardPoints ?? 0)})` }),
    winner: match.winner === index,
  };
};

const roundsOf = (t: TFunction, bracket: Bracketed, teams: boolean, named: boolean): BracketRound[] =>
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
      return {
        // Its place, not its players: a test id with no names in it ("2-3", round 2's third match).
        id: `${round.round}-${position + 1}`,
        label: `${words.join(", ")}${through}`,
        sides: [sideOf(match, 0, teams), sideOf(match, 1, teams)],
      };
    }),
  }));

/**
 * **A knockout's bracket** (CTA-128) — `Bracket` over a `Knockout`: a column
 * per round, a box per match, each side's title before its name and its
 * score after it (game points; in a team knockout the legs won, the board
 * points muted beside them), the side that went through marked. A plain
 * knockout's last rounds take their names when they halve to the final —
 * Quarter-finals, Semi-finals, Final; anything else is "Round n".
 *
 * **A double elimination** is two brackets, one under the other, each under
 * its name — the winners', then the losers' — and each read by the bracket's
 * name with its own after it.
 *
 * Presentational: the knockout is a prop (a screen reads the games and calls
 * `knockoutOf`). Its words are the app's (`tournament.knockout.*`).
 */
function KnockoutBracket({ knockout, ariaLabel, density, testId }: KnockoutBracketProps) {
  const { t } = useTranslation();
  const double = knockout?.losers !== undefined;

  const brackets = useMemo(() => {
    if (knockout === undefined) return undefined;
    const winners = { id: "winners", title: t("tournament.knockout.winners"), rounds: roundsOf(t, knockout.winners, knockout.teams, !double) };
    return knockout.losers === undefined
      ? [winners]
      : [winners, { id: "losers", title: t("tournament.knockout.losers"), rounds: roundsOf(t, knockout.losers, knockout.teams, false) }];
  }, [knockout, double, t]);

  const common = { emptyLabel: t("tournament.knockout.empty"), loadingLabel: t("tournament.knockout.loading"), density };
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
