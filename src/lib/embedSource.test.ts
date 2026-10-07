import { describe, expect, it } from "vitest";

import { gameReferenceOf, isBrowserOnly, sourceAddressOf, sourcePathOf } from "./embedSource";

/*
  An embed's source by its app path (CTA-140): the path a resource's screen
  has, copied off the address bar, read back to the address and written out
  canonically.
*/

describe("sourceAddressOf", () => {
  it("reads every screen's path", () => {
    expect(sourceAddressOf("/library/candidates2026")).toEqual({ kind: "collection", collection: "candidates2026" });
    expect(sourceAddressOf("/library/capablanca/12")).toEqual({ kind: "libraryGame", collection: "capablanca", number: 12 });
    expect(sourceAddressOf("/tools/analysis?analysis=a1b2")).toEqual({ kind: "analysis", id: "a1b2" });
    expect(sourceAddressOf("/engine/play?saved=p9")).toEqual({ kind: "playedGame", id: "p9" });
    expect(sourceAddressOf("/repertoires/r7")).toEqual({ kind: "repertoire", id: "r7" });
  });

  it("reads a ?game= reference the Analysis Board opens", () => {
    expect(sourceAddressOf("/tools/analysis?game=play%2Fgames%2Fp9")).toEqual({ kind: "playedGame", id: "p9" });
    expect(sourceAddressOf("/tools/analysis?game=library/tal/3")).toEqual({ kind: "libraryGame", collection: "tal", number: 3 });
    expect(sourceAddressOf("/tools/analysis?game=analysis/saved/a1")).toEqual({ kind: "analysis", id: "a1" });
  });

  it("takes what the address bar shows — the host, the base, the language — and a trailing slash", () => {
    expect(sourceAddressOf("https://pgntools.github.io/chess-trainer-app/he/library/tal/")).toEqual({ kind: "collection", collection: "tal" });
    expect(sourceAddressOf("http://localhost:5214/chess-trainer-app/tools/analysis?analysis=x&move=12")).toEqual({ kind: "analysis", id: "x" });
  });

  it("reads nothing else as an address — a PGN, another screen, a part of one", () => {
    for (const text of ['[Event "x"]\n\n1. e4 *', "1. e4 e5", "/library", "/library/tal/0", "/library/tal/settings", "/tools/analysis", "/repertoires/r/games/2", "/blog/x", "", "/engine/play"]) {
      expect(sourceAddressOf(text), text).toBeUndefined();
    }
  });
});

describe("sourcePathOf and gameReferenceOf", () => {
  it("write an address back as its path, and a stored game's as its ?game= reference", () => {
    for (const path of ["/library/candidates2026", "/library/capablanca/12", "/tools/analysis?analysis=a1b2", "/engine/play?saved=p9", "/repertoires/r7"]) {
      const address = sourceAddressOf(path);
      expect(address, path).toBeDefined();
      if (address !== undefined) expect(sourcePathOf(address)).toBe(path);
    }
    expect(gameReferenceOf({ kind: "libraryGame", collection: "tal", number: 3 })).toBe("library/tal/3");
    expect(gameReferenceOf({ kind: "analysis", id: "a1" })).toBe("analysis/saved/a1");
    expect(gameReferenceOf({ kind: "playedGame", id: "p9" })).toBe("play/games/p9");
    expect(gameReferenceOf({ kind: "collection", collection: "tal" })).toBeUndefined();
  });

  it("knows what only this browser has — the reader's own records and uploads, not a shipped collection", () => {
    const shipped = (collection: string) => collection === "tal";
    expect(isBrowserOnly({ kind: "collection", collection: "tal" }, shipped)).toBe(false);
    expect(isBrowserOnly({ kind: "libraryGame", collection: "u123", number: 1 }, shipped)).toBe(true);
    expect(isBrowserOnly({ kind: "analysis", id: "a" }, shipped)).toBe(true);
    expect(isBrowserOnly({ kind: "repertoire", id: "r" }, shipped)).toBe(true);
  });
});
