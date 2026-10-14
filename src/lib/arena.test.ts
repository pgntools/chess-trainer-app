import { describe, expect, it } from "vitest";

import { arenaOf, defaultArenaScoring, isLichessExport, pliesOfGames, startOf, type Arena } from "./arena";
import type { GameHeaders } from "./gameModel";

/** A game between two players, `minute` minutes into the arena — Lichess's tags. */
const game = (white: string, black: string, result: string, minute: number, extra: GameHeaders = {}): GameHeaders => ({
  Event: "Test Arena",
  Site: `https://lichess.org/g${minute}`,
  Round: "-",
  White: white,
  Black: black,
  Result: result,
  UTCDate: "2026.06.27",
  UTCTime: `20:${String(minute).padStart(2, "0")}:00`,
  ...extra,
});

/** Ada's games against a field of opponents, one a minute — each `[result for Ada, extra tags]`. */
const adaPlays = (results: readonly (readonly [string, GameHeaders?])[]): GameHeaders[] =>
  results.map(([result, extra], index) => game("Ada", `Opponent ${index + 1}`, result, index, extra));

const standingOf = (arena: Arena, name: string) => {
  const standing = arena.standings.find(({ player }) => player.name === name);
  if (standing === undefined) throw new Error(`no ${name}`);
  return standing;
};

const sheetOf = (arena: Arena, name: string) => standingOf(arena, name).games.map((played) => played.score);

describe("arenaOf — Lichess points", () => {
  it("scores a win 2, a draw 1, a loss 0", () => {
    const arena = arenaOf(adaPlays([["1-0"], ["0-1"], ["1/2-1/2"], ["0-1"]]), { scoring: "lichess" });
    expect(sheetOf(arena, "Ada")).toEqual([2, 0, 1, 0]);
    expect(standingOf(arena, "Ada").points).toBe(3);
  });

  it("puts a player on fire after two wins in a row — a win 4, a draw 2 — until a game that is not a win", () => {
    const arena = arenaOf(adaPlays([["1-0"], ["1-0"], ["1-0"], ["1/2-1/2"], ["1-0"], ["1-0"], ["1-0"], ["0-1"], ["1-0"]]), { scoring: "lichess" });
    expect(sheetOf(arena, "Ada")).toEqual([2, 2, 4, 2, 2, 2, 4, 0, 2]);
    expect(standingOf(arena, "Ada").games.map((played) => played.fire)).toEqual([false, false, true, true, false, false, true, true, false]);
    // Lichess's own example: two wins then a draw are worth 6.
    expect(standingOf(arenaOf(adaPlays([["1-0"], ["1-0"], ["1/2-1/2"]]), { scoring: "lichess" }), "Ada").points).toBe(6);
  });

  it("keeps the fire going while the wins do, and says who is on fire at the end", () => {
    const arena = arenaOf(adaPlays([["1-0"], ["1-0"], ["1-0"], ["1-0"]]), { scoring: "lichess" });
    expect(sheetOf(arena, "Ada")).toEqual([2, 2, 4, 4]);
    expect(standingOf(arena, "Ada").onFire).toBe(true);
    expect(standingOf(arenaOf(adaPlays([["1-0"], ["1-0"], ["0-1"]]), { scoring: "lichess" }), "Ada").onFire).toBe(false);
  });

  it("gives a berserked win one more point — on fire too — when the game lasted 7 moves", () => {
    const berserk = { WhiteBerserk: "true" };
    const arena = arenaOf(adaPlays([["1-0", berserk], ["1-0"], ["1-0", berserk], ["0-1", berserk], ["1/2-1/2", berserk]]), {
      scoring: "lichess",
      plies: [30, 30, 30, 30, 30],
    });
    expect(sheetOf(arena, "Ada")).toEqual([3, 2, 5, 0, 1]);
    const games = standingOf(arena, "Ada").games;
    expect(games.map((played) => played.berserk)).toEqual([true, false, true, true, true]);
    expect(games.map((played) => played.berserkScored)).toEqual([true, false, true, false, false]);
  });

  it("gives berserk nothing in a game shorter than 7 moves, and its point where the length is not known", () => {
    const berserk = { WhiteBerserk: "true" };
    const short = arenaOf(adaPlays([["1-0", berserk], ["0-1"], ["1-0", berserk]]), { scoring: "lichess", plies: [13, 40, 14] });
    expect(sheetOf(short, "Ada")).toEqual([2, 0, 3]);
    expect(sheetOf(arenaOf(adaPlays([["1-0", berserk]]), { scoring: "lichess" }), "Ada")).toEqual([3]);
  });

  it("reads Black's berserk from BlackBerserk", () => {
    const arena = arenaOf([game("Bob", "Ada", "0-1", 0, { BlackBerserk: "true" })], { scoring: "lichess", plies: [40] });
    expect(sheetOf(arena, "Ada")).toEqual([3]);
    expect(sheetOf(arena, "Bob")).toEqual([0]);
  });

  it("scores a draw within the first 10 moves nothing — and it still ends the fire", () => {
    const arena = arenaOf(adaPlays([["1-0"], ["1-0"], ["1/2-1/2"], ["1/2-1/2"]]), { scoring: "lichess", plies: [40, 40, 19, 20] });
    expect(sheetOf(arena, "Ada")).toEqual([2, 2, 0, 0]);
    expect(standingOf(arena, "Ada").games[2].voided).toBe("quickDraw");
    // The fourth game is a draw after a draw — a draw streak, and short of 30 moves.
    expect(standingOf(arena, "Ada").games[3].voided).toBe("drawStreak");
    expect(sheetOf(arenaOf(adaPlays([["1/2-1/2"]]), { scoring: "lichess", plies: [20] }), "Ada")).toEqual([1]);
  });

  it("scores only the first draw of a draw streak — a loss does not end it, a win does, a 30-move draw still scores", () => {
    const arena = arenaOf(adaPlays([["1/2-1/2"], ["1/2-1/2"], ["0-1"], ["1/2-1/2"], ["1/2-1/2"], ["1-0"], ["1/2-1/2"]]), {
      scoring: "lichess",
      plies: [40, 40, 40, 40, 60, 40, 40],
    });
    expect(sheetOf(arena, "Ada")).toEqual([1, 0, 0, 0, 1, 2, 1]);
    expect(standingOf(arena, "Ada").games.map((played) => played.voided)).toEqual([undefined, "drawStreak", undefined, "drawStreak", undefined, undefined, undefined]);
  });

  it("replays each player's games in the order they began, whatever the file's order (Lichess's export is newest first)", () => {
    const oldestFirst = adaPlays([["0-1"], ["1-0"], ["1-0"], ["1-0"]]);
    const arena = arenaOf([...oldestFirst].reverse(), { scoring: "lichess" });
    expect(sheetOf(arena, "Ada")).toEqual([0, 2, 2, 4]);
    expect(standingOf(arena, "Ada").games.map((played) => played.startedAt)).toEqual(oldestFirst.map(startOf));
  });

  it("keeps the file's order for games with no time, after the timed ones", () => {
    const untimed = (white: string, black: string, result: string): GameHeaders => ({ White: white, Black: black, Result: result });
    const arena = arenaOf([untimed("Ada", "Bob", "1-0"), game("Ada", "Cy", "0-1", 5), untimed("Ada", "Dee", "1-0")], { scoring: "lichess" });
    expect(standingOf(arena, "Ada").games.map((played) => played.opponent)).toEqual(["Cy", "Bob", "Dee"]);
  });

  it("shows an unfinished game scoring nothing, and it ends the fire", () => {
    const arena = arenaOf(adaPlays([["1-0"], ["1-0"], ["*"], ["1-0"]]), { scoring: "lichess" });
    expect(sheetOf(arena, "Ada")).toEqual([2, 2, 0, 2]);
    expect(arena.unfinished).toBe(1);
  });
});

describe("arenaOf — game points", () => {
  it("scores 1, ½ and 0 with no fire and no berserk", () => {
    const arena = arenaOf(adaPlays([["1-0", { WhiteBerserk: "true" }], ["1-0"], ["1-0"], ["1/2-1/2"]]), { scoring: "game" });
    expect(sheetOf(arena, "Ada")).toEqual([1, 1, 1, 0.5]);
    expect(standingOf(arena, "Ada").points).toBe(3.5);
    expect(standingOf(arena, "Ada").games.some((played) => played.fire || played.berserk)).toBe(false);
  });

  it("ranks by the scoring asked for", () => {
    // Ada: two wins and a draw on fire (lichess 6, game 2½). Bob: three wins with a loss between each (lichess 6 + 0, game 3).
    const games = [
      game("Ada", "X1", "1-0", 0),
      game("Ada", "X2", "1-0", 1),
      game("Ada", "X3", "1/2-1/2", 2),
      game("Bob", "Y1", "1-0", 0),
      game("Bob", "Y2", "0-1", 1),
      game("Bob", "Y3", "1-0", 2),
      game("Bob", "Y4", "0-1", 3),
      game("Bob", "Y5", "1-0", 4),
    ];
    expect(arenaOf(games, { scoring: "lichess" }).standings.slice(0, 2).map(({ player, points }) => [player.name, points])).toEqual([
      ["Ada", 6],
      ["Bob", 6],
    ]);
    expect(arenaOf(games, { scoring: "game" }).standings.slice(0, 2).map(({ player, points }) => [player.name, points])).toEqual([
      ["Bob", 3],
      ["Ada", 2.5],
    ]);
  });
});

describe("arenaOf — the standings", () => {
  it("counts the wins, draws and losses, and ranks a tie by performance — Lichess's: the opponents' ratings ±500, averaged", () => {
    const games = [
      game("Ada", "Bob", "1-0", 0, { WhiteElo: "2000", BlackElo: "2400" }),
      game("Cy", "Dee", "1-0", 0, { WhiteElo: "2000", BlackElo: "1800" }),
      game("Ada", "Dee", "1/2-1/2", 1, { WhiteElo: "2000", BlackElo: "1800" }),
    ];
    const arena = arenaOf(games, { scoring: "lichess" });
    const ada = standingOf(arena, "Ada");
    expect([ada.wins, ada.draws, ada.losses]).toEqual([1, 1, 0]);
    // (2400 + 500 + 1800) / 2
    expect(ada.performance).toBe(2350);
    // Cy: 2 points and a performance of 2300, below Ada's 3 points; Dee and Bob after.
    expect(arena.standings.map(({ rank, player }) => [rank, player.name])).toEqual([
      [1, "Ada"],
      [2, "Cy"],
      [3, "Dee"],
      [4, "Bob"],
    ]);
    expect(standingOf(arena, "Bob").performance).toBe(1500);
  });

  it("leaves out a game naming no one, or the same player twice, and has no performance without a rated opponent", () => {
    const arena = arenaOf([game("Ada", "Ada", "1-0", 0), { Result: "1-0", Black: "Bob" }, game("Ada", "Bob", "1-0", 1)], { scoring: "game" });
    expect(arena.games).toBe(1);
    expect(standingOf(arena, "Ada").performance).toBeUndefined();
  });
});

describe("the scoring a table opens with", () => {
  it("is Lichess points for a Lichess export — every game on lichess.org, with its UTC date and time", () => {
    const games = adaPlays([["1-0"], ["0-1"]]);
    expect(isLichessExport(games)).toBe(true);
    expect(defaultArenaScoring(games)).toBe("lichess");
  });

  it("is game points for anything else", () => {
    const [first, second] = adaPlays([["1-0"], ["0-1"]]);
    expect(defaultArenaScoring([first, { ...second, Site: "Online" }])).toBe("game");
    expect(defaultArenaScoring([first, { ...second, UTCTime: "" }])).toBe("game");
    expect(defaultArenaScoring([])).toBe("game");
  });
});

describe("pliesOfGames", () => {
  it("counts each game's mainline off its movetext — comments, move numbers and the result left out", () => {
    const pgn = (movetext: string) => `[Event "A"]\n[White "Ada"]\n[Black "Bob"]\n\n${movetext}`;
    expect(pliesOfGames([pgn("1. e4 { [%clk 0:01:00] } e5 2. Nf3 Nc6 3. Bb5 1-0"), pgn(" 0-1"), pgn("1. d4 (1. c4) d5 1/2-1/2")])).toEqual([5, 0, 2]);
  });
});
