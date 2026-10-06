import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { decodeCollectionIndex, encodeCollectionIndex, textHash } from "./collectionIndex";
import { collectionGamesOf } from "./libraryCollections";
import {
  findShippedCollection,
  peekShippedGames,
  peekShippedRows,
  shippedCollections,
  shippedCollectionsOf,
} from "./shippedCollections";

/**
 * The shipped collections: what `node scripts/wirepgn.js` wired into
 * `src/data/library/` — and the guard that keeps the folder honest, so a file
 * dropped in unwired, or edited after it was indexed, fails here rather than
 * showing a table that disagrees with its games.
 */

const FOLDER = join(process.cwd(), "src/data/library");
const manifest = JSON.parse(readFileSync(join(FOLDER, "manifest.json"), "utf8")) as {
  collections: { id: string; name: string; pgn: string; index: string; games: number; hash: string }[];
};

describe("the wired folder", () => {
  it("has every .pgn wired — run `node scripts/wirepgn.js <file.pgn>` for one that is not", () => {
    const pgns = readdirSync(FOLDER).filter((file) => file.endsWith(".pgn")).sort();
    expect(manifest.collections.map((entry) => entry.pgn).sort()).toEqual(pgns);
  });

  it.each(manifest.collections.map((entry) => [entry.id, entry] as const))(
    "%s: its PGN, index and manifest entry agree — re-wire it if not",
    (_id, entry) => {
      const text = readFileSync(join(FOLDER, entry.pgn), "utf8");
      expect(textHash(text)).toBe(entry.hash);
      const index = decodeCollectionIndex(JSON.parse(readFileSync(join(FOLDER, entry.index), "utf8")));
      expect(index?.hash).toBe(entry.hash);
      expect(index?.rows).toHaveLength(entry.games);
      expect(collectionGamesOf(text)).toHaveLength(entry.games);
    },
  );
});

describe("the shipped collections", () => {
  it("are the five players' games and five tournaments, by name, counted without a fetch", () => {
    expect(shippedCollections.map((entry) => [entry.id, entry.name, entry.count])).toEqual([
      ["alekhine", "Alekhine", 2005],
      ["capablanca", "Capablanca", 1035],
      // CTA-128: tournaments, for the Blog's <Collection…Table> and <Collection…Bracket> to show on every device.
      ["esportsplayin2026", "Esports World Cup 2026 — play-in", 30],
      ["candidates2026", "FIDE Candidates 2026", 56],
      ["fischer", "Fischer", 1063],
      ["netherlands2026", "Netherlands Championship 2026", 46],
      ["petrosian", "Petrosian", 2017],
      ["tal", "Tal", 2636],
      ["worldblitzteam2026", "World Blitz Team 2026 — final stage", 216],
      ["worldrapidteam2026", "World Rapid Team 2026", 1650],
    ]);
    expect(peekShippedRows("capablanca")).toBeUndefined();
  });

  it.each([
    ["alekhine", 2005],
    ["capablanca", 1035],
    ["fischer", 1063],
    ["petrosian", 2017],
    ["tal", 2636],
    ["candidates2026", 56],
    ["esportsplayin2026", 30],
    ["netherlands2026", 46],
    ["worldblitzteam2026", 216],
    ["worldrapidteam2026", 1650],
  ])("%s: its index is its table's rows, and its PGN its games", async (id, count) => {
    const entry = findShippedCollection(id)!;
    const rows = await entry.loadRows();
    expect(rows).toHaveLength(count);
    expect(rows.map((row) => row.number)).toEqual(Array.from({ length: count }, (_, index) => index + 1));
    expect(rows.every((row) => row.white !== undefined && row.moves > 0 && !row.unreadable)).toBe(true);
    // Fetched once, read synchronously after that.
    expect(peekShippedRows(id)).toBe(rows);
    expect(await entry.loadRows()).toBe(rows);

    const games = await entry.loadGames();
    expect(games).toHaveLength(count);
    expect(peekShippedGames(id)).toBe(games);
  });

  it("fills an opening in from the book where the file's tags have none", async () => {
    // Capablanca's games carry an ECO and no Opening tag.
    const rows = await findShippedCollection("capablanca")!.loadRows();
    expect(rows.every((row) => row.opening !== undefined)).toBe(true);
  });
});

describe("reading a manifest", () => {
  const PGN = '[Event "x"]\n[White "A"]\n[Black "B"]\n\n1. e4 *\n\n[Event "x"]\n\n1. d4 *';
  const INDEX = encodeCollectionIndex({ hash: "", rows: [{ result: "*", moves: 1 }, { result: "*", moves: 1 }] });
  const loaders = (files: Record<string, string>) =>
    Object.fromEntries(Object.entries(files).map(([name, text]) => [`../data/library/${name}`, () => Promise.resolve(text)]));

  it("lists its entries by name, and loads what they name", async () => {
    const entries = shippedCollectionsOf(
      {
        collections: [
          { id: "t-zed", name: "Zed", pgn: "Z.pgn", index: "Z.index.json", games: 2, hash: "" },
          { id: "t-amy", name: "Amy", pgn: "A.pgn", index: "A.index.json", games: 2, hash: "" },
        ],
      },
      loaders({ "Z.pgn": PGN, "A.pgn": PGN }),
      loaders({ "Z.index.json": INDEX, "A.index.json": INDEX }),
    );
    expect(entries.map((entry) => entry.id)).toEqual(["t-amy", "t-zed"]);
    expect(await entries[0].loadGames()).toHaveLength(2);
    expect((await entries[0].loadRows()).map((row) => row.number)).toEqual([1, 2]);
  });

  it("marks the shipped tournaments from the manifest, each with the table it is drawn as (CTA-142)", () => {
    expect(
      shippedCollections.filter((entry) => entry.tournament !== undefined).map((entry) => [entry.id, entry.tournament?.type, entry.sharedEvent]),
    ).toEqual([
      ["esportsplayin2026", "doubleElimination", true],
      ["candidates2026", "roundRobin", true],
      ["netherlands2026", "knockout", true],
      ["worldblitzteam2026", "teamKnockout", true],
      ["worldrapidteam2026", "teamSwiss", true],
    ]);
    expect(findShippedCollection("tal")?.tournament).toBeUndefined();
    // An unknown format is read as no mark.
    const [entry] = shippedCollectionsOf(
      { collections: [{ id: "t-cup", name: "Cup", pgn: "A.pgn", index: "A.index.json", games: 2, tournament: "bughouse" }] },
      loaders({ "A.pgn": PGN }),
      loaders({ "A.index.json": INDEX }),
    );
    expect(entry.tournament).toBeUndefined();
  });

  it("leaves out a malformed entry, one whose files are missing, and a taken id", () => {
    const entries = shippedCollectionsOf(
      {
        collections: [
          { id: "t-one", name: "One", pgn: "A.pgn", index: "A.index.json", games: 2 },
          { id: "t-one", name: "Again", pgn: "A.pgn", index: "A.index.json", games: 2 },
          { id: "t-gone", name: "Gone", pgn: "Gone.pgn", index: "Gone.index.json", games: 2 },
          { name: "No id" },
        ],
      },
      loaders({ "A.pgn": PGN }),
      loaders({ "A.index.json": INDEX }),
    );
    expect(entries.map((entry) => entry.name)).toEqual(["One"]);
    expect(shippedCollectionsOf(null, {}, {})).toEqual([]);
  });

  it("refuses an index that does not match its entry", async () => {
    const [entry] = shippedCollectionsOf(
      { collections: [{ id: "t-bad", name: "Bad", pgn: "A.pgn", index: "A.index.json", games: 5 }] },
      loaders({ "A.pgn": PGN }),
      loaders({ "A.index.json": INDEX }),
    );
    await expect(entry.loadRows()).rejects.toThrow("not the index");
    expect(peekShippedRows("t-bad")).toBeNull();
  });
});
