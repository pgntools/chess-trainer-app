import { describe, expect, it } from "vitest";

import { readPgnTags, splitPgnGames } from "./pgn";
import { guessTournamentKind, type TournamentKind } from "./tournamentKind";
import werner from "../views/blog/articles/tournaments/20th-werner-obermeyer-swiss-5r.pgn?raw";
import british from "../views/blog/articles/tournaments/chgbr26.pgn?raw";
import dutch from "../views/blog/articles/tournaments/chned26.pgn?raw";
import clutch from "../views/blog/articles/tournaments/clutchlegends26.pgn?raw";
import esportsFinal from "../views/blog/articles/tournaments/esportswcupfin26.pgn?raw";
import esportsPlayIn from "../views/blog/articles/tournaments/esportswcuppl26.pgn?raw";
import blitzTeams from "../views/blog/articles/tournaments/fidewrbtf26.pgn?raw";
import rapidTeams from "../views/blog/articles/tournaments/fidewrt26.pgn?raw";
import greenHills from "../views/blog/articles/tournaments/greenhillsrapid26.pgn?raw";
import olympiad from "../views/blog/articles/tournaments/olym26.pgn?raw";
import candidates from "../views/blog/articles/tournaments/wchcand26.pgn?raw";

/*
  The guess at a file's kind of tournament (CTA-137), held to every shipped
  TWIC file — each guessed as the table its Blog article draws it with —
  and to hand-made games at the edges.
*/

const guess = (pgn: string) => guessTournamentKind(splitPgnGames(pgn).map(readPgnTags));
const game = (round: string, white: string, black: string, extra = "") => readPgnTags(`[Round "${round}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "1-0"]${extra}\n\n1. e4 1-0`);

describe("guessTournamentKind", () => {
  it.each<[string, string, TournamentKind]>([
    ["the Werner-Obermeyer, the top boards of a Swiss", werner, "swiss"],
    ["the British championship", british, "swiss"],
    ["the Dutch championship, a knockout with tiebreaks", dutch, "knockout"],
    ["Kasparov – Topalov", clutch, "match"],
    ["the Esports World Cup's final stage", esportsFinal, "knockout"],
    ["the Esports World Cup's play-in", esportsPlayIn, "doubleElimination"],
    ["the World Blitz Team Championship's knockout", blitzTeams, "teamKnockout"],
    ["the World Rapid Team Championship", rapidTeams, "teamSwiss"],
    ["the Green Hills Masters", greenHills, "roundRobin"],
    ["the Olympiad", olympiad, "teamSwiss"],
    ["the Candidates", candidates, "roundRobin"],
  ])("reads %s as the table its article draws", (_, pgn, kind) => {
    expect(guess(pgn)?.kind).toBe(kind);
  });

  it("says why, in a line", () => {
    expect(guess(candidates)?.reason).toBe("8 players, every pair met twice: a double round robin");
    expect(guess(dutch)?.reason).toMatch(/^16 players, fewer each round \(16 → 8 → 4 → 2\): a knockout$/);
  });

  it("hands back what it read the guess from, for a screen to say in its own words (CTA-142)", () => {
    expect(guess(candidates)?.facts).toEqual({ games: 56, competitors: 8, teams: false, rounds: 14, twice: true });
    expect(guess(dutch)?.facts).toMatchObject({ competitors: 16, teams: false, sizes: [16, 8, 4, 2] });
    expect(guess(clutch)?.facts).toMatchObject({ competitors: 2, teams: false });
    expect(guess(rapidTeams)?.facts).toMatchObject({ competitors: 48, teams: true, rounds: 12 });
  });

  it("reads games with no rounds and more games than players as an arena (CTA-142) — Lichess's way", () => {
    // Round "-" everywhere; five players, nine games, the same pairs again.
    const arenaGame = (white: string, black: string) => game("-", white, black);
    const arena = [
      ["A", "B"], ["B", "A"], ["A", "B"], ["A", "C"], ["C", "A"], ["B", "C"], ["D", "E"], ["A", "D"], ["E", "B"],
    ].map(([white, black]) => arenaGame(white, black));
    expect(guessTournamentKind(arena)).toMatchObject({ kind: "arena", reason: "5 players, 9 games and no rounds: an arena", facts: { competitors: 5, games: 9, rounds: 0 } });
    // A few games with no rounds — fewer than players — is still a Swiss's top boards, not an arena.
    expect(guessTournamentKind(arena.slice(6))?.kind).toBe("swiss");
    // Every pair met: a round robin, rounds or not.
    expect(guessTournamentKind([arenaGame("A", "B"), arenaGame("A", "C"), arenaGame("B", "C"), arenaGame("B", "A")])?.kind).toBe("roundRobin");
  });

  it("guesses nothing from a game or none", () => {
    expect(guessTournamentKind([])).toBeUndefined();
    expect(guessTournamentKind([game("1", "A", "B")])).toBeUndefined();
  });

  it("tells a small round robin from a Swiss by whether every pair met", () => {
    const roundRobin = [game("1", "A", "B"), game("1", "C", "D"), game("2", "A", "C"), game("2", "B", "D"), game("3", "A", "D"), game("3", "B", "C")];
    expect(guessTournamentKind(roundRobin)?.kind).toBe("roundRobin");
    expect(guessTournamentKind(roundRobin.slice(0, 4))?.kind).toBe("swiss");
  });
});
