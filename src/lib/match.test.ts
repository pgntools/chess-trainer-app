import { describe, expect, it } from "vitest";

import { MATCH_GAMES } from "../test/fixtures/formatGames";
import { matchOf } from "./match";

/* The match helper (CTA-128) over Clutch Chess: The Legends 2026, then its rules. */

describe("matchOf", () => {
  it("reads Kasparov – Topalov: the leader first, every game in order with its colours and time control", () => {
    const match = matchOf(MATCH_GAMES)!;
    expect(match.players.map((player) => player.name)).toEqual(["Topalov, Veselin", "Kasparov, Garry"]);
    expect(match.points).toEqual([8, 4]);
    expect(match.games).toHaveLength(12);
    expect(match.games[0]).toMatchObject({ round: 1, colors: ["white", "black"], outcomes: ["win", "loss"], timeControl: "1500+10" });
    expect(match.games[3]).toMatchObject({ round: 4, colors: ["black", "white"], outcomes: ["loss", "win"], timeControl: "300+3" });
  });

  it("is no match when the games are between more than two players, or there are none", () => {
    expect(
      matchOf([
        { White: "Ann", Black: "Bob", Result: "1-0" },
        { White: "Ann", Black: "Cat", Result: "1-0" },
      ]),
    ).toBeUndefined();
    expect(matchOf([])).toBeUndefined();
  });

  it("puts a game with no round last, and an unfinished one scores nothing", () => {
    const match = matchOf([
      { White: "Ann", Black: "Bob", Result: "*" },
      { White: "Bob", Black: "Ann", Result: "0-1", Round: "1" },
    ])!;
    expect(match.games.map((game) => game.round)).toEqual([1, undefined]);
    expect(match.points).toEqual([1, 0]);
    expect(match.unfinished).toBe(1);
  });
});
