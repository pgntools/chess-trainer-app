import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import i18n from "../../i18n";
import {
  addCollection,
  loadUploadedCollections,
  peekUploadedGames,
} from "../../lib/libraryCollectionStore";
import { loadLibraryFolders } from "../../lib/libraryFolderStore";
import {
  GAMES,
  where,
  mount,
  keep,
  confirmImport,
  pickFile,
  zipOf,
  cleanupAndMount,
  resetLibrary,
} from "./libraryTestKit";

vi.mock("../../lib/engine", async () => ({
  default: (await import("../board/boardTestHarness")).FakeEngine,
}));

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

// The download is a blob URL in a browser; here, what it was handed.
vi.mock("../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/pgnExport")>()),
  downloadPgn: vi.fn(() => true),
}));

vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../lib/openings")>);
});

// The one write the rollback test fails on purpose (CTA-127): a spy over the
// real `addCollection`, so the first collection of a split lands and the
// second refuses. Everything else the module exports is the real thing.
vi.mock("../../lib/libraryCollectionStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/libraryCollectionStore")>();
  return { ...actual, addCollection: vi.fn(actual.addCollection) };
});

/*
  The Library (CTA-75), through its screens — here adding a collection — a paste or a file checked game by game, an empty one, Add games — and the import-options popup. The other
  Library screen tests are `Library.test.tsx`, `LibraryFilters.test.tsx`,
  `LibraryPicks.test.tsx` and `LibraryImport.test.tsx`, one file once,
  split so the suite's shards can share it (CTA-124); what they share is
  `libraryTestKit.tsx`. The board's shared panel and square are asserted
  with the other v2 boards (`boards.test.tsx`, `panelPropagation.test.tsx`).
*/

beforeEach(resetLibrary);

describe("adding a collection", () => {
  it("checks every game of a pasted text, then keeps it as a new collection named by its Event", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), {
      target: { value: GAMES.join("\n\n") },
    });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await confirmImport();
    expect(screen.getByTestId("library-import-indexing")).toBeInTheDocument();

    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    const [added] = await loadUploadedCollections();
    expect(added).toMatchObject({ name: "Club", count: 3 });
    expect(where()).toBe(`/library/${added.id}`);
    expect(peekUploadedGames(added.id)).toEqual(GAMES);
    expect(await screen.findByTestId("library-table-count")).toHaveTextContent("3 games");
  });

  it("keeps nothing when the check is cancelled", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), {
      target: { value: Array.from({ length: 300 }, (_, index) => GAMES[index % 3]).join("\n\n") },
    });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await confirmImport();
    await waitFor(() =>
      expect(screen.getByTestId("library-import-progress")).not.toHaveTextContent("Checking games… 0 of"),
    );
    fireEvent.click(screen.getByTestId("library-import-cancel"));
    await waitFor(() => expect(screen.queryByTestId("library-import")).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await loadUploadedCollections()).toEqual([]);
    expect(where()).toBe("/library/new");
  });

  it("creates an empty collection from a name, and fills it from its table's Add games", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-name"), { target: { value: "My picks" } });
    fireEvent.click(screen.getByTestId("library-upload-empty"));

    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    const [empty] = await loadUploadedCollections();
    expect(empty).toMatchObject({ name: "My picks", count: 0 });
    expect(await screen.findByTestId("library-table-empty")).toHaveTextContent(
      i18n.t("library.table.noGames"),
    );

    fireEvent.click(screen.getByTestId("library-table-add-games"));
    expect(where()).toBe(`/library/new?into=${empty.id}`);
    expect(await screen.findByTestId("library-upload-title")).toHaveTextContent("Add games to My picks");
    expect(screen.queryByTestId("library-upload-name")).toBeNull();
    expect(screen.queryByTestId("library-upload-empty")).toBeNull();
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: GAMES.slice(0, 2).join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    expect(await screen.findByTestId("library-import")).toHaveTextContent("Add games to My picks");
    await confirmImport();

    await waitFor(() => expect(where()).toBe(`/library/${empty.id}`));
    expect(peekUploadedGames(empty.id)).toEqual(GAMES.slice(0, 2));
    expect(await screen.findByTestId("library-table-count")).toHaveTextContent("2 games");

    // Again: the next games go at the end, and the name stays the reader's.
    cleanupAndMount(`/library/new?into=${empty.id}`);
    fireEvent.change(await screen.findByTestId("library-upload-paste"), { target: { value: GAMES[2] } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await confirmImport();
    await waitFor(() => expect(peekUploadedGames(empty.id)).toEqual(GAMES));
    expect((await loadUploadedCollections())[0]).toMatchObject({ name: "My picks", count: 3 });
  });

  it("names an empty collection for the reader when no name is typed", async () => {
    mount("/library/new");
    fireEvent.click(screen.getByTestId("library-upload-empty"));
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    expect((await loadUploadedCollections())[0].name).toBe("New collection");
  });

  it("adds games only to the reader's own collections", async () => {
    mount("/library/fischer");
    await screen.findByTestId("library-table");
    expect(screen.queryByTestId("library-table-add-games")).toBeNull();
    cleanupAndMount("/library/new?into=fischer");
    expect(await screen.findByTestId("library-not-found")).toBeInTheDocument();
    cleanupAndMount("/library/new?into=nothing-here");
    expect(await screen.findByTestId("library-not-found")).toBeInTheDocument();
  });

  it("says why a text was not taken", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: "hello" } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    expect(screen.getByTestId("library-upload-problem")).toHaveTextContent(
      i18n.t("library.upload.problem.unreadable"),
    );
    expect(await loadUploadedCollections()).toEqual([]);
  });
});

describe("the import-options popup (CTA-103)", () => {
  const RATED = [
    '[Event "Rated"]\n[Date "2023.05.01"]\n[White "Kim"]\n[Black "Lee"]\n[WhiteElo "2100"]\n[BlackElo "2000"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
    '[Event "Rated"]\n[Date "2023.06.??"]\n[White "Lee"]\n[Black "Max"]\n[WhiteElo "1800"]\n[BlackElo "2200"]\n[Result "0-1"]\n\n1. d4 d5 0-1',
    '[Event "Rated"]\n[White "Max"]\n[Black "Kim"]\n[WhiteElo "2300"]\n[Result "*"]\n\n1. c4 *',
  ];
  const count = () => screen.getByTestId("library-import-count").textContent;
  const setField = (testId: string, value: string) =>
    fireEvent.change(screen.getByTestId(testId), { target: { value } });
  /** Move the Elo slider's min (0) or max (1) thumb. */
  const setElo = (thumb: 0 | 1, value: number) =>
    fireEvent.change(within(screen.getByTestId("library-import-elo")).getAllByRole("slider")[thumb], {
      target: { value },
    });

  it("opens for a picked .pgn before any game is checked, saying what came in", async () => {
    mount("/library/new");
    pickFile(new File([RATED.join("\n\n")], "Rated_2023.pgn", { type: "application/x-chess-pgn" }));
    expect(await screen.findByTestId("library-import")).toBeInTheDocument();
    expect(screen.queryByTestId("library-import-indexing")).toBeNull();
    expect(screen.getByTestId("library-import-source")).toHaveTextContent("Rated_2023.pgn");
    expect(screen.getByTestId("library-import-source")).toHaveTextContent(/\d+ B/);
    expect(screen.getByTestId("library-import-source")).toHaveTextContent("3 games");
    expect(screen.queryByTestId("library-import-file-0")).toBeNull();
    expect(screen.getByTestId("library-import-summary-players")).toHaveTextContent("3 players");
    expect(screen.getByTestId("library-import-summary-elo")).toHaveTextContent("1800–2300");
    expect(screen.getByTestId("library-import-summary-dates")).toHaveTextContent("2023.05.01 – 2023.06");
    expect(screen.getByTestId("library-import-summary-events")).toHaveTextContent("1 event: Rated");
    expect(count()).toBe("3 of 3 games will be imported");
    expect(await loadUploadedCollections()).toEqual([]);
  });

  it("narrows by an Elo range slider (both players, a missing Elo out), dates (no date out) and players, live", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: RATED.join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await screen.findByTestId("library-import");

    // The slider spans the games' own Elos; left whole it is no filter, the game with no Elo kept.
    expect(screen.getByTestId("library-import-elo-value")).toHaveTextContent("1800 – 2300");
    setElo(0, 1900);
    expect(screen.getByTestId("library-import-elo-value")).toHaveTextContent("1900 – 2300");
    expect(count()).toBe("1 of 3 games will be imported");
    setElo(0, 1800);
    expect(count()).toBe("3 of 3 games will be imported");
    setElo(1, 2200);
    expect(count()).toBe("2 of 3 games will be imported");
    setElo(1, 1850);
    expect(count()).toBe("0 of 3 games will be imported");
    expect(screen.getByTestId("library-import-confirm")).toBeDisabled();
    setElo(1, 2300);
    expect(count()).toBe("3 of 3 games will be imported");

    setField("library-import-from", "2023-06-10");
    expect(count()).toBe("1 of 3 games will be imported");
    setField("library-import-from", "");
    setField("library-import-to", "2023-12-31");
    expect(count()).toBe("2 of 3 games will be imported");
    setField("library-import-to", "");

    const box = within(screen.getByTestId("library-import-player")).getByRole("combobox");
    fireEvent.change(box, { target: { value: "max" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(count()).toBe("2 of 3 games will be imported");
    fireEvent.change(box, { target: { value: "Kim" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(count()).toBe("3 of 3 games will be imported");
  });

  it("suggests only the players of the games the Elo range leaves, worked out when the list opens", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: RATED.join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await screen.findByTestId("library-import");
    const box = within(screen.getByTestId("library-import-player")).getByRole("combobox");
    const options = () => screen.getAllByRole("option").map((option) => option.textContent);

    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(options()).toEqual(["Kim", "Lee", "Max"]);
    fireEvent.keyDown(box, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(screen.getByTestId("library-import")).toBeInTheDocument();

    // Only Kim – Lee (2100 / 2000) is left from 2000 up: Max's games are out of range or unrated.
    setElo(0, 2000);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(options()).toEqual(["Kim", "Lee"]);
  });

  it("checks and keeps only the games the filters leave, named as typed", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-name"), { target: { value: "Strong" } });
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: RATED.join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await screen.findByTestId("library-import");
    setElo(0, 2000);
    await confirmImport();
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/), { timeout: 4000 });
    const [kept] = await loadUploadedCollections();
    expect(kept).toMatchObject({ name: "Strong", count: 1 });
    expect(peekUploadedGames(kept.id)).toEqual([RATED[0]]);
  });

  it("adds every file's kept games of a zip to the one collection (?into=)", async () => {
    const mine = await keep("Mine", [GAMES[0]]);
    mount(`/library/new?into=${mine.id}`);
    await screen.findByTestId("library-upload-title");
    pickFile(zipOf({ "a.pgn": RATED.slice(0, 2).join("\n\n"), "b.pgn": RATED[2] }));
    expect(await screen.findByTestId("library-import-several")).toHaveTextContent(/added to this collection/);
    setElo(1, 2250);
    // The files' own counts say what each keeps while a filter is on.
    expect(screen.getByTestId("library-import-file-0")).toHaveTextContent("2 of 2 games kept");
    expect(screen.getByTestId("library-import-file-1")).toHaveTextContent("0 of 1 game kept");
    await confirmImport();
    await waitFor(() => expect(where()).toBe(`/library/${mine.id}`), { timeout: 4000 });
    expect(peekUploadedGames(mine.id)).toEqual([GAMES[0], RATED[0], RATED[1]]);
    expect(await loadUploadedCollections()).toHaveLength(1);
  });

  it("writes nothing when cancelled, or closed with Escape", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: RATED.join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    fireEvent.click(await screen.findByTestId("library-import-cancel"));
    await waitFor(() => expect(screen.queryByTestId("library-import")).toBeNull());

    fireEvent.click(screen.getByTestId("library-upload-save"));
    fireEvent.keyDown(await screen.findByTestId("library-import"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("library-import")).toBeNull());
    expect(where()).toBe("/library/new");
    expect(await loadUploadedCollections()).toEqual([]);
  });

  it("opens no popup for an empty collection", async () => {
    mount("/library/new");
    fireEvent.click(screen.getByTestId("library-upload-empty"));
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    expect(screen.queryByTestId("library-import")).toBeNull();
  });
});

describe("Split by event (CTA-127)", () => {
  // A game with no `Event` can only lead the text (the splitter cuts where an
  // `[Event …]` follows a blank line), so the untagged game goes first.
  const SPLIT = [
    '[White "Kim"]\n[Black "Lee"]\n[Result "*"]\n\n1. Nf3 *',
    '[Event "Club"]\n[White "Zed"]\n[Black "Amy"]\n[Result "0-1"]\n\n1. e4 e5 0-1',
    '[Event "Spring Open"]\n[White "Bob"]\n[Black "Dana"]\n[Result "1-0"]\n\n1. d4 d5 1-0',
    '[Event "Club"]\n[White "Amy"]\n[Black "Zed"]\n[Result "1/2-1/2"]\n\n1. c4 1/2-1/2',
  ];
  const RATED_ONE_EVENT = [
    '[Event "Rated"]\n[White "Kim"]\n[Black "Lee"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
    '[Event "Rated"]\n[White "Lee"]\n[Black "Max"]\n[Result "0-1"]\n\n1. d4 d5 0-1',
  ].join("\n\n");
  const splitSwitch = () => screen.getByTestId("library-import-split");

  it("splits a single text into one folder holding one collection per event, the untagged games in one Unknown", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-name"), { target: { value: "My events" } });
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: SPLIT.join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    expect(await screen.findByTestId("library-import")).toBeInTheDocument();
    expect(splitSwitch()).toBeEnabled();
    fireEvent.click(splitSwitch());
    await confirmImport();
    await waitFor(() => expect(where()).toBe("/library"), { timeout: 4000 });

    // One folder named as the collection would have been, holding one
    // collection per event in first-appearance order, its games in file order.
    const folders = await loadLibraryFolders();
    expect(folders).toHaveLength(1);
    const [folder] = folders;
    expect(folder).toMatchObject({ name: "My events", parentId: null });
    const collections = await loadUploadedCollections();
    expect(collections.map((collection) => collection.name).sort()).toEqual(["Club", "Spring Open", "Unknown"]);
    for (const collection of collections) expect(collection.folderId).toBe(folder.id);
    const gamesOf = (name: string) =>
      peekUploadedGames(collections.find((collection) => collection.name === name)!.id);
    expect(gamesOf("Club")).toEqual([SPLIT[1], SPLIT[3]]);
    expect(gamesOf("Spring Open")).toEqual([SPLIT[2]]);
    expect(gamesOf("Unknown")).toEqual([SPLIT[0]]);
  });

  it("splits a zip into one folder per file keeping games, each split by event inside, at the top level", async () => {
    mount("/library/new");
    pickFile(zipOf({ "a.pgn": SPLIT.slice(1).join("\n\n"), "b.pgn": GAMES[0] }));
    expect(await screen.findByTestId("library-import")).toBeInTheDocument();
    expect(screen.getByTestId("library-import-several")).toHaveTextContent(/collection of its own/);
    fireEvent.click(splitSwitch());
    expect(screen.getByTestId("library-import-several")).toHaveTextContent(/folder of its own/);
    await confirmImport();
    await waitFor(() => expect(where()).toBe("/library"), { timeout: 4000 });

    // A folder per file that keeps games — `a.pgn` split by its two events,
    // `b.pgn` named by the Event its games share (the collection-name
    // derivation), holding them as one collection.
    const folders = await loadLibraryFolders();
    expect(folders.map((row) => row.name).sort()).toEqual(["A", "Club"]);
    const collections = await loadUploadedCollections();
    expect(collections).toHaveLength(3);
    const of = (name: string) => collections.filter((collection) => collection.folderId === folders.find((row) => row.name === name)!.id);
    expect(of("A").map((collection) => collection.name).sort()).toEqual(["Club", "Spring Open"]);
    expect(of("Club")).toMatchObject([{ name: "Club", count: 1 }]);
    expect(peekUploadedGames(of("Club")[0].id)).toEqual([GAMES[0]]);
  });

  it("offers the split off with its reason where every kept game shares one Event, and imports unsplit", async () => {
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: RATED_ONE_EVENT } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    const split = await screen.findByTestId("library-import-split");
    expect(split).toBeDisabled();
    expect(screen.getByTestId("library-import-split-help")).toHaveTextContent(/share one Event/);
    await confirmImport();
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/), { timeout: 4000 });
    const [collection] = await loadUploadedCollections();
    expect(collection).toMatchObject({ name: "Rated", folderId: null, count: 2 });
    expect(await loadLibraryFolders()).toEqual([]);
  });

  it("takes back the collections and the folders a failed split had already made, and says why", async () => {
    // The first collection of the split lands; the second write refuses, so
    // everything the import had made — collections and folder — goes again.
    const realAdd = vi.mocked(addCollection).getMockImplementation()!;
    vi.mocked(addCollection)
      .mockImplementationOnce(realAdd)
      .mockImplementationOnce(async () => ({ problem: "storage" }));
    mount("/library/new");
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: SPLIT.slice(1).join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    fireEvent.click(await screen.findByTestId("library-import-split"));
    await confirmImport();
    expect(await screen.findByTestId("library-import-problem")).toHaveTextContent(
      i18n.t("library.upload.problem.storage"),
    );
    expect(where()).toBe("/library/new");
    expect(await loadUploadedCollections()).toEqual([]);
    expect(await loadLibraryFolders()).toEqual([]);
  });
});
