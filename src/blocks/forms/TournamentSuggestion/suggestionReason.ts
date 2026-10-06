import type { TFunction } from "i18next";

import type { TournamentGuess } from "../../../lib/tournamentKind";

/**
 * **Why a guess was made, in the reader's language** (CTA-142) — out of the
 * numbers it was read from (`TournamentGuess.facts`), the words
 * `library.settings.suggestion.reasons.*`; the guesser's own English
 * `reason` where a guess carries none.
 */
export const suggestionReasonOf = (t: TFunction, guess: TournamentGuess): string => {
  const { facts } = guess;
  if (facts === undefined) return guess.reason;
  const words = { games: facts.games, competitors: facts.competitors, rounds: facts.rounds, sizes: facts.sizes?.join(" → ") ?? "" };
  const key = (() => {
    switch (guess.kind) {
      case "match":
      case "doubleElimination":
      case "knockout":
      case "teamKnockout":
        return guess.kind;
      case "roundRobin":
        return facts.twice ? "roundRobinTwice" : "roundRobin";
      case "teamSwiss":
        // A team round robin is drawn as the team standings: the reason says which it was.
        if (facts.twice !== undefined) return "teamRoundRobin";
        return facts.rounds > 0 ? "teamSwiss" : "teamSwissNoRounds";
      case "swiss":
        return facts.rounds > 0 ? "swiss" : "swissNoRounds";
    }
  })();
  return t(`library.settings.suggestion.reasons.${key}`, words);
};
