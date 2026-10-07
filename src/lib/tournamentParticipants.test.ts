import { describe, expect, it } from "vitest";

import { TEAM_KNOCKOUT_GAMES } from "../test/fixtures/formatGames";
import { CANDIDATES_GAMES, fixtureGame } from "../test/fixtures/tournamentGames";
import { participantsOf, topPlayersOf } from "./tournamentParticipants";

/*
  The Library's Participants tab (CTA-142): every player's record, read from
  the games' tags over `tournamentOf` — on the Candidates' real file, a team
  knockout's, and hand-made games at the edges.
*/

const AMY = { name: "Amy", elo: 2000 };
const BOB = { name: "Bob", elo: 1800 };
const CAT = { name: "Cat" };

describe("participantsOf", () => {
  it("reads every player's record off the Candidates, in the standings' order", () => {
    const participants = participantsOf(CANDIDATES_GAMES);
    expect(participants).toHaveLength(8);
    const [winner, second] = participants;
    expect(winner).toMatchObject({ points: 10, games: 14, wins: 6, draws: 8, losses: 0, unfinished: 0, unbeatenRun: 14, performance: 2909 });
    expect(winner.player.name).toBe("Sindarov, Javokhir");
    expect(second).toMatchObject({ points: 8.5, wins: 4, draws: 9, losses: 1, unbeatenRun: 13 });
    expect(winner.team).toBeUndefined();
  });

  it("names each team event's player's team", () => {
    const [first] = participantsOf(TEAM_KNOCKOUT_GAMES);
    expect(first).toMatchObject({ team: "Dragon Chilling", points: 8, games: 10, wins: 8, losses: 2 });
    expect(first.player.name).toBe("Lu, Shanglei");
  });

  it("counts an unfinished game without scoring it, and gives no performance without a rated opponent", () => {
    const participants = participantsOf([
      fixtureGame(1, AMY, BOB, "1-0"),
      fixtureGame(2, BOB, AMY, "1/2-1/2"),
      fixtureGame(3, AMY, CAT, "0-1"),
      fixtureGame(4, CAT, BOB, "*"),
    ]);
    const byName = new Map(participants.map((participant) => [participant.player.name, participant]));
    expect(byName.get("Amy")).toMatchObject({ points: 1.5, games: 3, wins: 1, draws: 1, losses: 1, unbeatenRun: 2 });
    // Amy's rated games: 1½ of 2 against Bob's 1800 — 1800 + 400·log10(3).
    expect(byName.get("Amy")?.performance).toBe(1991);
    expect(byName.get("Bob")).toMatchObject({ games: 3, unfinished: 1, losses: 1 });
    // Cat's one finished game was against Amy (rated): a perfect score is +800.
    expect(byName.get("Cat")?.performance).toBe(2800);
    expect(participantsOf([fixtureGame(1, { name: "X" }, { name: "Y" }, "1-0")])[0].performance).toBeUndefined();
  });
});

describe("topPlayersOf", () => {
  it("names the best score, performance, wins and unbeaten run", () => {
    const top = topPlayersOf(participantsOf(CANDIDATES_GAMES));
    for (const standout of [top.score, top.performance, top.wins, top.unbeaten]) {
      expect(standout?.player.name).toBe("Sindarov, Javokhir");
    }
  });

  it("names nobody for a standout no one reached", () => {
    const top = topPlayersOf(participantsOf([fixtureGame(1, { name: "X" }, { name: "Y" }, "*")]));
    expect(top).toEqual({ score: undefined, performance: undefined, wins: undefined, unbeaten: undefined });
    expect(topPlayersOf([])).toEqual({ score: undefined, performance: undefined, wins: undefined, unbeaten: undefined });
  });
});
