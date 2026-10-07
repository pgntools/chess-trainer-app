import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { indexedRowOf, numberedRows, type IndexedRow } from "../../lib/collectionIndex";
import { addCollection } from "../../lib/libraryCollectionStore";
import { collectionFacetsOf, filteredRows } from "../../lib/libraryCollections";
import { downloadPgn } from "../../lib/pgnExport";
import { boardOptions } from "../board/boardTestHarness";
import { CHANCE_ARROW_BORDER_COLOR, CHANCE_ARROW_FILL_COLOR } from "../explorer/chanceArrows";
import { HOVERED_NEXT_MOVE_ARROW_COLOR } from "../tools/analysis/nextMoveArrows";
import {
  GAMES,
  where,
  keep,
  upload,
  typeInto,
  keepCarlsen,
  cleanupAndMount,
  mountTable,
  rowNumbers,
  resetLibrary,
} from "./libraryTestKit";

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

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
  The Library (CTA-75), through its screens — here a collection's table narrowed: the panel's filters, and the opening-moves board with its tree and its PGN. The other
  Library screen tests are `Library.test.tsx`, `LibraryFilters.test.tsx`,
  `LibraryPicks.test.tsx` and `LibraryImport.test.tsx`, one file once,
  split so the suite's shards can share it (CTA-124); what they share is
  `libraryTestKit.tsx`. The board's shared panel and square are asserted
  with the other v2 boards (`boards.test.tsx`, `panelPropagation.test.tsx`).
*/

beforeEach(resetLibrary);

describe("the table's filters", () => {
  const RICH = [
    '[Event "Spring Open"]\n[Date "2023.04.02"]\n[White "Carlsen"]\n[Black "Nepo"]\n[Result "1-0"]\n[ECO "C42"]\n[Opening "Petrov"]\n\n1. e4 e5 2. Nf3 Nf6 1-0',
    '[Event "Spring Open"]\n[Date "2023.04.03"]\n[White "Nepo"]\n[Black "Carlsen"]\n[Result "0-1"]\n[ECO "B90"]\n[Opening "Sicilian"]\n\n1. e4 c5 0-1',
    '[Event "Autumn Cup"]\n[Date "2023.10"]\n[White "Ding"]\n[Black "Carlsen"]\n[Result "1/2-1/2"]\n[ECO "D37"]\n[Opening "Queen\'s Gambit"]\n\n1. d4 d5 1/2-1/2',
  ];
  const panel = () => within(screen.getByTestId("library-filters"));

  it("shows only the filters the collection's games can use", async () => {
    // Club games: players and results, one event, no dates, no openings.
    const club = await upload();
    await mountTable(`/library/${club.id}`);
    expect(screen.getByTestId("library-filter-player")).toBeInTheDocument();
    expect(screen.getByTestId("library-table-result")).toBeInTheDocument();
    expect(screen.queryByTestId("library-filter-opening")).toBeNull();
    expect(screen.queryByTestId("library-filter-event")).toBeNull();
    expect(screen.queryByTestId("library-filter-from")).toBeNull();
  });

  it("narrows to a player's games, then to the side they had", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}`);
    expect(within(screen.getByTestId("library-filter-color")).getByTestId("library-filter-color-black")).toBeDisabled();

    typeInto("library-filter-player", "carl");
    // Enter commits the typed part of a name — a chip, not a whole facet value (CTA-95).
    fireEvent.keyDown(within(screen.getByTestId("library-filter-player")).getByRole("combobox"), {
      key: "Enter",
    });
    expect(within(screen.getByTestId("library-filter-player")).getByText("carl")).toBeInTheDocument();
    // Newest first: "2023.10" is after April.
    expect(rowNumbers()).toEqual(["3", "2", "1"]);
    fireEvent.click(panel().getByTestId("library-filter-color-black"));
    expect(rowNumbers()).toEqual(["3", "2"]);
    expect(where()).toContain("player=carl");
    expect(where()).toContain("color=black");
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("2 of 3 games");
  });

  it("gathers two spellings of one player, the URL carrying both (CTA-95)", async () => {
    const mixed = await keep("Spellings", [
      '[Event "Mixed"]\n[Date "2023.06.01"]\n[White "Carlsen, Magnus"]\n[Black "Nepo"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
      '[Event "Mixed"]\n[Date "2023.05.01"]\n[White "Ding"]\n[Black "Carlsen,M"]\n[Result "1-0"]\n\n1. d4 d5 1-0',
      '[Event "Mixed"]\n[Date "2023.04.01"]\n[White "Nepo"]\n[Black "Ding"]\n[Result "1/2-1/2"]\n\n1. c4 1/2-1/2',
    ]);
    await mountTable(`/library/${mixed.id}`);
    const box = within(screen.getByTestId("library-filter-player")).getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Carlsen, Magnus" }));
    fireEvent.click(await screen.findByRole("option", { name: "Carlsen,M" }));
    expect(rowNumbers()).toEqual(["1", "2"]);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("2 of 3 games");
    // Every name its own repeated param — a link, or a reload, carries them all.
    const url = `/library/${mixed.id}?player=${encodeURIComponent("Carlsen, Magnus").replace(/%20/g, "+")}&player=${encodeURIComponent("Carlsen,M")}`;
    expect(where()).toBe(url);
    cleanupAndMount(where());
    await screen.findByTestId("library-table");
    expect(rowNumbers()).toEqual(["1", "2"]);
    // The side any of them had: of the two spellings, only "Carlsen,M" was Black.
    fireEvent.click(panel().getByTestId("library-filter-color-black"));
    expect(rowNumbers()).toEqual(["2"]);
  });

  it("narrows by opening name or ECO, event and dates, all from the URL", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?opening=sicil`);
    expect(rowNumbers()).toEqual(["2"]);
    cleanupAndMount(`/library/${rich.id}?opening=D3`);
    await screen.findByTestId("library-table");
    expect(rowNumbers()).toEqual(["3"]);
    cleanupAndMount(`/library/${rich.id}?event=Spring+Open`);
    await screen.findByTestId("library-table");
    expect(rowNumbers()).toEqual(["2", "1"]);

    cleanupAndMount(`/library/${rich.id}`);
    await screen.findByTestId("library-table");
    // "2023.10" is any day of October.
    fireEvent.change(screen.getByTestId("library-filter-from"), { target: { value: "2023-04-03" } });
    expect(rowNumbers()).toEqual(["3", "2"]);
    fireEvent.change(screen.getByTestId("library-filter-to"), { target: { value: "2023-10-05" } });
    expect(rowNumbers()).toEqual(["3", "2"]);
    fireEvent.change(screen.getByTestId("library-filter-to"), { target: { value: "2023-09-30" } });
    expect(rowNumbers()).toEqual(["2"]);
    expect(screen.getByTestId("library-filter-from")).toHaveAttribute("min", "2023-04-02");
  });

  it("opens newest first, and turns or leaves the date order from its header", async () => {
    const rich = await keep("Rich", [...RICH, '[Event "Undated"]\n[White "X"]\n[Black "Y"]\n\n1. e4 *']);
    await mountTable(`/library/${rich.id}`);
    // Undated games last, whichever way.
    expect(rowNumbers()).toEqual(["3", "2", "1", "4"]);
    expect(where()).toBe(`/library/${rich.id}`);

    fireEvent.click(screen.getByTestId("library-table-sort-date"));
    expect(rowNumbers()).toEqual(["1", "2", "3", "4"]);
    expect(where()).toBe(`/library/${rich.id}?dir=asc`);
    fireEvent.click(screen.getByTestId("library-table-sort-date"));
    expect(where()).toBe(`/library/${rich.id}`);

    // `#` is the collection's own order.
    fireEvent.click(screen.getByTestId("library-table-sort-number"));
    expect(rowNumbers()).toEqual(["1", "2", "3", "4"]);
    expect(where()).toBe(`/library/${rich.id}?sort=number`);
  });

  it("clears every filter at once, leaving the words box alone", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?q=open&player=carl&color=white&result=1-0`);
    expect(rowNumbers()).toEqual(["1"]);
    fireEvent.click(panel().getByTestId("library-filter-clear"));
    expect(rowNumbers()).toEqual(["2", "1"]);
    expect(where()).toBe(`/library/${rich.id}?q=open`);
    expect(panel().getByTestId("library-filter-clear")).toBeDisabled();
  });

  it("lists every opening of a real 5,722-game collection, ECO code first — not a first page", async () => {
    const { rows, id } = await keepCarlsen();
    await mountTable(`/library/${id}`);

    const expected = collectionFacetsOf(numberedRows(rows)).openings;
    const box = within(screen.getByTestId("library-filter-opening")).getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    // `hidden: true` skips the per-element visibility check — the computed style of
    // each option and its ancestors, 1,704 times over; the list is open, so all show (CTA-124).
    const options = within(await screen.findByRole("listbox")).getAllByRole("option", { hidden: true });
    expect(options).toHaveLength(expected.length);
    expect(options[0]).toHaveTextContent(/^A0\d/);
    expect(options[options.length - 1]).toHaveTextContent(/^E9\d/);

    // Picking one narrows the table to its games.
    // The fixture's codes carry a ChessBase-style sub-code: `B90a`, `B90e`, ….
    const pick = options.find((option) => /^B90[a-z]?\b/.test(option.textContent ?? ""))!;
    const label = pick.textContent!;
    fireEvent.click(pick);
    const matching = filteredRows(numberedRows(rows), { text: "", result: "", opening: label }).length;
    expect(matching).toBeGreaterThan(0);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent(`${matching} of 5722 games`);
    expect(where()).toContain(`opening=${encodeURIComponent(label).replace(/%20/g, "+")}`);
  }, 60_000);

  it("offers a shipped collection's openings, filled from the book where the file has none", async () => {
    await mountTable("/library/capablanca");
    typeInto("library-filter-opening", "king's gambit");
    expect(rowNumbers().length).toBeGreaterThan(0);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent(/of 1035 games/);
  });
});

describe("the opening-moves filter", () => {
  const RICH = [
    '[Event "Spring Open"]\n[White "Carlsen"]\n[Black "Nepo"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nf6 1-0',
    '[Event "Spring Open"]\n[White "Nepo"]\n[Black "Carlsen"]\n[Result "0-1"]\n\n1. e4 c5 0-1',
    '[Event "Autumn Cup"]\n[White "Ding"]\n[Black "Carlsen"]\n[Result "1/2-1/2"]\n\n1. d4 d5 1/2-1/2',
  ];
  // Two games that share 32 plies before they part — past the 15-move cap the
  // index used to cut lines at (CTA-92), so the tree has to hold them.
  const SHARED_LINE = Array.from({ length: 32 }, (_, index) => ["Nf3", "Nf6", "Ng1", "Ng8"][index % 4]);
  const SHARED_TEXT = `${"1. Nf3 Nf6 2. Ng1 Ng8 ".repeat(8)}17. `;
  const LONG = [
    `[Event "Long"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n${SHARED_TEXT}e4 e5 *`,
    `[Event "Long"]\n[White "C"]\n[Black "D"]\n[Result "0-1"]\n\n${SHARED_TEXT}d4 d5 *`,
  ];
  const moves = () => within(screen.getByTestId("library-filter-moves"));
  const dropOn = (from: string, to: string) => {
    let accepted: boolean | undefined;
    act(() => {
      accepted = boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
    });
    return accepted;
  };
  /** One continuation's arrow, from the play-chance overlay over the board. */
  const arrowOn = (from: string) =>
    screen.getByTestId("library-filter-arrows").querySelector(`path[data-from="${from}"]`)!;

  it("draws the whole collection's continuations as play-chance arrows, wide by their share", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}`);
    expect(boardOptions().id).toBe("library-filter-board");
    expect(boardOptions().arrows).toBeUndefined(); // the overlay draws them now (CTA-92)
    expect(arrowOn("e2").getAttribute("data-to")).toBe("e4");
    expect(arrowOn("d2").getAttribute("data-to")).toBe("d4");
    // White with the play-chance border — the encoding the repertoires taught.
    expect(arrowOn("e2")).toHaveAttribute("fill", CHANCE_ARROW_FILL_COLOR);
    expect(arrowOn("e2")).toHaveAttribute("stroke", CHANCE_ARROW_BORDER_COLOR);
    // 2 of 3 games played e4: the wider border.
    expect(Number(arrowOn("e2").getAttribute("stroke-width"))).toBeGreaterThan(
      Number(arrowOn("d2").getAttribute("stroke-width")),
    );
    expect(moves().getByTestId("library-filter-move-count-e4")).toHaveTextContent("2 games · 67%");
    expect(moves().getByTestId("library-filter-move-count-d4")).toHaveTextContent("1 game · 33%");
    // Hovering a move takes the hover colour.
    expect(arrowOn("d2")).toHaveAttribute("stroke", CHANCE_ARROW_BORDER_COLOR);
    fireEvent.mouseEnter(moves().getByTestId("library-filter-move-d4"));
    expect(arrowOn("d2")).toHaveAttribute("stroke", HOVERED_NEXT_MOVE_ARROW_COLOR);
  });

  it("narrows the rows to the games that began with the moves played, in the URL", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}`);
    fireEvent.click(moves().getByTestId("library-filter-move-e4"));
    expect(rowNumbers()).toEqual(["1", "2"]);
    expect(where()).toBe(`/library/${rich.id}?line=e4`);
    expect(dropOn("c7", "c5")).toBe(true);
    expect(rowNumbers()).toEqual(["2"]);
    expect(where()).toBe(`/library/${rich.id}?line=e4%2Cc5`);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("1 of 3 games");
    expect(moves().getByTestId("library-filter-moves-line")).toHaveTextContent("1. e4 c5");

    fireEvent.click(moves().getByTestId("library-filter-moves-back"));
    expect(rowNumbers()).toEqual(["1", "2"]);
    fireEvent.click(moves().getByTestId("library-filter-moves-reset"));
    expect(rowNumbers()).toEqual(["1", "2", "3"]);
    expect(where()).toBe(`/library/${rich.id}`);
  });

  it("refuses a move no game played, and a drop off the board", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?line=e4`);
    const position = boardOptions().position;
    expect(dropOn("e7", "e6")).toBe(false);
    expect(dropOn("e7", "e5")).toBe(true);
    expect(rowNumbers()).toEqual(["1"]);
    expect(boardOptions().position).not.toBe(position);
    // Past e5 only game 1 continues, so the tree stops there — the cut (CTA-92):
    // its move is no longer offered, even though the game played it.
    expect(dropOn("g1", "f3")).toBe(false);
    expect(dropOn("b8", null as unknown as string)).toBe(false);
    expect(dropOn("b8", "c6")).toBe(false);
    expect(where()).toContain("line=e4%2Ce5");
  });

  it("sits under the player and side, with the other filters under it", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}`);
    const board = screen.getByTestId("library-filter-moves");
    const before = (testId: string) =>
      screen.getByTestId(testId).compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING;
    const after = (testId: string) =>
      screen.getByTestId(testId).compareDocumentPosition(board) & Node.DOCUMENT_POSITION_PRECEDING;
    expect(before("library-filter-player")).toBeTruthy();
    expect(before("library-filter-color")).toBeTruthy();
    expect(after("library-filter-event")).toBeTruthy();
    expect(after("library-table-result")).toBeTruthy();
  });

  it("draws the tree of the games the other filters leave, and Clear takes the line off with them", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?player=carlsen&color=black`);
    // Carlsen as Black: 1. e4 c5 and 1. d4 d5 — 1. e4 is one game, not two.
    expect(moves().getByTestId("library-filter-move-count-e4")).toHaveTextContent("1 game · 50%");
    fireEvent.click(moves().getByTestId("library-filter-move-e4"));
    expect(rowNumbers()).toEqual(["2"]);
    // Past e4 only game 2 continues, so the tree stops — the cut's caption.
    expect(moves().queryByTestId("library-filter-move-c5")).toBeNull();
    expect(moves().queryByTestId("library-filter-move-e5")).toBeNull();
    expect(moves().getByTestId("library-filter-moves-end")).toHaveTextContent("Only one game");
    // Only the moves these games played are taken.
    expect(dropOn("e7", "e5")).toBe(false);
    fireEvent.click(within(screen.getByTestId("library-filters")).getByTestId("library-filter-clear"));
    expect(rowNumbers()).toEqual(["1", "2", "3"]);
    expect(where()).toBe(`/library/${rich.id}`);
  });

  it("keeps the line as written when the other filters leave no game on it", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?line=e4,e5&player=ding`);
    expect(rowNumbers()).toEqual([]);
    expect(where()).toContain("line=e4,e5");
    expect(moves().getByTestId("library-filter-moves-line")).toHaveTextContent("1. e4 e5");
    expect(moves().getByTestId("library-filter-moves-end")).toHaveTextContent("No game the other filters leave");
    expect(boardOptions().arrows).toBeUndefined();
    expect(screen.getByTestId("library-filter-arrows").querySelectorAll("path")).toHaveLength(0);
    // Taking the player off (the chip's ×) brings the line's games back.
    fireEvent.click(screen.getByTestId("library-filter-player").querySelector(".MuiChip-deleteIcon")!);
    expect(rowNumbers()).toEqual(["1"]);
  });

  it("offers continuations past the 15-move cap, and says where the cut lands", async () => {
    const long = await keep("Long", LONG);
    await mountTable(`/library/${long.id}?line=${SHARED_LINE.join(",")}`);
    // 32 plies in — past the cap the lines used to stop at — the games still branch.
    expect(moves().getByTestId("library-filter-moves-line")).toHaveTextContent("16. Ng1 Ng8");
    expect(moves().getByTestId("library-filter-move-e4")).toBeInTheDocument();
    expect(moves().getByTestId("library-filter-move-d4")).toBeInTheDocument();
    expect(moves().getByTestId("library-filter-move-count-e4")).toHaveTextContent("1 game · 50%");
    // One of the two games continues from there, so the tree stops and says so.
    fireEvent.click(moves().getByTestId("library-filter-move-e4"));
    expect(rowNumbers()).toEqual(["1"]);
    expect(moves().queryByTestId("library-filter-move-e5")).toBeNull();
    expect(moves().getByTestId("library-filter-moves-end")).toHaveTextContent(
      "Only one game in the collection goes further here",
    );
  });

  it("still says where the games themselves stopped — no game goes further", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?line=e4,c5`);
    expect(rowNumbers()).toEqual(["2"]);
    expect(moves().getByTestId("library-filter-moves-end")).toHaveTextContent("No game in the collection");
  });

  it("follows a stale line from the URL as far as the games go", async () => {
    const rich = await keep("Rich", RICH);
    await mountTable(`/library/${rich.id}?line=e4,e6,d4`);
    expect(rowNumbers()).toEqual(["1", "2"]);
    expect(moves().getByTestId("library-filter-moves-line")).toHaveTextContent("1. e4");
  });

  it("is not offered where the index has no lines — one from before the column", async () => {
    const rows = GAMES.map((pgn): IndexedRow => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { line, ...row } = indexedRowOf(pgn);
      return row;
    });
    const added = await addCollection("Old", GAMES, rows);
    if (!("collection" in added)) throw new Error("not added");
    await mountTable(`/library/${added.collection.id}?line=e4`);
    expect(screen.queryByTestId("library-filter-moves")).toBeNull();
    expect(rowNumbers()).toEqual(["1", "2", "3"]);
  });

  describe("Save tree as PGN (CTA-99)", () => {
    beforeEach(() => vi.mocked(downloadPgn).mockClear());
    const dialog = () => within(screen.getByTestId("library-filter-moves-save-dialog"));
    const openSave = () => {
      fireEvent.click(moves().getByTestId("library-filter-moves-save"));
      return dialog();
    };
    const closed = () =>
      waitFor(() => expect(screen.queryByTestId("library-filter-moves-save-dialog")).toBeNull());

    it("sits at the end of the caption row, before and after a move is played", async () => {
      const rich = await keep("Rich", RICH);
      await mountTable(`/library/${rich.id}`);
      const row = () => moves().getByTestId("library-filter-moves-line").parentElement!;
      expect(row()).toContainElement(moves().getByTestId("library-filter-moves-save"));
      expect(row().lastElementChild).toBe(moves().getByTestId("library-filter-moves-save"));
      expect(moves().getByTestId("library-filter-moves-save")).toHaveTextContent("Save tree as PGN");
      fireEvent.click(moves().getByTestId("library-filter-move-e4"));
      expect(row()).toHaveTextContent("1. e4");
      expect(row().lastElementChild).toBe(moves().getByTestId("library-filter-moves-save"));
    });

    it("opens on Add tags with games ticked; No turns the boxes off; neither ticked turns Save off", async () => {
      const rich = await keep("Rich", RICH);
      await mountTable(`/library/${rich.id}`);
      const open = openSave();
      expect(open.getByText("Should we add games number as tag?")).toBeInTheDocument();
      expect(open.getByTestId("library-filter-moves-save-tags")).toBeChecked();
      expect(open.getByTestId("library-filter-moves-save-games")).toBeChecked();
      expect(open.getByTestId("library-filter-moves-save-prc")).not.toBeChecked();
      expect(open.getByTestId("library-filter-moves-save-confirm")).toBeEnabled();

      fireEvent.click(open.getByTestId("library-filter-moves-save-no"));
      expect(open.getByTestId("library-filter-moves-save-games")).toBeDisabled();
      expect(open.getByTestId("library-filter-moves-save-prc")).toBeDisabled();
      expect(open.getByTestId("library-filter-moves-save-confirm")).toBeEnabled();

      fireEvent.click(open.getByTestId("library-filter-moves-save-tags"));
      expect(open.getByTestId("library-filter-moves-save-games")).toBeEnabled();
      fireEvent.click(open.getByTestId("library-filter-moves-save-games"));
      expect(open.getByTestId("library-filter-moves-save-confirm")).toBeDisabled();
      fireEvent.click(open.getByTestId("library-filter-moves-save-prc"));
      expect(open.getByTestId("library-filter-moves-save-confirm")).toBeEnabled();
    });

    it("saves the whole tree with [%games N] by default, named after the collection", async () => {
      const rich = await keep("Rich", RICH);
      await mountTable(`/library/${rich.id}`);
      fireEvent.click(openSave().getByTestId("library-filter-moves-save-confirm"));
      expect(downloadPgn).toHaveBeenCalledTimes(1);
      expect(downloadPgn).toHaveBeenLastCalledWith("rich-tree", [
        '[Event "Rich"]\n[Result "*"]\n\n' +
          "1. e4 { [%games 2] } (1. d4 { [%games 1] }) 1... e5 { [%games 1] } (1... c5 { [%games 1] }) *",
      ]);
      await closed();
    });

    it("writes both tags in one comment, games first, below the line played — which carries none", async () => {
      const rich = await keep("Rich", RICH);
      await mountTable(`/library/${rich.id}?line=e4`);
      const open = openSave();
      fireEvent.click(open.getByTestId("library-filter-moves-save-prc"));
      fireEvent.click(open.getByTestId("library-filter-moves-save-confirm"));
      expect(downloadPgn).toHaveBeenLastCalledWith("rich-tree", [
        '[Event "Rich"]\n[Result "*"]\n\n' +
          "1. e4 e5 { [%games 1] [%prc 50] } (1... c5 { [%games 1] [%prc 50] }) *",
      ]);
    });

    it("writes the moves alone on No, and Cancel downloads nothing", async () => {
      const rich = await keep("Rich", RICH);
      await mountTable(`/library/${rich.id}`);
      fireEvent.click(openSave().getByTestId("library-filter-moves-save-cancel"));
      await closed();
      expect(downloadPgn).not.toHaveBeenCalled();

      const open = openSave();
      fireEvent.click(open.getByTestId("library-filter-moves-save-no"));
      fireEvent.click(open.getByTestId("library-filter-moves-save-confirm"));
      expect(downloadPgn).toHaveBeenLastCalledWith("rich-tree", [
        '[Event "Rich"]\n[Result "*"]\n\n1. e4 (1. d4) 1... e5 (1... c5) *',
      ]);
    });
  });
});
