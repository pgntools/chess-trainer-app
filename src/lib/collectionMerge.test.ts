import { describe, expect, it } from "vitest";

import {
  defaultMergeName,
  fnv1a64,
  gameKeyOf,
  mergeCollectionGames,
  mergeNameOf,
  normalisedGameText,
} from "./collectionMerge";

/*
  **Library collections merged, the pure part** (CTA-232; the hashing and the
  dedupe modes CTA-220's): the name, a game's identity under each mode, and
  the merge itself — the sources' games in order, normalised, duplicates
  counted and left out, the length the Library holds a collection to.
*/

const game = (white: string, black: string, date: string, moves: string, extra = "") =>
  `[Event "Test"]\n[White "${white}"]\n[Black "${black}"]\n[Date "${date}"]\n[Result "*"]${extra}\n\n${moves} *`;

/** Game n of a numbered series: distinct players, one short line. */
const numbered = (n: number) => game(`White ${n}`, `Black ${n}`, "2026.01.01", "1. e4 e5 2. Nf3 Nc6");

describe("the merge's name", () => {
  it("defaults to '<first> + <n> more', in the reader's words for 'more'", () => {
    expect(defaultMergeName([{ name: "Tal" }, { name: "Fischer" }, { name: "Mine" }])).toBe("Tal + 2 more");
    expect(defaultMergeName([{ name: "Tal" }, { name: "Fischer" }], (count) => `ועוד ${count}`)).toBe("Tal + ועוד 1");
    expect(defaultMergeName([{ name: "Tal" }])).toBe("Tal");
    expect(defaultMergeName([{ name: "  " }, { name: "B" }])).toBe("Collection + 1 more");
    expect(defaultMergeName([])).toBe("Merged collections");
  });

  it("is the typed name, trimmed, else the default — held to the Library's limit", () => {
    const sources = [{ name: "Tal" }, { name: "Fischer" }];
    expect(mergeNameOf("  Both  ", sources)).toBe("Both");
    expect(mergeNameOf("   ", sources)).toBe("Tal + 1 more");
    expect(mergeNameOf("x".repeat(300), sources)).toHaveLength(100);
  });
});

describe("a game's identity", () => {
  it("is 64-bit FNV-1a, as its reference vectors", () => {
    expect(fnv1a64("")).toBe("cbf29ce484222325");
    expect(fnv1a64("a")).toBe("af63dc4c8601ec8c");
    expect(fnv1a64("foobar")).toBe("85944171f73967e8");
  });

  it("normalises line endings and trailing space before anything compares", () => {
    expect(normalisedGameText('[Event "x"]  \r\n\r\n1. e4 *\t\r\n')).toBe('[Event "x"]\n\n1. e4 *');
  });

  const plain = game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6");
  const annotated = game("Tal", "Botvinnik", "1960.03.15", "1. e4 {The king's pawn} e5 2. Nf3! $1 Nc6 (2... d6 3. d4) 3. Bb5 a6?!", '\n[Annotator "Someone"]');
  const otherGame = game("Tal", "Botvinnik", "1960.03.15", "1. d4 Nf6 2. c4 e6");

  it("none: no identity", () => {
    expect(gameKeyOf(plain, "none")).toBeUndefined();
  });

  it("identical-pgn: the text — the same game with other comments is another", () => {
    expect(gameKeyOf(normalisedGameText(`${plain}  \r\n`), "identical-pgn")).toBe(gameKeyOf(plain, "identical-pgn"));
    expect(gameKeyOf(annotated, "identical-pgn")).not.toBe(gameKeyOf(plain, "identical-pgn"));
  });

  it("same-game: the moves, White, Black and Date — comments, NAGs, glyphs and side lines aside", () => {
    expect(gameKeyOf(annotated, "same-game")).toBe(gameKeyOf(plain, "same-game"));
    expect(gameKeyOf(otherGame, "same-game")).not.toBe(gameKeyOf(plain, "same-game"));
    expect(gameKeyOf(game("Tal", "Botvinnik", "1960.03.16", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6"), "same-game")).not.toBe(gameKeyOf(plain, "same-game"));
    expect(gameKeyOf(game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. 0-0"), "same-game")).toBe(
      gameKeyOf(game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O"), "same-game"),
    );
  });
});

describe("the merge (CTA-232)", () => {
  const a = [numbered(1), numbered(2), `${numbered(3)}  \r\n`];
  const b = [numbered(3), numbered(4)];

  it("keeps every game of every source in order under none", () => {
    const merged = mergeCollectionGames([a, b], "none");
    expect(merged.games).toEqual([numbered(1), numbered(2), numbered(3), numbered(3), numbered(4)]);
    expect(merged.counts).toEqual([
      { read: 3, written: 3, duplicates: 0 },
      { read: 2, written: 2, duplicates: 0 },
    ]);
    expect(merged.totals).toEqual({ read: 5, written: 5, duplicates: 0 });
  });

  it("drops a copy written already, the first kept — normalised, so a CRLF copy is one", () => {
    const merged = mergeCollectionGames([a, b], "identical-pgn");
    expect(merged.games).toEqual([numbered(1), numbered(2), numbered(3), numbered(4)]);
    expect(merged.counts[1]).toEqual({ read: 2, written: 1, duplicates: 1 });
    expect(merged.totals).toEqual({ read: 5, written: 4, duplicates: 1 });
  });

  it("drops the same game annotated elsewhere under same-game, never under identical-pgn", () => {
    const plain = game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6");
    const annotated = game("Tal", "Botvinnik", "1960.03.15", "1. e4 {A comment} e5 2. Nf3 Nc6");
    expect(mergeCollectionGames([[plain], [annotated]], "same-game").games).toEqual([plain]);
    expect(mergeCollectionGames([[plain], [annotated]], "identical-pgn").games).toEqual([plain, annotated]);
  });

  it("dedupes inside one source too", () => {
    expect(mergeCollectionGames([[numbered(1), numbered(1)], [numbered(2)]], "identical-pgn").counts[0]).toEqual({ read: 2, written: 1, duplicates: 1 });
  });

  it("counts the PGN's length — each game and the blank line after it", () => {
    const merged = mergeCollectionGames([[numbered(1)], [numbered(2)]], "none");
    expect(merged.chars).toBe(numbered(1).length + 2 + numbered(2).length + 2);
  });

  it("merges empty sources to nothing", () => {
    expect(mergeCollectionGames([[], []], "same-game")).toEqual({
      games: [],
      counts: [
        { read: 0, written: 0, duplicates: 0 },
        { read: 0, written: 0, duplicates: 0 },
      ],
      totals: { read: 0, written: 0, duplicates: 0 },
      chars: 0,
    });
  });

  it("merges thousands of games in well under a second — no chess.js pass", () => {
    const big = Array.from({ length: 5_000 }, (_, index) => numbered(index));
    const started = performance.now();
    const merged = mergeCollectionGames([big, big], "same-game");
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(merged.totals).toEqual({ read: 10_000, written: 5_000, duplicates: 5_000 });
  });
});
