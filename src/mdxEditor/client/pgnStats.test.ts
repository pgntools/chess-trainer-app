import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isHeavyPgn, pgnStatsOf } from "./pgnStats";

/*
  What a PGN holds at a glance (CTA-140) — the Components gallery's heavy-PGN
  dialog: games, size, events, dates, players, teams, rounds, results,
  annotation, and the tournament it looks like.
*/

describe("pgnStatsOf", () => {
  it("reads a file's tags and a glance at its moves", () => {
    const pgn = [
      '[Event "Club"]\n[Date "2026.03.02"]\n[Round "2"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 { best } e5 (1... c5 2. Nf3) 1-0',
      '[Event "Club"]\n[Date "2026.03.01"]\n[Round "1.3"]\n[White "B"]\n[Black "C"]\n[Result "1/2-1/2"]\n\n1. d4 d5 1/2-1/2',
      '[Event "Rapid"]\n[Date "????.??.??"]\n[Round "?"]\n[White "C"]\n[Black "A"]\n[Result "*"]\n\n1. c4 *',
    ].join("\n\n");
    const stats = pgnStatsOf(pgn);
    expect(stats).toMatchObject({
      games: 3,
      events: [
        { name: "Club", games: 2 },
        { name: "Rapid", games: 1 },
      ],
      dates: { first: "2026.03.01", last: "2026.03.02" },
      players: 3,
      teams: 0,
      rounds: 2,
      results: { "1-0": 1, "0-1": 0, "1/2-1/2": 1, "*": 1 },
      commented: 1,
      withSideLines: 1,
    });
    expect(stats.bytes).toBe(new TextEncoder().encode(pgn).length);
  });

  it("names the tournament a real file looks like, its teams counted", () => {
    const stats = pgnStatsOf(readFileSync("src/views/blog/articles/tournaments/fidewrt26.pgn", "utf8"));
    expect(stats.games).toBeGreaterThan(1000);
    expect(stats.teams).toBeGreaterThan(10);
    expect(stats.guess?.kind).toBe("teamSwiss");
  });

  it("calls a PGN heavy past the games or the bytes", () => {
    expect(isHeavyPgn(101, 1000, 100)).toBe(true);
    expect(isHeavyPgn(100, 1000, 100)).toBe(false);
    expect(isHeavyPgn(3, 200 * 1024, 100)).toBe(true);
  });
});
