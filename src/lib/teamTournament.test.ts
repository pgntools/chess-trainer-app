import { describe, expect, it } from "vitest";

import teamSwissPgn from "../views/blog/articles/tournaments/fidewrt26.pgn?raw";
import type { GameHeaders } from "./gameModel";
import { readPgnTags, splitPgnGames } from "./pgn";
import { teamTournamentOf } from "./teamTournament";

/*
  The team tournament helper (CTA-128) over the FIDE World Rapid Team
  Championship 2026 — a 12-round Swiss of 48 teams on six boards, from The
  Week in Chess — then its rules on hand-made games.
*/

const board = (round: string, whiteTeam: string, blackTeam: string, result: string): GameHeaders => ({
  Round: round,
  White: `${whiteTeam} player ${round}`,
  Black: `${blackTeam} player ${round}`,
  WhiteTeam: whiteTeam,
  BlackTeam: blackTeam,
  Result: result,
});

describe("teamTournamentOf", () => {
  describe("the World Rapid Team 2026 — a Swiss of teams", () => {
    const tournament = teamTournamentOf(splitPgnGames(teamSwissPgn).map(readPgnTags));

    it("makes one match of every game two teams play in a round", () => {
      expect(tournament.rounds).toBe(12);
      expect(tournament.games).toBe(1650);
      expect(tournament.standings).toHaveLength(48);
      expect(tournament.matches).toBe(286);
    });

    it("ranks by match points, then board points — three teams on 18", () => {
      expect(tournament.standings.slice(0, 3).map(({ team, matchPoints, boardPoints }) => [team, matchPoints, boardPoints])).toEqual([
        ["Dragon Chilling", 18, 46],
        ["Hexamind Chess Team", 18, 45],
        ["Team MGD1", 18, 45],
      ]);
    });

    it("keeps a match's board points both ways, and the boards the file holds", () => {
      const [first] = tournament.standings[0].rounds[0];
      expect(first).toMatchObject({ round: 1, boardPoints: 4.5, opponentBoardPoints: 1.5, boards: 6, outcome: "win" });
    });
  });

  describe("its rules", () => {
    it("worth 2 match points a win and 1 a draw", () => {
      const tournament = teamTournamentOf([
        board("1.1", "Ajax", "Brugge", "1-0"),
        board("1.2", "Brugge", "Ajax", "1/2-1/2"),
        board("2.1", "Ajax", "Celtic", "0-1"),
        board("2.2", "Celtic", "Ajax", "0-1"),
      ]);
      const ajax = tournament.standings.find((standing) => standing.team === "Ajax")!;
      expect(ajax.matchPoints).toBe(3);
      expect(ajax.boardPoints).toBe(2.5);
      expect(ajax.rounds.map((matches) => matches.map((match) => match.outcome))).toEqual([["win"], ["draw"]]);
    });

    it("scores no match point for a match with an unfinished game", () => {
      const tournament = teamTournamentOf([board("1.1", "Ajax", "Brugge", "1-0"), board("1.2", "Brugge", "Ajax", "*")]);
      expect(tournament.standings.map((standing) => standing.matchPoints)).toEqual([0, 0]);
      expect(tournament.unfinished).toBe(1);
      expect(tournament.standings[0].rounds[0][0].outcome).toBe("unfinished");
    });

    it("leaves out a game that names no teams", () => {
      expect(teamTournamentOf([{ Round: "1.1", White: "Ann", Black: "Bob", Result: "1-0" }]).games).toBe(0);
    });
  });
});
