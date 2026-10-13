import { beforeEach, describe, expect, it } from "vitest";

import { addAnalysisCases } from "./analysisCaseStore";
import { gameCaseOf } from "./analysisProjects";
import { indexedRowOf } from "./collectionIndex";
import { DEFAULT_ENGINE_SETTINGS } from "./engineSettings";
import { addCollection, resetLibraryCollectionStore } from "./libraryCollectionStore";
import { findCatalogGame } from "./gameCatalog";
import { savePlayedGame } from "./playedGameStore";
import { playedGameOf } from "./playedGames";
import { parsePgnGame, parsePgnTree } from "./pgn";
import {
  CASE_REFERENCE_KEY,
  isReferenceRead,
  LIBRARY_REFERENCE_KEY,
  libraryGameReference,
  loadReferencedGames,
  PLAY_REFERENCE_KEY,
  resolveGameReference,
} from "./gameReference";

/**
 * A stored game's reference: a key, a store's catalog path and an id,
 * resolved against that store. The played games' own test
 * (`playedGames.test.ts`) covers its round trip; this covers what the
 * reference refuses, a Library game and an Analysis case (CTA-192).
 */

beforeEach(() => localStorage.clear());

describe("resolveGameReference", () => {
  it("knows exactly the three stores' keys", () => {
    expect(CASE_REFERENCE_KEY).toBe("case");
    expect(PLAY_REFERENCE_KEY).toBe("play");
    expect(LIBRARY_REFERENCE_KEY).toBe("library");
  });

  it("tolerates the empty segments a stray slash leaves", async () => {
    await savePlayedGame(
      playedGameOf("a", parsePgnTree("1. e4 e5 *"), [], DEFAULT_ENGINE_SETTINGS),
    );
    expect(resolveGameReference("/play/games/a/")?.id).toBe("a");
  });

  it.each([
    ["nothing at all", null],
    ["an empty string", ""],
    ["a key with no path after it", "play"],
    ["an unregistered key", "endgames/pawn-endgames/opposition"],
    // The pre-CTA-75 Library's links name no collection and number now.
    ["the old Library's key", "library/queen-vs-rook/chapter-1"],
    ["a Library game number that is not one", "library/capablanca/0"],
    ["the pre-CTA-38 key", "pgn/queen-vs-rook/chapter-1"],
    ["a path the store does not have", "play/nope/a"],
    ["an id the store does not have", "play/games/missing"],
  ])("comes back undefined for %s", (_name, reference) => {
    expect(resolveGameReference(reference)).toBeUndefined();
  });
});

describe("a Library game (CTA-77)", () => {
  beforeEach(() => resetLibraryCollectionStore());

  it("resolves an upload's game", async () => {
    const pgn = '[White "Kim"]\n[Black "Lee"]\n\n1. e4 e5 *';
    const added = await addCollection("Mine", [pgn], [indexedRowOf(pgn)]);
    if (!("collection" in added)) throw new Error("not added");
    const reference = libraryGameReference(added.collection.id, 1);
    await loadReferencedGames(reference);
    expect(isReferenceRead(reference)).toBe(true);
    expect(resolveGameReference(reference)).toMatchObject({ id: "1", name: "Kim – Lee", pgn });
    expect(resolveGameReference(libraryGameReference(added.collection.id, 2))).toBeUndefined();
  });

  it("resolves a shipped collection's game after its PGN chunk is fetched", async () => {
    const reference = libraryGameReference("capablanca", 1);
    expect(isReferenceRead(reference)).toBe(false);
    expect(resolveGameReference(reference)).toBeUndefined();
    await loadReferencedGames(reference);
    expect(isReferenceRead(reference)).toBe(true);
    expect(resolveGameReference(reference)?.name).toBe("Capablanca, Jose – Eschevarria, C.");
  });

  it("waits for the played games' first read, like a Library game", async () => {
    expect(isReferenceRead("play/games/a")).toBe(false);
    await loadReferencedGames("play/games/a");
    expect(isReferenceRead("play/games/a")).toBe(true);
  });

  it("is read at once for no reference", () => {
    expect(isReferenceRead(null)).toBe(true);
  });
});

describe("an Analysis case (CTA-192)", () => {
  it("resolves case/<project>/<case> once the Cases are read — and nothing in another Project", async () => {
    const tree = parsePgnTree('[White "Kim"]\n[Black "Lee"]\n\n1. e4 e5 *');
    await addAnalysisCases([gameCaseOf({ id: "c1", projectId: "p1", name: "" }, tree)]);
    await loadReferencedGames("case/p1/c1");
    expect(isReferenceRead("case/p1/c1")).toBe(true);
    expect(resolveGameReference("case/p1/c1")).toMatchObject({ id: "c1", name: "Kim – Lee" });
    expect(resolveGameReference("case/p2/c1")).toBeUndefined();
    expect(resolveGameReference("case/p1/missing")).toBeUndefined();
  });

  it("is named by the Case's own name first", async () => {
    await addAnalysisCases([gameCaseOf({ id: "c9", projectId: "p1", name: "My study" }, parsePgnTree("1. d4 *"))]);
    await loadReferencedGames("case/p1/c9");
    expect(resolveGameReference("case/p1/c9")?.name).toBe("My study");
  });
});

describe("findCatalogGame", () => {
  const catalog = {
    path: "games",
    games: [{ id: "a", name: "A – B", pgn: "1. e4 *", game: parsePgnGame("1. e4 *") }],
  };

  it("finds [path, id] and nothing longer or shorter", () => {
    expect(findCatalogGame(["games", "a"], catalog)?.id).toBe("a");
    expect(findCatalogGame(["games"], catalog)).toBeUndefined();
    expect(findCatalogGame(["games", "a", "b"], catalog)).toBeUndefined();
    expect(findCatalogGame(["other", "a"], catalog)).toBeUndefined();
  });
});
