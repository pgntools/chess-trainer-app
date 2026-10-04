import { describe, expect, it } from "vitest";

import { DOUBLE_ELIMINATION_GAMES, FINAL_STAGE_GAMES, KNOCKOUT_GAMES, TEAM_KNOCKOUT_GAMES } from "../test/fixtures/formatGames";
import type { GameHeaders } from "./gameModel";
import { knockoutOf, type KnockoutMatch, type KnockoutRound } from "./knockout";

/*
  The knockout helper (CTA-128) over three of The Week in Chess's files — a
  knockout with tiebreaks, a double elimination, a team knockout in legs —
  then its rules on hand-made games.
*/

const names = (match: KnockoutMatch) => match.sides.map((side) => side.competitor.name);
const scores = (match: KnockoutMatch) => match.sides.map((side) => side.score);
const winnerOf = (match: KnockoutMatch) => (match.winner === undefined ? undefined : names(match)[match.winner]);
const winnersOf = (round: KnockoutRound) => round.matches.map(winnerOf);

const game = (round: string, white: string, black: string, result: string, extra: GameHeaders = {}): GameHeaders => ({
  Round: round,
  White: white,
  Black: black,
  Result: result,
  ...extra,
});

describe("knockoutOf", () => {
  describe("the Dutch championship 2026 — a knockout of 16, tiebreaks in the same rounds", () => {
    const knockout = knockoutOf(KNOCKOUT_GAMES);

    it("is one bracket of four rounds, 8, 4, 2 and 1 matches", () => {
      expect(knockout.teams).toBe(false);
      expect(knockout.losers).toBeUndefined();
      expect(knockout.winners.rounds.map((round) => round.matches.length)).toEqual([8, 4, 2, 1]);
      expect(knockout.games).toBe(46);
    });

    it("counts a match's tiebreak games in its score — Sokolov through on the rapid games", () => {
      const [first] = knockout.winners.rounds[0].matches;
      expect(names(first)).toEqual(["Burg, Twan", "Sokolov, Ivan"]);
      expect(scores(first)).toEqual([1.5, 2.5]);
      expect(first.games).toHaveLength(4);
      expect(winnerOf(first)).toBe("Sokolov, Ivan");
    });

    it("orders each round so that the two matches whose winners meet next sit side by side", () => {
      const [first, second, third] = knockout.winners.rounds;
      expect(winnersOf(first)).toEqual(["Sokolov, Ivan", "Van den Doel, Erik", "L'Ami, Erwin", "Tiviakov, Sergei", "Warmerdam, Max", "Van Wely, Loek", "Ernst, Sipke", "Vrolijk, Liam"]);
      expect(second.matches.map(names)).toEqual([
        ["Sokolov, Ivan", "Van den Doel, Erik"],
        ["L'Ami, Erwin", "Tiviakov, Sergei"],
        ["Warmerdam, Max", "Van Wely, Loek"],
        ["Ernst, Sipke", "Vrolijk, Liam"],
      ]);
      expect(winnersOf(third)).toEqual(["Tiviakov, Sergei", "Vrolijk, Liam"]);
      expect(winnersOf(knockout.winners.rounds[3])).toEqual(["Tiviakov, Sergei"]);
    });
  });

  describe("the Esports World Cup 2026's play-in — a double elimination", () => {
    const knockout = knockoutOf(DOUBLE_ELIMINATION_GAMES, { losersFromRound: 51 });

    it("keeps rounds 51 and up as the losers' bracket, numbered from 1", () => {
      expect(knockout.winners.rounds.map((round) => round.matches.length)).toEqual([4, 2, 1]);
      expect(knockout.losers?.rounds.map((round) => round.round)).toEqual([1, 2, 3, 4]);
      expect(knockout.losers?.rounds.map((round) => round.matches.length)).toEqual([2, 2, 1, 1]);
    });

    it("sends a winners' bracket loser into the losers' bracket: Artemiev, beaten by Wei, meets Esipenko in its final", () => {
      expect(winnersOf(knockout.winners.rounds[2])).toEqual(["Wei, Yi"]);
      const final = knockout.losers!.rounds[3].matches[0];
      expect(names(final)).toEqual(["Esipenko, Andrey", "Artemiev, Vladislav"]);
      expect(winnerOf(final)).toBe("Esipenko, Andrey");
    });

    it("is one bracket with no losersFromRound", () => {
      expect(knockoutOf(DOUBLE_ELIMINATION_GAMES).losers).toBeUndefined();
    });
  });

  describe("the Esports World Cup 2026's final stage — a knockout with a match for third place", () => {
    const knockout = knockoutOf(FINAL_STAGE_GAMES);

    it("puts the final first in the last round, and the semi-finals' losers' match after it, for third place", () => {
      const last = knockout.winners.rounds[2];
      expect(last.matches.map(names)).toEqual([
        ["Carlsen, Magnus", "Lazavik, Denis"],
        ["Nakamura, Hikaru", "Firouzja, Alireza"],
      ]);
      expect(last.matches.map((match) => match.thirdPlace)).toEqual([undefined, true]);
      expect(winnersOf(last)).toEqual(["Carlsen, Magnus", "Nakamura, Hikaru"]);
    });

    it("counts both parts of the final in one match", () => {
      const final = knockout.winners.rounds[2].matches[0];
      expect(final.games).toHaveLength(8);
      expect(scores(final)).toEqual([6, 2]);
    });
  });

  describe("the World Blitz Team final stage 2026 — a team knockout in legs", () => {
    const knockout = knockoutOf(TEAM_KNOCKOUT_GAMES);

    it("is between teams: a match is the legs won, the board points beside them", () => {
      expect(knockout.teams).toBe(true);
      const match = knockout.winners.rounds[1].matches.find((candidate) => names(candidate).includes("Dragon Chilling"))!;
      expect(names(match)).toEqual(["Dragon Chilling", "Mr Birdie and friends"]);
      expect(match.legs).toBe(3);
      expect(scores(match)).toEqual([2, 1]);
      expect(match.sides.map((side) => side.boardPoints)).toEqual([10, 8]);
    });

    it("finds its match for third place too", () => {
      expect(knockout.winners.rounds[3].matches.map((match) => [names(match), match.thirdPlace])).toEqual([
        [["Endgame.AI", "Dragon Chilling"], undefined],
        [["Hexamind Chess Team", "Uzbekistan"], true],
      ]);
    });

    it("scores a drawn leg ½ to each team", () => {
      const match = knockout.winners.rounds[0].matches.find((candidate) => names(candidate).includes("Uzbekistan"))!;
      expect(scores(match)).toEqual([0.5, 1.5]);
    });
  });

  describe("its rules", () => {
    it("lets the side that plays on win a level match — an Armageddon the file has no result for", () => {
      const knockout = knockoutOf([
        game("1.1", "Ann", "Bob", "1/2-1/2"),
        game("1.1", "Cat", "Dan", "1-0"),
        game("2.1", "Bob", "Cat", "1-0"),
      ]);
      expect(winnerOf(knockout.winners.rounds[0].matches.find((match) => names(match).includes("Ann"))!)).toBe("Bob");
    });

    it("names no winner of a level match nobody plays on from", () => {
      expect(knockoutOf([game("1.1", "Ann", "Bob", "1/2-1/2")]).winners.rounds[0].matches[0].winner).toBeUndefined();
    });

    it("scores an unfinished game for neither side, and counts it", () => {
      const knockout = knockoutOf([game("1.1", "Ann", "Bob", "1-0"), game("1.2", "Bob", "Ann", "*")]);
      expect(knockout.unfinished).toBe(1);
      expect(scores(knockout.winners.rounds[0].matches[0])).toEqual([1, 0]);
      expect(knockout.winners.rounds[0].matches[0].unfinished).toBe(1);
    });

    it("leaves out a game with no round or no second player", () => {
      expect(knockoutOf([game("", "Ann", "Bob", "1-0"), { Round: "1.1", White: "Ann", Result: "1-0" }]).games).toBe(0);
    });
  });
});
