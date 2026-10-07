import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { indexedRowOf, numberedRows } from "../../lib/collectionIndex";
import { loadUploadedCollections, peekUploadedGames, peekUploadedRows } from "../../lib/libraryCollectionStore";
import { filteredRows } from "../../lib/libraryCollections";
import { peekShippedGames } from "../../lib/shippedCollections";
import { loadSavedAnalyses } from "../../lib/savedAnalysisStore";
import { createAnalysisFolder, loadAnalysisFolders, MAX_ANALYSIS_FOLDERS } from "../../lib/savedAnalysisFolderStore";
import { downloadPgn } from "../../lib/pgnExport";
import {
  GAMES,
  where,
  keep,
  upload,
  typeInto,
  keepCarlsen,
  mountTable,
  rowNumbers,
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

/*
  The Library (CTA-75), through its screens — here a collection's picks: downloaded, analysed into Saved analyses, saved as a new collection. The other
  Library screen tests are `Library.test.tsx`, `LibraryFilters.test.tsx`,
  `LibraryPicks.test.tsx` and `LibraryImport.test.tsx`, one file once,
  split so the suite's shards can share it (CTA-124); what they share is
  `libraryTestKit.tsx`. The board's shared panel and square are asserted
  with the other v2 boards (`boards.test.tsx`, `panelPropagation.test.tsx`).
*/

beforeEach(resetLibrary);

describe("picking games to download", () => {
  const RICH = [
    '[Event "Spring Open"]\n[White "Carlsen"]\n[Black "Nepo"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
    '[Event "Spring Open"]\n[White "Nepo"]\n[Black "Carlsen"]\n[Result "0-1"]\n\n1. e4 c5 0-1',
    '[Event "Autumn Cup"]\n[White "Ding"]\n[Black "Carlsen"]\n[Result "1/2-1/2"]\n\n1. d4 d5 1/2-1/2',
  ];

  beforeEach(() => vi.mocked(downloadPgn).mockClear());

  it("picks every game the filters leave, on every page, and downloads them as one PGN", async () => {
    const { games, rows, id } = await keepCarlsen();
    await mountTable(`/library/${id}?opening=B9`);
    const expected = filteredRows(numberedRows(rows), { text: "", result: "", opening: "B9" });
    expect(expected.length).toBeGreaterThan(50);
    // One page shows 50 of them; select-all takes them all.
    expect(rowNumbers()).toHaveLength(50);
    expect(screen.getByTestId("library-picks-download")).toBeDisabled();

    fireEvent.click(within(screen.getByTestId("library-picks-select-all")).getByRole("checkbox"));
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent(`${expected.length} selected`);
    fireEvent.click(screen.getByTestId("library-picks-download"));

    await waitFor(() => expect(downloadPgn).toHaveBeenCalledTimes(1));
    const [stem, pgns] = vi.mocked(downloadPgn).mock.calls[0];
    expect(stem).toBe(`carlsen-${expected.length}-games`);
    // Collection order, each game exactly as the collection holds it.
    expect(pgns).toEqual(expected.map((row) => games[row.number - 1]));
  }, 60_000);

  it("picks one game from its row without opening it, and keeps picks across filters", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}`);
    fireEvent.click(within(screen.getByTestId("library-picks-row-3")).getByRole("checkbox"));
    expect(where()).toBe(`/library/${rich.id}`);
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("1 selected");

    // Filter to the Spring Open: select-all adds its two games to the pick.
    typeInto("library-filter-event", "Spring Open");
    fireEvent.click(await screen.findByRole("option", { name: "Spring Open" }));
    expect(rowNumbers()).toEqual(["1", "2"]);
    const selectAll = () => within(screen.getByTestId("library-picks-select-all")).getByRole("checkbox");
    fireEvent.click(selectAll());
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("3 selected");
    // Unticking takes out only the games shown.
    fireEvent.click(selectAll());
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("1 selected");

    fireEvent.click(selectAll());
    fireEvent.click(screen.getByTestId("library-picks-download"));
    await waitFor(() => expect(downloadPgn).toHaveBeenCalledWith("rich-3-games", RICH));
  });
});

describe("analysing the picks (CTA-77)", () => {
  const analyse = () => screen.getByTestId("library-picks-analyse");
  const pick = (number: number) =>
    fireEvent.click(within(screen.getByTestId(`library-picks-row-${number}`)).getByRole("checkbox"));
  // A shipped collection's games are a lazy `?raw` chunk, fetched on the first
  // Analyse; on a cold CI runner under coverage that outlasts the 1s default.
  const notice = () => screen.findByTestId("library-picks-analyse-notice", {}, { timeout: 10_000 });

  it("is offered beside the export bar, and only once a game is picked", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    expect(analyse()).toHaveTextContent("Analyse");
    expect(analyse()).toBeDisabled();
    pick(1);
    expect(analyse()).toBeEnabled();
  });

  it("saves the picks into one new folder, in collection order, named for the collection and the filters", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}?player=Amy`);
    pick(2);
    pick(1);
    fireEvent.click(analyse());
    // Working: it cannot be clicked twice.
    expect(analyse()).toBeDisabled();

    expect(await notice()).toHaveTextContent("2 games added to Saved analyses, in “Club games — 2 games (Amy)”.");
    const folders = await loadAnalysisFolders();
    expect(folders).toHaveLength(1);
    expect(folders[0]).toMatchObject({ name: "Club games — 2 games (Amy)", parentId: null });
    const saved = await loadSavedAnalyses();
    expect(saved.map((row) => [row.name, row.folderId, row.pgn])).toEqual([
      ["Zed – Amy", folders[0].id, GAMES[0]],
      ["Amy – Bob", folders[0].id, GAMES[1]],
    ]);
    expect(saved[0]).toMatchObject({ path: [], orientation: "white" });
    expect(screen.getByTestId("library-picks-analyse-open")).toHaveAttribute(
      "href",
      `/tools/analysis/saved?folder=${folders[0].id}`,
    );
    // The picks stay as they were.
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("2 selected");
    expect(analyse()).toBeEnabled();
  });

  it("leaves out a game the index could not read, and says so", async () => {
    const mine = await keep("Mixed", [GAMES[0], '[White "Broken"]\n[Black "Game"]\n\n1. e4 Zz9 *']);
    await mountTable(`/library/${mine.id}`);
    expect(screen.getByTestId("library-table-unreadable-2")).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("library-picks-select-all")).getByRole("checkbox"));
    fireEvent.click(analyse());

    expect(await notice()).toHaveTextContent(
      "1 game added to Saved analyses, in “Mixed — 1 game”. 1 game could not be read and was left out.",
    );
    expect((await loadSavedAnalyses()).map((row) => row.pgn)).toEqual([GAMES[0]]);
  });

  it("works on a shipped collection too", async () => {
    await mountTable("/library/capablanca?sort=number");
    pick(1);
    fireEvent.click(analyse());
    expect(await notice()).toHaveTextContent("1 game added to Saved analyses, in “Capablanca — 1 game”.");
    const [saved] = await loadSavedAnalyses();
    expect(saved.pgn).toBe((peekShippedGames("capablanca") ?? [])[0].trim());
    expect(saved.name).toBe("Capablanca, Jose – Eschevarria, C.");
  });

  it("says why, and leaves nothing behind, when no folder can be made", async () => {
    for (let index = 0; index < MAX_ANALYSIS_FOLDERS; index += 1) {
      await createAnalysisFolder(`F${index}`, null);
    }
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    pick(1);
    fireEvent.click(analyse());
    expect(await notice()).toHaveTextContent(`at most ${MAX_ANALYSIS_FOLDERS} folders`);
    expect(await loadSavedAnalyses()).toEqual([]);
    expect(screen.queryByTestId("library-picks-analyse-open")).toBeNull();
  });

  it("takes the folder back out when the games cannot be stored", async () => {
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      // The analyses' records carry a PGN; the folder's does not.
      if ((value as { value?: { pgn?: string } }).value?.pgn !== undefined) {
        throw new DOMException("full", "QuotaExceededError");
      }
      return put.call(this, value, key);
    });
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    pick(1);
    fireEvent.click(analyse());
    expect(await notice()).toHaveTextContent("storage may be full");
    vi.restoreAllMocks();
    expect(await loadAnalysisFolders()).toEqual([]);
    expect(await loadSavedAnalyses()).toEqual([]);
  });
});

describe("saving the picks as a collection (CTA-122)", () => {
  const saveAs = () => screen.getByTestId("library-picks-collection");
  const pick = (number: number) =>
    fireEvent.click(within(screen.getByTestId(`library-picks-row-${number}`)).getByRole("checkbox"));
  const notice = () => screen.findByTestId("library-picks-collection-notice", {}, { timeout: 10_000 });

  it("is offered beside the picks' actions, and only once a game is picked", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    expect(saveAs()).toBeDisabled();
    pick(2);
    expect(saveAs()).toBeEnabled();
  });

  it("writes the picks as one new uploaded collection, named as derived, and links to it", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}?player=Amy`);
    pick(2);
    pick(1);
    fireEvent.click(saveAs());
    // The dialog, prefilled with the derived name (the way Analyse names its folder).
    expect(screen.getByRole("dialog", { name: "Save as a collection" })).toBeInTheDocument();
    expect(screen.getByTestId("library-picks-collection-dialog-input")).toHaveValue("Club games — 2 games (Amy)");
    expect(screen.getByTestId("library-picks-collection-dialog-count")).toHaveTextContent(
      "2 games will be saved as a new collection of their own.",
    );
    fireEvent.click(screen.getByTestId("library-picks-collection-dialog-submit"));

    expect(await notice()).toHaveTextContent("“Club games — 2 games (Amy)” created with 2 games.");
    const made = (await loadUploadedCollections()).find((row) => row.id !== mine.id);
    expect(made).toMatchObject({ name: "Club games — 2 games (Amy)", count: 2, folderId: null });
    // Each game exactly as stored, each row straight off the index, in collection order.
    expect(peekUploadedGames(made!.id)).toEqual([GAMES[0], GAMES[1]]);
    expect(peekUploadedRows(made!.id)).toEqual(numberedRows([indexedRowOf(GAMES[0]), indexedRowOf(GAMES[1])]));
    expect(screen.getByTestId("library-picks-collection-open")).toHaveAttribute("href", `/library/${made!.id}`);
    // The picks stay; the source collection is untouched.
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("2 selected");
    expect((await loadUploadedCollections()).find((row) => row.id === mine.id)).toMatchObject({ count: 3 });
  });

  it("saves under an edited name, and a duplicate name does not collide", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    pick(1);
    fireEvent.click(saveAs());
    fireEvent.change(screen.getByTestId("library-picks-collection-dialog-input"), { target: { value: "My picks" } });
    fireEvent.click(screen.getByTestId("library-picks-collection-dialog-submit"));
    await notice();
    // The same typed name again: another collection, its own minted id.
    fireEvent.click(saveAs());
    const input = screen.getByTestId("library-picks-collection-dialog-input");
    fireEvent.change(input, { target: { value: "My picks" } });
    fireEvent.click(screen.getByTestId("library-picks-collection-dialog-submit"));
    await waitFor(async () =>
      expect((await loadUploadedCollections()).filter((row) => row.name === "My picks")).toHaveLength(2),
    );
    const named = (await loadUploadedCollections()).filter((row) => row.name === "My picks");
    expect(new Set(named.map((row) => row.id)).size).toBe(2);
    expect(named.every((row) => row.id !== mine.id && row.id.startsWith("u"))).toBe(true);
  });

  it("keeps Create collection off while the name is blank", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    pick(1);
    fireEvent.click(saveAs());
    fireEvent.change(screen.getByTestId("library-picks-collection-dialog-input"), { target: { value: "" } });
    expect(screen.getByTestId("library-picks-collection-dialog-submit")).toBeDisabled();
  });

  it("works on a shipped collection too, its games exactly as the file holds them", async () => {
    await mountTable("/library/capablanca?sort=number");
    pick(1);
    fireEvent.click(saveAs());
    fireEvent.click(screen.getByTestId("library-picks-collection-dialog-submit"));
    expect(await notice()).toHaveTextContent("Capablanca — 1 game");
    const [made] = await loadUploadedCollections();
    expect(made).toMatchObject({ name: "Capablanca — 1 game", count: 1 });
    // Exactly as stored — no re-parse, not even the trim Analyse gives a record.
    expect(peekUploadedGames(made.id)).toEqual([(peekShippedGames("capablanca") ?? [])[0]]);
  });

  it("shows the problem in the dialog and creates nothing when the write fails", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      // A collection's games record — the write this test must break.
      if ((value as { games?: string[] }).games !== undefined) {
        throw new DOMException("full", "QuotaExceededError");
      }
      return put.call(this, value, key);
    });
    pick(1);
    fireEvent.click(saveAs());
    fireEvent.click(screen.getByTestId("library-picks-collection-dialog-submit"));
    expect(await screen.findByTestId("library-picks-collection-dialog-error")).toHaveTextContent(
      "The collection could not be created",
    );
    vi.restoreAllMocks();
    // Nothing was created, and the dialog stays open to be answered again.
    expect((await loadUploadedCollections()).filter((row) => row.id !== mine.id)).toEqual([]);
    expect(screen.getByRole("dialog", { name: "Save as a collection" })).toBeInTheDocument();
  });
});
