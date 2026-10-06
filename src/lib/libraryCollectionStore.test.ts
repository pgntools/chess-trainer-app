import { beforeEach, describe, expect, it, vi } from "vitest";

import { indexedRowOf } from "./collectionIndex";
import {
  addCollection,
  appendCollectionGames,
  insertCollectionGame,
  LIBRARY_DB_NAME,
  loadUploadedCollections,
  loadUploadedGames,
  loadUploadedRows,
  peekUploadedGames,
  peekUploadedRows,
  removeCollection,
  removeCollectionGames,
  replaceCollectionGame,
  resetLibraryCollectionStore,
  updateCollectionSettings,
  uploadedCollectionsSnapshot,
} from "./libraryCollectionStore";

/*
  The reader's uploaded collections in IndexedDB (fake-indexeddb under jsdom,
  src/test/setup.ts): a summary, an index and the games per collection, kept
  in step by every write, and read back as a new session would.
*/

const ONE = '[White "A"]\n[Black "B"]\n\n1. e4 e5 *';
const TWO = '[White "C"]\n[Black "D"]\n\n1. d4 d5 *';
const COPY = '[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 *';

beforeEach(async () => {
  await resetLibraryCollectionStore();
});

const added = async (name = "Mine", games = [ONE, TWO], at = "2026-09-21T10:00:00Z") => {
  const result = await addCollection(name, games, games.map((pgn) => indexedRowOf(pgn)), new Date(at));
  if (!("collection" in result)) throw new Error("not added");
  return result.collection;
};

/** A fresh instance of the store — a reload: nothing read yet, the database as it was. */
const reload = async () => {
  vi.resetModules();
  return import("./libraryCollectionStore");
};

describe("the uploaded collections", () => {
  it("keeps a collection, newest first, as a new session reads it back", async () => {
    const first = await added("First");
    const second = await added("Second", [TWO], "2026-09-21T11:00:00Z");

    expect(uploadedCollectionsSnapshot()?.map((c) => [c.name, c.count])).toEqual([
      ["Second", 1],
      ["First", 2],
    ]);
    expect(first).toMatchObject({ source: "uploaded", count: 2, addedAt: "2026-09-21T10:00:00.000Z" });
    expect(first.id).toMatch(/^u/);

    const fresh = await reload();
    expect(fresh.uploadedCollectionsSnapshot()).toBeUndefined();
    expect((await fresh.loadUploadedCollections()).map((c) => c.id)).toEqual([second.id, first.id]);
    expect(await fresh.loadUploadedGames(first.id)).toEqual([ONE, TWO]);
    expect((await fresh.loadUploadedRows(first.id))?.map((row) => [row.number, row.white])).toEqual([
      [1, "A"],
      [2, "C"],
    ]);
    await fresh.resetLibraryCollectionStore();
  });

  it("keeps what it has read, for a synchronous second visit", async () => {
    const mine = await added();
    // Just written: already known.
    expect(peekUploadedGames(mine.id)).toEqual([ONE, TWO]);
    const rows = await loadUploadedRows(mine.id);
    expect(peekUploadedRows(mine.id)).toBe(rows);
    expect(await loadUploadedRows("nothing")).toBeNull();
    expect(peekUploadedRows("nothing")).toBeNull();
  });

  it("holds 10,000 games in one collection", async () => {
    const games = Array.from({ length: 10_000 }, (_, index) => (index % 2 === 0 ? ONE : TWO));
    const rows = games.map((_, index) => indexedRowOf(index % 2 === 0 ? ONE : TWO));
    const result = await addCollection("Big", games, rows);
    expect(result).toHaveProperty("collection.count", 10_000);
  });

  it("tells a subscriber once the first read lands, and after each write", async () => {
    await added("Before");
    const fresh = await reload();
    const listener = vi.fn();
    const unsubscribe = fresh.subscribeUploadedCollections(listener);
    expect(fresh.uploadedCollectionsSnapshot()).toBeUndefined();
    await vi.waitFor(() => expect(fresh.uploadedCollectionsSnapshot()).toHaveLength(1));
    const calls = listener.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    await fresh.addCollection("After", [ONE], [indexedRowOf(ONE)]);
    expect(listener.mock.calls.length).toBeGreaterThan(calls);
    unsubscribe();
    await fresh.resetLibraryCollectionStore();
  });

  it("forgets one, games and index with it", async () => {
    const keep = await added("Keep");
    const drop = await added("Drop");
    expect(await removeCollection(drop.id)).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.map((c) => c.id)).toEqual([keep.id]);
    expect(await loadUploadedGames(drop.id)).toBeNull();
    expect(await removeCollection("nothing")).toBeUndefined();
  });
});

describe("editing a game", () => {
  it("updates one game and its row in place", async () => {
    const mine = await added();
    expect(await replaceCollectionGame(mine.id, 1, COPY, indexedRowOf(COPY))).toBeUndefined();
    expect(await loadUploadedGames(mine.id)).toEqual([COPY, TWO]);
    expect((await loadUploadedRows(mine.id))?.[0].moves).toBe(2);
    expect(uploadedCollectionsSnapshot()?.[0].count).toBe(2);
  });

  it("inserts a copy right after its original, the rows moving with the games", async () => {
    const mine = await added();
    expect(await insertCollectionGame(mine.id, 2, COPY, indexedRowOf(COPY))).toBeUndefined();
    expect(await loadUploadedGames(mine.id)).toEqual([ONE, COPY, TWO]);
    expect((await loadUploadedRows(mine.id))?.map((row) => [row.number, row.white, row.moves])).toEqual([
      [1, "A", 1],
      [2, "A", 2],
      [3, "C", 1],
    ]);
    expect(uploadedCollectionsSnapshot()?.[0].count).toBe(3);
  });

  it("adds games at the end — an empty collection filling up", async () => {
    const added = await addCollection("Empty", [], []);
    if (!("collection" in added)) throw new Error("not added");
    const { id } = added.collection;
    expect(await loadUploadedGames(id)).toEqual([]);
    expect(await appendCollectionGames(id, [ONE, TWO], [indexedRowOf(ONE), indexedRowOf(TWO)])).toBeUndefined();
    expect(await appendCollectionGames(id, [COPY], [indexedRowOf(COPY)])).toBeUndefined();
    expect(await loadUploadedGames(id)).toEqual([ONE, TWO, COPY]);
    expect((await loadUploadedRows(id))?.map((row) => [row.number, row.white])).toEqual([
      [1, "A"],
      [2, "C"],
      [3, "A"],
    ]);
    expect(uploadedCollectionsSnapshot()?.find((summary) => summary.id === id)?.count).toBe(3);
    expect(await appendCollectionGames("nope", [ONE], [indexedRowOf(ONE)])).toBe("missing");
  });

  it("deletes games, the rows after them moving up — or none, for a number not there", async () => {
    const mine = await added();
    expect(await insertCollectionGame(mine.id, 3, COPY, indexedRowOf(COPY))).toBeUndefined();
    expect(await removeCollectionGames(mine.id, [1, 9])).toBe("missing");
    expect(await loadUploadedGames(mine.id)).toEqual([ONE, TWO, COPY]);

    expect(await removeCollectionGames(mine.id, [1, 3])).toBeUndefined();
    expect(await loadUploadedGames(mine.id)).toEqual([TWO]);
    expect((await loadUploadedRows(mine.id))?.map((row) => [row.number, row.white])).toEqual([[1, "C"]]);
    expect(uploadedCollectionsSnapshot()?.[0].count).toBe(1);
  });

  it("says so for a game or a collection that is not there", async () => {
    const mine = await added();
    expect(await replaceCollectionGame(mine.id, 9, COPY, indexedRowOf(COPY))).toBe("missing");
    expect(await insertCollectionGame(mine.id, 0, COPY, indexedRowOf(COPY))).toBe("missing");
    expect(await replaceCollectionGame("nothing", 1, COPY, indexedRowOf(COPY))).toBe("missing");
    expect(await loadUploadedGames(mine.id)).toEqual([ONE, TWO]);
  });
});

describe("collection settings (CTA-121)", () => {
  it("renames a collection and reads the new name back as a new session would", async () => {
    const mine = await added();
    expect(await updateCollectionSettings(mine.id, { name: "  Club nights  " })).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].name).toBe("Club nights");

    const fresh = await reload();
    expect((await fresh.loadUploadedCollections()).find((c) => c.id === mine.id)?.name).toBe("Club nights");
  });

  it("writes and clears a description, absent reading as none", async () => {
    const mine = await added();
    expect(await updateCollectionSettings(mine.id, { description: " Six rounds. " })).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].description).toBe(" Six rounds. ");

    expect(await updateCollectionSettings(mine.id, { description: "" })).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].description).toBeUndefined();
  });

  it("stores a tournament mark, and reads it back beside the games it leaves alone", async () => {
    const mine = await added();
    expect(await updateCollectionSettings(mine.id, { tournament: { enabled: true, type: "roundRobin" } })).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].tournament).toEqual({ enabled: true, type: "roundRobin" });
    // The settings write the summary alone: games and rows are untouched.
    expect(await loadUploadedGames(mine.id)).toEqual([ONE, TWO]);
    expect((await loadUploadedRows(mine.id))?.length).toBe(2);

    const fresh = await reload();
    expect((await fresh.loadUploadedCollections()).find((c) => c.id === mine.id)?.tournament).toEqual({
      enabled: true,
      type: "roundRobin",
    });
  });

  it("refuses a blank title, answers missing for an unknown id, and no-ops a patch that changes nothing", async () => {
    const mine = await added();
    expect(await updateCollectionSettings(mine.id, { name: "   " })).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].name).toBe("Mine");

    expect(await updateCollectionSettings("nothing", { name: "X" })).toBe("missing");

    const before = uploadedCollectionsSnapshot();
    expect(await updateCollectionSettings(mine.id, {})).toBeUndefined();
    expect(uploadedCollectionsSnapshot()).toBe(before);
  });

  it("reads a record from before the settings leniently — no description, no mark", async () => {
    const mine = await added();
    // A raw summary as a version-before record would hold: the settings fields absent.
    const db = (await (await import("./libraryDb")).openLibraryDb()) as IDBDatabase;
    db.transaction(["collections"], "readwrite").objectStore("collections").put({
      id: mine.id,
      name: "Old",
      addedAt: mine.addedAt,
      count: 2,
    });
    const fresh = await reload();
    const read = (await fresh.loadUploadedCollections()).find((c) => c.id === mine.id);
    expect(read?.description).toBeUndefined();
    expect(read?.tournament).toBeUndefined();
  });
});

describe("the games' verdict and the new formats (CTA-142)", () => {
  const cup = (white: string, event = "Cup") => `[Event "${event}"]\n[White "${white}"]\n[Black "Z"]\n\n1. e4 e5 *`;

  it("keeps whether every game shares one Event, through every write of the games", async () => {
    const mine = await added("Cup", [cup("A"), cup("B")]);
    expect(mine.sharedEvent).toBe(true);
    expect(await appendCollectionGames(mine.id, [cup("C", "Open")], [indexedRowOf(cup("C", "Open"))])).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].sharedEvent).toBe(false);
    expect(await removeCollectionGames(mine.id, [3])).toBeUndefined();
    expect(uploadedCollectionsSnapshot()?.[0].sharedEvent).toBe(true);
    // Games with no Event share none.
    expect((await added("Loose")).sharedEvent).toBe(false);
  });

  it("stores every format with a table, and reads an older record's mark unchanged", async () => {
    const mine = await added();
    for (const type of ["knockout", "doubleElimination", "match", "teamSwiss", "teamKnockout"] as const) {
      expect(await updateCollectionSettings(mine.id, { tournament: { enabled: true, type } })).toBeUndefined();
      const fresh = await reload();
      expect((await fresh.loadUploadedCollections()).find((c) => c.id === mine.id)?.tournament).toEqual({ enabled: true, type });
    }
    // A record written before CTA-142: its type kept, and no verdict — read as unknown.
    const db = (await (await import("./libraryDb")).openLibraryDb()) as IDBDatabase;
    db.transaction(["collections"], "readwrite").objectStore("collections").put({
      id: mine.id,
      name: "Old",
      addedAt: mine.addedAt,
      count: 2,
      tournament: { enabled: true, type: "arena" },
    });
    const read = (await (await reload()).loadUploadedCollections()).find((c) => c.id === mine.id);
    expect(read?.tournament).toEqual({ enabled: true, type: "arena" });
    expect(read?.sharedEvent).toBeUndefined();
  });
});

describe("without IndexedDB", () => {
  it("reads empty and reports every write, never throwing", async () => {
    await resetLibraryCollectionStore();
    const saved = globalThis.indexedDB;
    // @ts-expect-error — a browser with storage disabled
    delete globalThis.indexedDB;
    try {
      expect(await loadUploadedCollections()).toEqual([]);
      expect(await addCollection("X", [ONE], [indexedRowOf(ONE)])).toEqual({ problem: "storage" });
      expect(await loadUploadedGames("x")).toBeNull();
    } finally {
      globalThis.indexedDB = saved;
    }
  });
});

it("uses its own database", () => {
  expect(LIBRARY_DB_NAME).toBe("chessapp.library");
});
