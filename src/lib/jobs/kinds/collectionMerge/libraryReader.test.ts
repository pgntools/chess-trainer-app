import { describe, expect, it } from "vitest";

import { indexedRowOf } from "../../../collectionIndex";
import { addCollection } from "../../../libraryCollectionStore";
import { findShippedCollection } from "../../../shippedCollections";
import { LibraryCollectionGoneError, libraryReader, libraryReaderOf } from "./libraryReader";

const game = (n: number) => `[Event "Mine"]\n[White "W${n}"]\n[Black "B${n}"]\n[Result "*"]\n\n1. e4 e5 *`;

describe("the collection merge's Library reader (CTA-220)", () => {
  it("reads a shipped collection: its count, and its games a slice at a time", async () => {
    const shipped = findShippedCollection("candidates2026");
    expect(shipped).toBeDefined();
    const all = await shipped!.loadGames();

    expect(await libraryReader.count("candidates2026")).toBe(shipped!.count);
    expect(await libraryReader.read("candidates2026", 0, 10)).toEqual(all.slice(0, 10));
    expect(await libraryReader.read("candidates2026", 50, 500)).toEqual(all.slice(50));
    expect(await libraryReader.read("candidates2026", all.length, 500)).toEqual([]);
  });

  it("reads the reader's own upload", async () => {
    const games = [game(1), game(2), game(3)];
    const added = await addCollection("Mine", games, games.map((pgn) => indexedRowOf(pgn)), new Date("2026-10-16T00:00:00Z"), "umine");
    expect(added).toHaveProperty("collection");

    expect(await libraryReader.count("umine")).toBe(3);
    expect(await libraryReader.read("umine", 1, 500)).toEqual([game(2), game(3)]);
  });

  it("rejects a collection that is not there with the typed error", async () => {
    await expect(libraryReader.count("ugone")).rejects.toBeInstanceOf(LibraryCollectionGoneError);
    const error = await libraryReader.read("ugone", 0, 500).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LibraryCollectionGoneError);
    expect(error).toMatchObject({ code: "source", collectionId: "ugone" });
  });

  it("passes a shipped collection's load failure on as it came", async () => {
    const reader = libraryReaderOf({ shipped: () => Promise.reject(new Error("chunk failed")), uploaded: async () => null });
    await expect(reader.count("tal")).rejects.toThrow("chunk failed");
  });
});
