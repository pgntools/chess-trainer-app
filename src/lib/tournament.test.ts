import { describe, expect, it } from "vitest";

import { CANDIDATES_GAMES, SOFIA_GAMES } from "../test/fixtures/tournamentGames";
import type { GameHeaders } from "./gameModel";
import {
  ROUND_ROBIN_TIE_BREAKS,
  SWISS_TIE_BREAKS,
  gamesBetween,
  tournamentOf,
  type Tournament,
  type TournamentStanding,
} from "./tournament";

/*
  The helper over the two tournament fixtures (`src/test/fixtures/`, CTA-120)
  — Sofia Cup Rapid 2026, a partial nine-round Swiss, and the FIDE Candidates
  2026, a complete double round robin — read as it is meant to be fed: tags
  only, no move replayed. Then its rules, on hand-made games.
*/

const SOFIA = SOFIA_GAMES;
const CANDIDATES = CANDIDATES_GAMES;

const named = (tournament: Tournament, name: string): TournamentStanding => {
  const standing = tournament.standings.find((candidate) => candidate.player.name === name);
  if (standing === undefined) throw new Error(`no player named ${name}`);
  return standing;
};

/** A hand-made game: White, Black, the result and the round. */
const game = (white: string, black: string, result: string, round: string, extra: GameHeaders = {}): GameHeaders => ({
  White: white,
  Black: black,
  Result: result,
  Round: round,
  ...extra,
});

describe("tournamentOf", () => {
  describe("Sofia Cup Rapid 2026 — a partial Swiss", () => {
    const sofia = tournamentOf(SOFIA);

    it("reads 99 players over 9 rounds, 178 games of which 8 are unfinished", () => {
      expect(sofia.standings).toHaveLength(99);
      expect(sofia.rounds).toBe(9);
      expect(sofia.games).toBe(178);
      expect(sofia.unfinished).toBe(8);
      expect(sofia.tieBreaks).toEqual(SWISS_TIE_BREAKS);
    });

    it("takes the rounds from EventRounds", () => {
      expect(SOFIA[0].EventRounds).toBe("9");
      // Without the tag, the highest round seen — the same nine here.
      expect(tournamentOf(SOFIA.map((headers) => ({ ...headers, EventRounds: "?" }))).rounds).toBe(9);
      // A file that stops at round 4 still has the nine the event says.
      const early = tournamentOf(SOFIA.filter((headers) => Number.parseInt(headers.Round, 10) <= 4));
      expect(early.rounds).toBe(9);
      expect(early.standings[0].rounds).toHaveLength(9);
    });

    it("puts Firouzja first on 7.5 / 9 — Buchholz 30.5, Sonneborn-Berger 22.25", () => {
      const [first] = sofia.standings;
      expect(first.rank).toBe(1);
      expect(first.player).toEqual({ id: "12573981", name: "Firouzja, Alireza", title: "GM", rating: 2757, federation: "FRA" });
      expect(first.points).toBe(7.5);
      expect(first.tieBreaks).toEqual({ buchholz: 30.5, sonnebornBerger: 22.25 });
      expect(first.games).toHaveLength(9);
      // One game a round: 1 1 ½ 1 1 1 ½ 1 ½.
      expect(first.rounds.map((round) => round.map((played) => played.outcome).join())).toEqual([
        "win",
        "win",
        "draw",
        "win",
        "win",
        "win",
        "draw",
        "win",
        "draw",
      ]);
    });

    it("says who a round was against, and with which colour", () => {
      const [first] = sofia.standings;
      const [opening] = first.rounds[0];
      expect(opening).toMatchObject({ round: 1, color: "white", outcome: "win", game: 0 });
      expect(sofia.standings.find((standing) => standing.player.id === opening.opponent)?.player.name).toBe("Tisma, Ivan");
    });

    it("ranks by points, then Buchholz, then Sonneborn-Berger", () => {
      expect(sofia.standings.slice(0, 8).map((standing) => [standing.player.name, standing.points, standing.tieBreaks.buchholz])).toEqual([
        ["Firouzja, Alireza", 7.5, 30.5],
        ["Lodici, Lorenzo", 7, 23.5],
        // Four on 6.5, told apart by Buchholz.
        ["Mamedov, Rauf", 6.5, 38],
        ["Alexakis, Dimitris", 6.5, 25.5],
        ["Mastrovasilis, Dimitrios", 6.5, 21],
        ["Plat, Vojtech", 6.5, 18],
        ["Motylev, Alexander", 6.5, 13],
        ["Sjugirov, Sanan", 6, 33],
      ]);
      expect(sofia.standings.map((standing) => standing.rank)).toEqual(Array.from({ length: 99 }, (_, index) => index + 1));
      for (const [index, standing] of sofia.standings.entries()) {
        const next = sofia.standings[index + 1];
        if (next === undefined) break;
        const [a, b] = [standing, next].map((each) => [each.points, each.tieBreaks.buchholz, each.tieBreaks.sonnebornBerger, each.player.rating ?? 0]);
        const differs = a.findIndex((value, at) => value !== b[at]);
        if (differs >= 0) expect(a[differs]).toBeGreaterThan(b[differs]);
      }
    });

    it("gives a player with one game eight rounds of no game — not byes, no points", () => {
      const oneGame = sofia.standings.filter((standing) => standing.games.length === 1);
      expect(oneGame).toHaveLength(38);
      for (const standing of oneGame) {
        expect(standing.rounds).toHaveLength(9);
        expect(standing.rounds.filter((round) => round.length === 0)).toHaveLength(8);
        expect(standing.points).toBeLessThanOrEqual(1);
      }
      expect(sofia.standings.filter((standing) => standing.games.length === 9)).toHaveLength(13);
    });

    it("keeps an unfinished game in its round, scoring nothing and counting for no tie-break", () => {
      const unfinished = sofia.standings.flatMap((standing) => standing.games.filter((played) => played.outcome === "unfinished"));
      expect(unfinished).toHaveLength(16); // 8 games, each seen by both its players

      const cheparinov = named(sofia, "Cheparinov, Ivan");
      // Round 4, board 16, against Ristic: still in its round, as a game.
      expect(cheparinov.rounds[3]).toEqual([expect.objectContaining({ round: 4, color: "white", outcome: "unfinished" })]);
      const finished = cheparinov.games.filter((played) => played.outcome !== "unfinished");
      const pointsOf = (id: string) => sofia.standings.find((standing) => standing.player.id === id)?.points ?? 0;
      expect(cheparinov.points).toBe(finished.filter((played) => played.outcome === "win").length + finished.filter((played) => played.outcome === "draw").length / 2);
      expect(cheparinov.tieBreaks.buchholz).toBe(finished.reduce((sum, played) => sum + pointsOf(played.opponent), 0));
    });
  });

  describe("the FIDE Candidates 2026 — a complete double round robin", () => {
    const candidates = tournamentOf(CANDIDATES, ROUND_ROBIN_TIE_BREAKS);

    it("reads 8 players over 14 rounds — the highest round seen, the file naming none", () => {
      expect(CANDIDATES.some((headers) => "EventRounds" in headers)).toBe(false);
      expect(candidates.standings).toHaveLength(8);
      expect(candidates.rounds).toBe(14);
      expect(candidates.games).toBe(56);
      expect(candidates.unfinished).toBe(0);
      expect(candidates.tieBreaks).toEqual(ROUND_ROBIN_TIE_BREAKS);
    });

    it("ranks by points, then Sonneborn-Berger — Bluebaum ahead of Praggnanandhaa, 42 against 40", () => {
      expect(candidates.standings.map((standing) => [standing.player.name, standing.points, standing.tieBreaks.sonnebornBerger])).toEqual([
        ["Sindarov, Javokhir", 10, 64.75],
        ["Giri, Anish", 8.5, 56.5],
        ["Caruana, Fabiano", 7.5, 48],
        ["Wei, Yi", 7, 44.75],
        ["Nakamura, Hikaru", 6.5, 44.5],
        ["Bluebaum, Matthias", 6, 42],
        ["Praggnanandhaa, R", 6, 40],
        ["Esipenko, Andrey", 4.5, 31.5],
      ]);
    });

    it("has no federation to show — the file carries no country tags", () => {
      expect(candidates.standings.every((standing) => standing.player.federation === undefined)).toBe(true);
      expect(candidates.standings.every((standing) => standing.player.title === "GM")).toBe(true);
    });

    it("finds exactly two games between every pair, in round order, one with each colour", () => {
      for (const standing of candidates.standings) {
        expect(standing.rounds.every((round) => round.length === 1)).toBe(true);
        for (const other of candidates.standings) {
          const between = gamesBetween(standing, other.player.id);
          if (other === standing) {
            expect(between).toEqual([]);
            continue;
          }
          expect(between).toHaveLength(2);
          expect(between[0].round).toBeLessThan(between[1].round ?? 0);
          expect(between.map((played) => played.color).sort()).toEqual(["black", "white"]);
        }
      }
    });

    it("would put the same two the other way round under Buchholz first — the order is the caller's", () => {
      const swiss = tournamentOf(CANDIDATES, SWISS_TIE_BREAKS);
      const [bluebaum, praggnanandhaa] = [named(swiss, "Bluebaum, Matthias"), named(swiss, "Praggnanandhaa, R")];
      // Equal on Buchholz (everyone met everyone), so Sonneborn-Berger still decides.
      expect(bluebaum.tieBreaks.buchholz).toBe(praggnanandhaa.tieBreaks.buchholz);
      expect(bluebaum.rank).toBeLessThan(praggnanandhaa.rank);
      // With no tie-break at all, the higher rating goes first.
      const bare = tournamentOf(CANDIDATES, []);
      expect(named(bare, "Praggnanandhaa, R").rank).toBeLessThan(named(bare, "Bluebaum, Matthias").rank);
    });
  });

  describe("the rules, on hand-made games", () => {
    it("scores 1, ½ and 0, and nothing for an unfinished game", () => {
      const tournament = tournamentOf([
        game("Ann", "Bob", "1-0", "1"),
        game("Cid", "Ann", "1/2-1/2", "2"),
        game("Bob", "Cid", "*", "3"),
      ]);
      expect(tournament.games).toBe(3);
      expect(tournament.unfinished).toBe(1);
      expect(Object.fromEntries(tournament.standings.map((standing) => [standing.player.name, standing.points]))).toEqual({ Ann: 1.5, Cid: 0.5, Bob: 0 });
      expect(named(tournament, "Bob").rounds.map((round) => round.map((played) => played.outcome))).toEqual([["loss"], [], ["unfinished"]]);
    });

    it("computes Buchholz and Sonneborn-Berger by the plain definitions", () => {
      // Ann beats Bob and draws Cid; Bob beats Cid.
      const tournament = tournamentOf([game("Ann", "Bob", "1-0", "1"), game("Ann", "Cid", "1/2-1/2", "2"), game("Bob", "Cid", "1-0", "3")]);
      const ann = named(tournament, "Ann");
      // Bob has 1, Cid ½.
      expect(ann.points).toBe(1.5);
      expect(ann.tieBreaks.buchholz).toBe(1.5);
      expect(ann.tieBreaks.sonnebornBerger).toBe(1 + 0.25);
      expect(named(tournament, "Cid").tieBreaks).toEqual({ buchholz: 2.5, sonnebornBerger: 0.75 });
    });

    it("tells players apart by FIDE id where there is one, by name where there is none", () => {
      const tournament = tournamentOf([
        game("Smith, J", "Lee, A", "1-0", "1", { WhiteFideId: "100", BlackFideId: "200" }),
        // Another Smith, J — a different id, so a different player.
        game("Smith, J", "Lee, A", "0-1", "2", { WhiteFideId: "300", BlackFideId: "200" }),
        // No ids at all: the names decide, and "0" is no id.
        game("Doe, K", "Roe, L", "1-0", "1", { WhiteFideId: "0" }),
        game("Roe, L", "Doe, K", "1-0", "2"),
      ]);
      expect(tournament.standings.map((standing) => standing.player.id).sort()).toEqual(["100", "200", "300", "Doe, K", "Roe, L"]);
      expect(named(tournament, "Lee, A").games).toHaveLength(2);
      expect(named(tournament, "Doe, K").points).toBe(1);
    });

    it("reads the title, rating and federation where a game has them, each optional", () => {
      const tournament = tournamentOf([
        game("Ann", "Bob", "1-0", "1", { WhiteElo: "2400", BlackTitle: "IM" }),
        game("Bob", "Ann", "1-0", "2", { BlackTitle: "WGM", BlackCountry: "ISR", WhiteElo: "?", BlackElo: "2400" }),
      ]);
      expect(named(tournament, "Ann").player).toEqual({ id: "Ann", name: "Ann", title: "WGM", rating: 2400, federation: "ISR" });
      expect(named(tournament, "Bob").player).toEqual({ id: "Bob", name: "Bob", title: "IM", rating: undefined, federation: undefined });
    });

    it("takes the integer part of Round, and keeps a game that names no round out of every round", () => {
      const tournament = tournamentOf([game("Ann", "Bob", "1-0", "3.12"), game("Bob", "Ann", "1-0", "?"), game("Ann", "Bob", "1/2-1/2", "1.1")]);
      expect(tournament.rounds).toBe(3);
      const ann = named(tournament, "Ann");
      expect(ann.games.map((played) => played.round)).toEqual([1, 3, undefined]);
      expect(ann.rounds.map((round) => round.length)).toEqual([1, 0, 1]);
      // It still counts: a game is a game.
      expect(ann.points).toBe(1.5);
    });

    it("breaks what the tie-breaks leave by rating, then by name", () => {
      const tournament = tournamentOf([
        game("Zed", "Amy", "1/2-1/2", "1", { WhiteElo: "2000", BlackElo: "2100" }),
        game("Moe", "Abe", "1/2-1/2", "1"),
      ]);
      expect(tournament.standings.map((standing) => standing.player.name)).toEqual(["Amy", "Zed", "Abe", "Moe"]);
    });

    it("leaves out a game that names no player, or one player twice", () => {
      const tournament = tournamentOf([game("Ann", "?", "1-0", "1"), game("Ann", "Ann", "1-0", "1"), { Result: "1-0" }]);
      expect(tournament).toEqual({ rounds: 0, games: 0, unfinished: 0, tieBreaks: SWISS_TIE_BREAKS, standings: [] });
    });

    it("makes nothing of no games", () => {
      expect(tournamentOf([]).standings).toEqual([]);
      expect(tournamentOf([]).rounds).toBe(0);
    });
  });
});
