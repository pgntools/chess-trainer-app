import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION } from "chess.js";

import { treeToPgn } from "./gameTree";
import { PgnParseError, parsePgnTree, splitPgnGames, type PgnMoveCache } from "./pgn";
import { indexPgnGames, parsePgnGameEntries } from "./pgnGames";

const ENDGAME = "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1";
const FILE = `[Event "A"]
[White "Carlsen"]

1. e4 e5 (1... c5) 2. Nf3 *

[Event "B"]
[SetUp "1"]
[FEN "${ENDGAME}"]

1. Kd3 *

[Event "C"]

1. e4 c5 2. Nf3 d6 *`;

describe("indexPgnGames (CTA-208)", () => {
  it("lists every game of the texts by its tags, reading no move", () => {
    const entries = indexPgnGames([FILE, "", '[Event "D"]\n\n1. d4 Ke2?? *']);
    expect(entries.map((entry) => entry.headers.Event)).toEqual(["A", "B", "C", "D"]);
    expect(entries[1].headers.FEN).toBe(ENDGAME);
    expect(entries[0].headers.White).toBe("Carlsen");
    expect(entries.map((entry) => entry.number)).toEqual([1, 2, 3, 4]);
    // The text of each is what parsePgnTree reads.
    expect(entries[0].text).toBe(splitPgnGames(FILE)[0]);
  });
});

describe("parsePgnGameEntries (CTA-208)", () => {
  it("parses every game in order, in slices, telling the progress after each", async () => {
    const entries = indexPgnGames([FILE]);
    const progress: [number, number][] = [];
    // A zero-length slice: one game a slice.
    const trees = await parsePgnGameEntries(entries, { sliceMs: 0, onProgress: (done, total) => progress.push([done, total]) });
    expect(trees.map((tree) => tree.headers.Event)).toEqual(["A", "B", "C"]);
    expect(trees.map((tree) => treeToPgn(tree))).toEqual(entries.map((entry) => treeToPgn(parsePgnTree(entry.text))));
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("stops when aborted, with the signal's reason", async () => {
    const controller = new AbortController();
    const parsing = parsePgnGameEntries(indexPgnGames([FILE]), {
      sliceMs: 0,
      signal: controller.signal,
      onProgress: () => controller.abort(new Error("stopped")),
    });
    await expect(parsing).rejects.toThrow("stopped");
  });

  it("rejects on a game that will not play, numbered by its place", async () => {
    const parsing = parsePgnGameEntries(indexPgnGames([`${FILE}\n\n[Event "D"]\n\n1. e4 e5 2. Qxf7 *`]));
    await expect(parsing).rejects.toBeInstanceOf(PgnParseError);
    await expect(parsing).rejects.toThrow('Game 4: Illegal move "Qxf7".');
  });

  it("numbers a game picked out of many by its place among them", async () => {
    const [, , , bad] = indexPgnGames([`${FILE}\n\n[Event "D"]\n\n1. e4 e5 2. Qxf7 *`]);
    await expect(parsePgnGameEntries([bad])).rejects.toThrow('Game 4: Illegal move "Qxf7".');
  });
});

describe("parsePgnTree's move cache (CTA-208)", () => {
  it("builds the same trees as without one, shared across games", () => {
    const cache: PgnMoveCache = new Map();
    for (const chunk of splitPgnGames(FILE)) {
      expect(parsePgnTree(chunk, undefined, cache)).toEqual(parsePgnTree(chunk));
    }
    // The second game from the standard start found 1. e4 there already.
    expect(cache.has(`${DEFAULT_POSITION} e4`)).toBe(true);
  });
});
