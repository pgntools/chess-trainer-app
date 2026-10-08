import { describe, expect, it } from "vitest";

import { playerPlatesOf, playerResultsOf } from "./playerResults";

describe("playerResultsOf", () => {
  it("reads a decisive game, a draw, and an undecided one", () => {
    expect(playerResultsOf("1-0")).toEqual({ white: "1", black: "0" });
    expect(playerResultsOf("0-1")).toEqual({ white: "0", black: "1" });
    expect(playerResultsOf("1/2-1/2")).toEqual({ white: "½", black: "½" });
    expect(playerResultsOf("*")).toEqual({});
  });
});

describe("playerPlatesOf (CTA-148)", () => {
  it("plates both players with their Elo and result", () => {
    expect(playerPlatesOf({ White: "Amy", Black: "Bob", WhiteElo: "1900", Result: "0-1" })).toEqual({
      white: { name: "Amy", elo: 1900, result: "0" },
      black: { name: "Bob", elo: undefined, result: "1" },
    });
  });

  it("plates the other player as ? when only one is named, as the Library's board does", () => {
    expect(playerPlatesOf({ White: "Amy" })?.black).toEqual({ name: "?", elo: undefined, result: undefined });
  });

  it("plates no one for a position, the spec's unknown, or an analysis' own placeholder players", () => {
    expect(playerPlatesOf({})).toBeUndefined();
    expect(playerPlatesOf({ White: "?", Black: "?", Result: "*" })).toBeUndefined();
    expect(playerPlatesOf({ White: "Analysis", Black: "Analysis", Event: "Analysis Board", Result: "*" })).toBeUndefined();
  });
});
