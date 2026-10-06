import { gameTag, type GameHeaders } from "../../lib/gameModel";
import { playerOf, roundPartsOf } from "../../lib/tournament";

/**
 * **What kind of tournament a file of games is — a guess** (CTA-137), from
 * the games' tags alone, as The Week in Chess writes them
 * (`.claude/rules/tournament-tables.md` §2): which table shows it best.
 * The MDX editor's Add component suggests it; nothing decides by it.
 *
 * The competitors are the players — or the teams, where every game names
 * both (`WhiteTeam`, `BlackTeam`). In order:
 *
 * 1. **two players** in every game → a **match**;
 * 2. a round numbered **51 or more** → a **double elimination** (TWIC's
 *    losers' bracket starts there);
 * 3. each round's competitors **among the round before's**, fewer at the
 *    end, each meeting one opponent a round → a **knockout** (a team
 *    knockout for teams);
 * 4. **nearly every pair met** → a **round robin** (double where they met
 *    twice);
 * 5. else a **Swiss** — and for teams, a team event's standings.
 *
 * A partial file (the top boards of a Swiss) still reads as a Swiss: its
 * rounds' players are not each among the round before's.
 */

export type TournamentKind = "match" | "doubleElimination" | "knockout" | "teamKnockout" | "roundRobin" | "swiss" | "teamSwiss";

export type TournamentGuess = {
  kind: TournamentKind;
  /** Why, in a line — "8 players, every pair met twice: a double round robin". */
  reason: string;
};

/** The share of the possible pairs that must have met for a round robin — a file may lack a game or two. */
const ROUND_ROBIN_SHARE = 0.9;
/** TWIC's first round of a double elimination's losers' bracket. */
const LOSERS_FROM_ROUND = 51;

type Pairing = { round: number | undefined; a: string; b: string };

/** The guess for a file's games — `undefined` for one too small or too unlike a tournament to say. */
export const guessTournamentKind = (games: readonly GameHeaders[]): TournamentGuess | undefined => {
  const teams = games.length > 0 && games.every((headers) => gameTag(headers, "WhiteTeam") !== undefined && gameTag(headers, "BlackTeam") !== undefined);
  const word = teams ? "teams" : "players";

  const pairings: Pairing[] = [];
  for (const headers of games) {
    const a = teams ? gameTag(headers, "WhiteTeam") : playerOf(headers, "White")?.id;
    const b = teams ? gameTag(headers, "BlackTeam") : playerOf(headers, "Black")?.id;
    if (a === undefined || b === undefined || a === b) continue;
    pairings.push({ round: roundPartsOf(gameTag(headers, "Round"))[0], a, b });
  }
  if (pairings.length < 2) return undefined;

  const competitors = new Set(pairings.flatMap(({ a, b }) => [a, b]));
  if (!teams && competitors.size === 2) return { kind: "match", reason: `${pairings.length} games, every one between the same two players: a match` };

  const rounds = [...new Set(pairings.map(({ round }) => round).filter((round): round is number => round !== undefined))].sort((x, y) => x - y);
  if (!teams && rounds.some((round) => round >= LOSERS_FROM_ROUND)) {
    return { kind: "doubleElimination", reason: `rounds from ${LOSERS_FROM_ROUND} on — a losers' bracket, as TWIC numbers it: a double elimination` };
  }

  // Each round: who played, and whom.
  const opponents = new Map<number, Map<string, Set<string>>>();
  for (const { round, a, b } of pairings) {
    if (round === undefined) continue;
    const met = opponents.get(round) ?? new Map<string, Set<string>>();
    met.set(a, (met.get(a) ?? new Set()).add(b));
    met.set(b, (met.get(b) ?? new Set()).add(a));
    opponents.set(round, met);
  }
  const playing = rounds.map((round) => new Set(opponents.get(round)?.keys()));
  const oneOpponent = rounds.every((round) => [...(opponents.get(round)?.values() ?? [])].every((met) => met.size === 1));
  const narrowing =
    rounds.length >= 2 &&
    playing.every((now, index) => index === 0 || [...now].every((competitor) => playing[index - 1].has(competitor))) &&
    (playing.at(-1)?.size ?? 0) < playing[0].size;
  if (oneOpponent && narrowing) {
    const sizes = playing.map((round) => round.size).join(" → ");
    return teams
      ? { kind: "teamKnockout", reason: `${competitors.size} teams, fewer each round (${sizes}): a team knockout` }
      : { kind: "knockout", reason: `${competitors.size} players, fewer each round (${sizes}): a knockout` };
  }

  // How often each pair met — a team pairing once a round, however many boards it played on.
  const meetings = new Map<string, number>();
  const counted = new Set<string>();
  for (const { round, a, b } of pairings) {
    const pair = [a, b].sort().join("\u0000");
    if (teams) {
      const once = `${pair}\u0000${round ?? ""}`;
      if (counted.has(once)) continue;
      counted.add(once);
    }
    meetings.set(pair, (meetings.get(pair) ?? 0) + 1);
  }
  const pairCounts = [...meetings.values()];
  const possible = (competitors.size * (competitors.size - 1)) / 2;
  if (pairCounts.length >= ROUND_ROBIN_SHARE * possible) {
    const twice = pairCounts.filter((count) => count >= 2).length >= ROUND_ROBIN_SHARE * possible;
    const what = teams ? "a team round robin" : twice ? "a double round robin" : "a round robin";
    return { kind: teams ? "teamSwiss" : "roundRobin", reason: `${competitors.size} ${word}, every pair met${twice ? " twice" : ""}: ${what}` };
  }

  const roundsWords = rounds.length === 0 ? "" : `, ${rounds.length} rounds`;
  return teams
    ? { kind: "teamSwiss", reason: `${competitors.size} teams${roundsWords}, each meeting a few of the others: a team event` }
    : { kind: "swiss", reason: `${competitors.size} players${roundsWords}, each meeting a few of the others: a Swiss` };
};
