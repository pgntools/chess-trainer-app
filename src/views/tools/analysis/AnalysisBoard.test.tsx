import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { analysisHandOffState } from "../../../lib/analysisHandOff";
import { DEFAULT_ANALYSIS_SETTINGS } from "../../../lib/analysisSettings";
import { parsePgnTree } from "../../../lib/pgn";
import { savedAnalysisOf, type SavedAnalysis } from "../../../lib/savedAnalyses";
import {
  addCollection,
  loadUploadedCollections,
  loadUploadedGames,
  resetLibraryCollectionStore,
} from "../../../lib/libraryCollectionStore";
import { analysisFoldersSnapshot, createAnalysisFolder } from "../../../lib/savedAnalysisFolderStore";
import { collectionNameOfStem } from "../../../lib/libraryCollections";
import { indexCollection } from "../../library/indexCollection";
import {
  addAnalyses,
  findSavedAnalysis,
  resetSavedAnalysisStore,
  saveAnalysis,
  savedAnalysesSnapshot,
} from "../../../lib/savedAnalysisStore";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { boardOptions, FakeEngine } from "../../board/boardTestHarness";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";
import { BoardLeftPanelOutlet, BoardLeftPanelProvider } from "../../main/boardLeftPanel";
import { NEXT_MOVE_ARROW_PALETTES, UNTAGGED_NEXT_MOVE_ARROW_COLOR } from "./nextMoveArrows";

vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

// The Library's write, spied on so a test can make it fail (CTA-101).
vi.mock("../../../lib/libraryCollectionStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/libraryCollectionStore")>();
  return { ...actual, addCollection: vi.fn(actual.addCollection) };
});

// The index pass and the analyses' writes, spied on so a test can make them fail (CTA-141).
vi.mock("../../library/indexCollection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../library/indexCollection")>();
  return { ...actual, indexCollection: vi.fn(actual.indexCollection) };
});
vi.mock("../../../lib/savedAnalysisFolderStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/savedAnalysisFolderStore")>();
  return { ...actual, createAnalysisFolder: vi.fn(actual.createAnalysisFolder) };
});
vi.mock("../../../lib/savedAnalysisStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/savedAnalysisStore")>();
  return { ...actual, addAnalyses: vi.fn(actual.addAnalyses) };
});

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

/*
  The opening book is an empty one — a screen test must not pull the real ~3MB
  of eco.json in — unless a test fills `book.entries` (the header's ECO chip).
  Only the *load* is stubbed: `findOpening` and `getPositionBook` run for real.
*/
const book = vi.hoisted(() => ({ entries: {} as Record<string, { eco: string; name: string; moves: string }> }));
vi.mock("../../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../../board/boardTestHarness");
  const actual = await importOriginal<typeof import("../../../lib/openings")>();
  return {
    ...(await openingsMock(importOriginal as () => Promise<typeof import("../../../lib/openings")>)),
    loadOpeningBook: () => Promise.resolve(book.entries),
    getPositionBook: actual.getPositionBook,
    findOpening: actual.findOpening,
  };
});

import AnalysisBoard from "./AnalysisBoard";

/*
  The Analysis Board, v2 (CTA-73): the arrivals, the explicit save (a new
  board's dialog, and Update / Save as copy / Discard over a record), the Load
  tab's one game, the popup of several (merge, or a games collection —
  CTA-101), the Export tab's options and the `?at=`
  link. The shared panel and square are asserted with the dev boards'
  (`boards.test.tsx`, `panelPropagation.test.tsx`), which include this
  screen.
*/

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

/** Where the router is — what a hand-off or a written link left behind. */
function Where() {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
}

const mount = (
  entry: string | { pathname: string; search?: string; state?: unknown } = "/tools/analysis",
) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/tools/analysis" element={<AnalysisBoard />} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
          <Where />
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const where = () => screen.getByTestId("where").textContent ?? "";

/** Drag a piece, the way the board would report it. */
const drag = (from: string, to: string) => {
  let accepted = false;
  act(() => {
    accepted = boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });
  return accepted;
};

/** End the search for the position on screen with a line and a bestmove, as the wrapper would. */
const engineSearches = (pv: string) => {
  const engine = FakeEngine.latest();
  const fen = engine.lastSearch;
  act(() => {
    engine.say({ fen, uciMessage: "info", depth: 12, multipv: 1, positionEvaluation: "20", pv });
  });
  act(() => {
    engine.say({ fen, uciMessage: "bestmove", bestMove: pv.split(" ")[0] });
  });
};

/** The board with its engine switched on — it starts off (CTA-148). */
const mountEngineOn = () => {
  mount();
  fireEvent.click(screen.getByTestId("analysis-setting-engine"));
};

const openTab = (id: string) => fireEvent.click(screen.getByTestId(`analysis-panel-tab-${id}`));

/** A saved analysis of `pgn`, standing at `path`, written to the store. */
const stored = async (
  id: string,
  pgn: string,
  path: string[] = [],
  extra: Partial<SavedAnalysis> = {},
): Promise<SavedAnalysis> => {
  const record = {
    ...savedAnalysisOf(id, parsePgnTree(pgn), path, DEFAULT_ANALYSIS_SETTINGS, "white"),
    ...extra,
  };
  await saveAnalysis(record);
  return record;
};

/** The saved analyses as read — `[]` before the first read. */
const listed = () => savedAnalysesSnapshot() ?? [];

beforeEach(async () => {
  localStorage.clear();
  book.entries = {};
  FakeEngine.reset();
  await i18n.changeLanguage("en");
});

describe("the Analysis Board's arrivals", () => {
  it("opens a ?fen= position facing the side to move", () => {
    mount(`/tools/analysis?fen=${encodeURIComponent(AFTER_E4)}`);
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("opens a ?game= at its ?move=, facing White, and writes ?at= in the move's place", async () => {
    await stored("g1", "1. e4 e5 2. Nf3 *");
    mount("/tools/analysis?game=analysis/saved/g1&move=2");
    expect(boardOptions().position).toBe(AFTER_E4_E5);
    expect(boardOptions().boardOrientation).toBe("white");
    expect(where()).toContain("at=e4%2Ce5");
    expect(where()).not.toContain("move=");
  });

  it("opens a Library game (?game=library/…) once its collection's games are read, at ?at=", async () => {
    mount("/tools/analysis?game=library/capablanca/1&at=e4");
    // The shipped PGN chunk is fetched first; the board waits rather than open blank.
    expect(screen.getByTestId("analysis-loading")).toBeInTheDocument();
    await waitFor(() => expect(boardOptions().position).toBe(AFTER_E4));
    expect(boardOptions().boardOrientation).toBe("white");
    expect(screen.getByTestId("analysis-save")).not.toBeDisabled();
  });

  it("reopens a saved analysis where it was left, facing the way it faced", async () => {
    await stored("a1", "1. e4 e5 *", ["e4"], { orientation: "black", name: "Mine" });
    mount("/tools/analysis?analysis=a1");
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
    expect(screen.getByTestId("analysis-name")).toHaveTextContent("Mine");
    // Nothing changed yet: there is nothing to save.
    expect(screen.getByTestId("analysis-save")).toBeDisabled();
  });

  it("waits for the store's read before reopening, rather than calling the record missing", async () => {
    await stored("a1", "1. e4 e5 *", ["e4"], { name: "Mine" });
    resetSavedAnalysisStore(); // a reload: the record is in IndexedDB, nothing read yet
    mount("/tools/analysis?analysis=a1");
    expect(screen.getByTestId("analysis-loading")).toBeInTheDocument();
    expect(await screen.findByTestId("analysis-name")).toHaveTextContent("Mine");
    expect(boardOptions().position).toBe(AFTER_E4);
  });

  it("lets ?at= beat the record's own place — a permanent link", async () => {
    await stored("a1", "1. e4 e5 *", ["e4"]);
    mount("/tools/analysis?analysis=a1&at=e4,e5");
    expect(boardOptions().position).toBe(AFTER_E4_E5);
  });

  it("writes every step back as ?at=", () => {
    mount();
    drag("e2", "e4");
    expect(where()).toBe("/tools/analysis?at=e4");
    act(() => {
      screen.getByTestId("board-control-first").click();
    });
    expect(where()).toBe("/tools/analysis");
  });
});

describe("a whole tree handed over by the Openings explorer (CTA-78)", () => {
  const AFTER_E4_C5 = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
  const handedOver = () =>
    mount({
      pathname: "/tools/analysis",
      search: "?at=e4,c5",
      state: analysisHandOffState(
        parsePgnTree("1. e4 e5 {The main line} (1... c5 2. Nf3) 2. Nf3 *"),
        "black",
      ),
    });

  it("opens the tree, side lines and comments, at ?at=, facing the way it was handed over", () => {
    handedOver();
    expect(boardOptions().position).toBe(AFTER_E4_C5);
    expect(boardOptions().boardOrientation).toBe("black");
    openTab("export");
    const pgn = (screen.getByTestId("analysis-export-pgn") as HTMLTextAreaElement).value;
    expect(pgn).toContain("{ The main line }");
    expect(pgn).toContain("(1... c5 2. Nf3)");
  });

  it("is a new board, not saved: Save names it, and a reload asks first", () => {
    handedOver();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByTestId("analysis-save"));
    expect(screen.getByTestId("analysis-save-name")).toBeInTheDocument();
    expect(listed()).toEqual([]);
  });

  it("ignores a location state that is not a hand-off", () => {
    mount({ pathname: "/tools/analysis", state: { analysisHandOff: { pgn: 3 } } });
    expect(boardOptions().position).toBe(START);
    expect(screen.getByTestId("analysis-save")).toBeDisabled();
  });
});

describe("saving a board that is not a record yet", () => {
  it("has nothing to save on a blank board", () => {
    mount();
    expect(screen.getByTestId("analysis-save")).toBeDisabled();
  });

  it("names it and files it through the dialog, and becomes that record", async () => {
    const folder = (await createAnalysisFolder("Openings", null))!;
    mount();
    drag("e2", "e4");
    fireEvent.click(screen.getByTestId("analysis-save"));

    fireEvent.change(screen.getByTestId("analysis-save-name"), {
      target: { value: "King's pawn" },
    });
    fireEvent.click(screen.getByTestId(`analysis-folder-picker-${folder.id}`));
    fireEvent.click(screen.getByTestId("analysis-save-confirm"));

    await waitFor(() => expect(listed()).toHaveLength(1));
    const [saved] = listed();
    expect(saved).toMatchObject({ name: "King's pawn", folderId: folder.id, path: ["e4"] });
    await waitFor(() => expect(where()).toBe(`/tools/analysis?analysis=${saved.id}&at=e4`));
    expect(screen.getByTestId("analysis-name")).toHaveTextContent("King's pawn");
    // Saved: nothing is left to save until the next change.
    expect(screen.getByTestId("analysis-save")).toBeDisabled();
  });

  it("asks before a reload loses a board with changes", () => {
    mount();
    const before = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    drag("e2", "e4");
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
  });
});

describe("the changes over a saved analysis", () => {
  const openStrip = () => {
    fireEvent.click(screen.getByTestId("analysis-save"));
    return screen.getByTestId("analysis-changes");
  };

  it("updates the record in place with the session's tree and place", async () => {
    await stored("a1", "1. e4 *", ["e4"], { name: "Mine" });
    mount("/tools/analysis?analysis=a1");
    drag("e7", "e5");

    const strip = openStrip();
    expect(within(strip).getByTestId("analysis-changes-summary")).toHaveTextContent(
      "1 move added",
    );
    // An analysis has no protection: Update is always there.
    expect(within(strip).queryByTestId("analysis-changes-settings")).toBeNull();
    fireEvent.click(within(strip).getByTestId("analysis-changes-update"));

    await waitFor(() => expect(screen.getByTestId("analysis-save")).toBeDisabled());
    expect(listed()).toHaveLength(1);
    expect(findSavedAnalysis("a1")).toMatchObject({ name: "Mine", path: ["e4", "e5"] });
    expect(findSavedAnalysis("a1")?.pgn).toContain("1. e4 e5");
    expect(screen.queryByTestId("analysis-changes")).toBeNull();
    expect(screen.getByTestId("analysis-save")).toBeDisabled();
  });

  it("saves a copy in the same folder and goes on in it, the original untouched", async () => {
    const folder = (await createAnalysisFolder("Mine", null))!;
    await stored("a1", "1. e4 *", ["e4"], { name: "Plan", folderId: folder.id });
    mount("/tools/analysis?analysis=a1");
    drag("e7", "e5");
    fireEvent.click(within(openStrip()).getByTestId("analysis-changes-copy"));

    await waitFor(() => expect(listed()).toHaveLength(2));
    const copy = listed().find((row) => row.id !== "a1")!;
    expect(copy).toMatchObject({ name: "Plan (copy)", folderId: folder.id });
    expect(copy.pgn).toContain("e5");
    expect(findSavedAnalysis("a1")?.pgn).not.toContain("e5");
    await waitFor(() => expect(where()).toContain(`analysis=${copy.id}`));
  });

  it("discards back to the record, on the last of its positions", async () => {
    await stored("a1", "1. e4 *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    drag("e7", "e5");
    drag("g1", "f3");
    fireEvent.click(within(openStrip()).getByTestId("analysis-changes-discard"));

    expect(boardOptions().position).toBe(AFTER_E4);
    expect(screen.getByTestId("analysis-save")).toBeDisabled();
    expect(findSavedAnalysis("a1")?.pgn).not.toContain("e5");
  });
});

describe("the Load tab", () => {
  const paste = (text: string) => {
    openTab("load");
    fireEvent.change(screen.getByTestId("analysis-load-paste"), { target: { value: text } });
    fireEvent.click(screen.getByTestId("analysis-load-text"));
  };

  it("puts one game on the board as a new, unsaved analysis", async () => {
    await stored("a1", "1. d4 *", ["d4"], { name: "Old" });
    mount("/tools/analysis?analysis=a1");
    paste('[White "Tal"]\n[Black "Koblents"]\n\n1. e4 e5 *');

    // A game does not turn the board, and opens at its start.
    expect(boardOptions().position).toBe(START);
    expect(screen.getByTestId("analysis-name")).toHaveTextContent("Tal – Koblents");
    expect(where()).not.toContain("analysis=");
    // Not the old record's: Save asks for a name.
    fireEvent.click(screen.getByTestId("analysis-save"));
    expect(screen.getByTestId("analysis-save-name")).toHaveValue("Tal – Koblents");
    expect(findSavedAnalysis("a1")?.pgn).not.toContain("e4");
  });

  it("still loads a one-move PGN as a game — the Lobby's position rule is its own", () => {
    mount();
    paste("1. e4 *");

    // `onLoadPosition` is opt-in: without it, a one-move game is a game,
    // opened at its start rather than at the position after its move.
    expect(boardOptions().position).toBe(START);
    openTab("export");
    expect(
      (screen.getByTestId("analysis-export-pgn") as HTMLTextAreaElement).value,
    ).toContain("1. e4");
  });

  describe("several games open the popup (CTA-101)", () => {
    const TWO_LINES = '[Event "Two lines"]\n\n1. e4 e5 *\n\n[Event "Two lines"]\n\n1. e4 c5 *';

    beforeEach(async () => {
      await resetLibraryCollectionStore();
      vi.mocked(addCollection).mockClear();
    });

    it("offers merge and a games collection, and no split", () => {
      mount();
      paste(TWO_LINES);
      const popup = screen.getByTestId("analysis-choice");
      expect(popup).toHaveTextContent("This PGN holds 2 games");
      expect(screen.getByTestId("analysis-choice-merge")).toBeEnabled();
      expect(screen.getByTestId("analysis-choice-collection")).toBeEnabled();
      expect(screen.queryByTestId("analysis-choice-split")).toBeNull();
    });

    it("merges them into one tree on the board, the games counted at the branch", () => {
      mount();
      paste(TWO_LINES);
      fireEvent.click(screen.getByTestId("analysis-choice-merge"));

      expect(screen.queryByTestId("analysis-choice")).toBeNull();
      openTab("export");
      expect((screen.getByTestId("analysis-export-pgn") as HTMLTextAreaElement).value).toContain(
        "1. e4 e5 { [%games 1] } (1... c5 { [%games 1] })",
      );
      expect(listed()).toEqual([]);
    });

    it("keeps Merge off, saying why, for games from different starts — the collection stays", () => {
      mount();
      paste(
        '[Event "A"]\n\n1. e4 *\n\n[Event "B"]\n[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. Kd2 *',
      );
      expect(screen.getByTestId("analysis-choice-merge")).toBeDisabled();
      expect(screen.getByTestId("analysis-choice")).toHaveTextContent("different positions");
      expect(screen.getByTestId("analysis-choice-collection")).toBeEnabled();
    });

    it("saves them as a Library collection at the top level, and goes to its table", async () => {
      mount();
      paste(TWO_LINES);
      fireEvent.click(screen.getByTestId("analysis-choice-collection"));

      // The index pass loads the opening book: slow on a busy machine.
      await waitFor(() => expect(where()).toMatch(/^\/library\/u/), { timeout: 10_000 });
      const [collection] = await loadUploadedCollections();
      expect(collection).toMatchObject({ name: "Two lines", count: 2, folderId: null });
      expect(where()).toBe(`/library/${collection.id}`);
      expect(await loadUploadedGames(collection.id)).toHaveLength(2);
      expect(listed()).toEqual([]);
    });

    it("writes nothing when cancelled, even with the games being checked", async () => {
      mount();
      paste(TWO_LINES);
      fireEvent.click(screen.getByTestId("analysis-choice-collection"));
      expect(screen.getByTestId("analysis-choice-indexing")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("analysis-choice-cancel"));

      await waitFor(() => expect(screen.queryByTestId("analysis-choice")).toBeNull());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(addCollection).not.toHaveBeenCalled();
      expect(await loadUploadedCollections()).toEqual([]);
      expect(where()).toBe("/tools/analysis");
    });

    it("says so in the popup when the collection cannot be written", async () => {
      vi.mocked(addCollection).mockResolvedValueOnce({ problem: "storage" });
      mount();
      paste(TWO_LINES);
      fireEvent.click(screen.getByTestId("analysis-choice-collection"));

      expect(
        await screen.findByTestId("analysis-choice-problem", {}, { timeout: 10_000 }),
      ).toHaveTextContent(
        "could not be saved",
      );
      expect(screen.getByTestId("analysis-choice")).toBeInTheDocument();
      expect(where()).toBe("/tools/analysis");
    });

    it("tells a failed check from a failed write, and logs the cause (CTA-141)", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      const checkFailure = new Error("worker gone");
      vi.mocked(indexCollection).mockRejectedValueOnce(checkFailure);
      mount();
      paste(TWO_LINES);
      fireEvent.click(screen.getByRole("button", { name: "Save as games collection" }));
      expect(await screen.findByTestId("analysis-choice-problem")).toHaveTextContent("could not be checked");
      expect(logged).toHaveBeenCalledWith(expect.stringContaining("check"), checkFailure);

      const writeFailure = new Error("disk gone");
      vi.mocked(addCollection).mockRejectedValueOnce(writeFailure);
      fireEvent.click(screen.getByRole("button", { name: "Save as games collection" }));
      await waitFor(
        () => expect(screen.getByTestId("analysis-choice-problem")).toHaveTextContent("checked, but could not be written"),
        { timeout: 10_000 },
      );
      expect(logged).toHaveBeenCalledWith(expect.stringContaining("write"), writeFailure);
      logged.mockRestore();
    });
  });

  describe("several games saved to Saved analyses (CTA-141)", () => {
    const POSITION = "8/8/2k5/3r4/4Q3/5K2/8/8 w - - 1 1";
    const CHAPTERS = [
      `[Event "Study: Intro"]\n[ChapterName "Intro"]\n[FEN "${POSITION}"]\n[SetUp "1"]\n\n{ Begin. } 1. Qh4 { [%cal Gh4d8] } *`,
      `[Event "Study: Position"]\n[ChapterName "Position"]\n[FEN "${POSITION}"]\n[SetUp "1"]\n\n*`,
      '[Event "Study: Broken"]\n[ChapterName "Broken"]\n\n1. e4 e5 2. Qxx9 *',
      '[Event "Study: Lines"]\n[ChapterName "Lines"]\n\n1. e4 e5 (1... c5) 2. Nf3 *',
    ];
    const STEM = "lichess_study_queen-vs-rook";
    const pick = async (text: string) => {
      openTab("load");
      fireEvent.change(screen.getByTestId("analysis-load-input"), {
        target: { files: [new File([text], `${STEM}.pgn`, { type: "application/x-chess-pgn" })] },
      });
      await screen.findByTestId("analysis-choice");
    };
    const chooseAnalyses = () => {
      fireEvent.click(screen.getByRole("button", { name: "Save to Saved analyses" }));
      return screen.getByRole("dialog", { name: "Save to Saved analyses" });
    };

    beforeEach(() => {
      vi.mocked(addAnalyses).mockClear();
      vi.mocked(createAnalysisFolder).mockClear();
    });

    it("offers the choice with its help, and saves every game that reads into a new folder, then goes there", async () => {
      mount();
      await pick(CHAPTERS.join("\n\n"));
      expect(screen.getByRole("button", { name: "Save to Saved analyses" })).toHaveAccessibleDescription(
        /becomes a saved analysis/,
      );
      const dialog = chooseAnalyses();
      const name = within(dialog).getByRole("textbox", { name: "Folder name" });
      expect(name).toHaveValue(collectionNameOfStem(STEM));
      expect(dialog).toHaveTextContent("3 games will be saved as analyses");
      expect(dialog).toHaveTextContent("1 game could not be read");
      await expectNoAxeViolations(dialog);

      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(where()).toMatch(/^\/tools\/analysis\/saved\?folder=/));
      const [folder] = analysisFoldersSnapshot() ?? [];
      expect(folder).toMatchObject({ name: collectionNameOfStem(STEM), parentId: null });
      expect(where()).toBe(`/tools/analysis/saved?folder=${encodeURIComponent(folder.id)}`);
      expect(listed().map((row) => [row.name, row.folderId])).toEqual([
        ["Intro", folder.id],
        ["Position", folder.id],
        ["Lines", folder.id],
      ]);
      expect(listed().map((row) => row.pgn)).toEqual([CHAPTERS[0], CHAPTERS[1], CHAPTERS[3]]);
    });

    it("names a paste by its shared event, refuses an empty name, and Back writes nothing", () => {
      mount();
      paste('[Event "Two lines"]\n\n1. e4 e5 *\n\n[Event "Two lines"]\n\n1. e4 c5 *');
      const dialog = chooseAnalyses();
      const name = within(dialog).getByRole("textbox", { name: "Folder name" });
      expect(name).toHaveValue("Two lines");
      fireEvent.change(name, { target: { value: "  " } });
      expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
      fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
      expect(screen.getByRole("button", { name: "Save to Saved analyses" })).toBeInTheDocument();
      expect(createAnalysisFolder).not.toHaveBeenCalled();
      expect(listed()).toEqual([]);
    });

    it("keeps nothing, saying why, when the folder or the records cannot be written", async () => {
      vi.mocked(createAnalysisFolder).mockResolvedValueOnce(undefined);
      mount();
      paste('[Event "A"]\n\n1. e4 *\n\n[Event "B"]\n\n1. d4 *');
      const dialog = chooseAnalyses();
      expect(within(dialog).getByRole("textbox", { name: "Folder name" })).toHaveValue("Analysed games");
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      expect(await within(dialog).findByTestId("analysis-choice-folder-problem")).toHaveTextContent("at most 100 folders");
      expect(addAnalyses).not.toHaveBeenCalled();

      vi.mocked(addAnalyses).mockResolvedValueOnce("too-many");
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(screen.getByTestId("analysis-choice-folder-problem")).toHaveTextContent("Nothing was saved"),
      );
      expect(screen.getByTestId("analysis-choice-folder-problem")).toHaveTextContent("analyses");
      await waitFor(() => expect(analysisFoldersSnapshot() ?? []).toEqual([]));
      expect(listed()).toEqual([]);
      expect(where()).toBe("/tools/analysis");
    });
  });

  it("sets a FEN up, facing the side to move", () => {
    mount();
    openTab("load");
    fireEvent.change(screen.getByTestId("analysis-load-fen-input"), {
      target: { value: AFTER_E4 },
    });
    fireEvent.click(screen.getByTestId("analysis-load-fen"));
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("says what is wrong with a text it cannot read", () => {
    mount();
    paste("this is not chess");
    expect(screen.getByTestId("analysis-load-problem")).toBeInTheDocument();
  });
});

describe("the Export tab", () => {
  it("copies the FEN, and the PGN with or without comments, NAGs and side lines", async () => {
    await stored("a1", "1. e4 $1 {Best by test.} e5 (1... c5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    openTab("export");

    expect(screen.getByTestId("analysis-export-fen")).toHaveValue(AFTER_E4);
    const pgn = () => (screen.getByTestId("analysis-export-pgn") as HTMLTextAreaElement).value;
    expect(pgn()).toContain("{ Best by test. }");
    expect(pgn()).toContain("$1");
    expect(pgn()).toContain("(1... c5)");

    fireEvent.click(screen.getByTestId("analysis-export-comments"));
    expect(pgn()).not.toContain("Best by test");
    fireEvent.click(screen.getByTestId("analysis-export-nags"));
    expect(pgn()).not.toContain("$1");
    fireEvent.click(screen.getByTestId("analysis-export-variations"));
    expect(pgn()).not.toContain("c5");
  });
});

describe("the variations explorer on the Analysis Board", () => {
  it("edits the tree from the move menu, which offers no play chances", async () => {
    await stored("a1", "1. e4 e5 (1... c5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    fireEvent.contextMenu(screen.getByTestId("move-ply-2"), { clientX: 40, clientY: 60 });
    expect(screen.getByTestId("move-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("move-menu-chances")).toBeNull();

    fireEvent.click(screen.getByTestId("move-menu-comment"));
    fireEvent.change(screen.getByTestId("comment-dialog-text"), {
      target: { value: "Symmetry." },
    });
    fireEvent.click(screen.getByTestId("comment-dialog-save"));
    // An edit is a session change like a move added.
    expect(screen.getByTestId("analysis-save")).toBeEnabled();
  });
});

describe("a saved analysis' settings on the board", () => {
  it("opens facing its side, with its description, and its arrows as set", async () => {
    await stored("a1", "1. e4 e5 (1... c5) *", ["e4"], {
      orientation: "black",
      description: "Two replies.",
      showArrows: false,
    });
    mount("/tools/analysis?analysis=a1");
    expect(boardOptions().boardOrientation).toBe("black");
    expect(screen.getByTestId("analysis-description")).toHaveTextContent("Two replies.");
    // At a branch, with the arrows off: none drawn.
    expect(boardOptions().arrows).toEqual([]);
  });

  it("links to its settings, but not while there are unsaved changes", async () => {
    await stored("a1", "1. e4 *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    expect(screen.getByTestId("analysis-settings")).toHaveAttribute(
      "href",
      "/tools/analysis/saved/a1/settings",
    );
    drag("e7", "e5");
    expect(screen.getByTestId("analysis-settings")).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the record's side and description when the session is updated", async () => {
    await stored("a1", "1. e4 *", ["e4"], { orientation: "black", description: "Mine." });
    mount("/tools/analysis?analysis=a1");
    act(() => {
      screen.getByTestId("board-control-flip").click();
    });
    drag("e7", "e5");
    fireEvent.click(screen.getByTestId("analysis-save"));
    fireEvent.click(screen.getByTestId("analysis-changes-update"));
    expect(findSavedAnalysis("a1")).toMatchObject({
      orientation: "black",
      description: "Mine.",
    });
  });

  it("has no settings link on a board that is not saved yet", () => {
    mount();
    expect(screen.queryByTestId("analysis-settings")).toBeNull();
  });
});

const AFTER_E4_E5_NF3 =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

describe("Play — the engine plays the opponent's best move until paused", () => {
  const play = () => fireEvent.click(screen.getByTestId("analysis-play"));
  const pressed = () => screen.getByTestId("analysis-play").getAttribute("aria-pressed");

  it("never moves a piece while Play is off", () => {
    mountEngineOn();
    engineSearches("e2e4 e7e5");
    expect(boardOptions().position).toBe(START);
    expect(pressed()).toBe("false");
  });

  it("is disabled while the engine is off — as it starts — and enabled once it is on", () => {
    mount();
    expect(screen.getByTestId("analysis-play")).toBeDisabled();
    fireEvent.click(screen.getByTestId("analysis-setting-engine"));
    expect(screen.getByTestId("analysis-play")).toBeEnabled();
    fireEvent.click(screen.getByTestId("analysis-setting-engine"));
    expect(screen.getByTestId("analysis-play")).toBeDisabled();
  });

  it("plays only the side not at the bottom of the board, turn after turn", () => {
    mountEngineOn();
    play();
    expect(pressed()).toBe("true");

    // White is the reader's: the engine's best move for White is not played.
    engineSearches("e2e4 e7e5");
    expect(boardOptions().position).toBe(START);

    drag("e2", "e4");
    engineSearches("e7e5 g1f3");
    expect(boardOptions().position).toBe(AFTER_E4_E5);

    // The reader's turn again: nothing moves until the reader does.
    engineSearches("g1f3 b8c6");
    expect(boardOptions().position).toBe(AFTER_E4_E5);
    drag("g1", "f3");
    expect(boardOptions().position).toBe(AFTER_E4_E5_NF3);
    expect(pressed()).toBe("true");
  });

  it("plays White when the board faces Black", () => {
    mountEngineOn();
    act(() => {
      screen.getByTestId("board-control-flip").click();
    });
    play();
    engineSearches("e2e4 e7e5");
    expect(boardOptions().position).toBe(AFTER_E4);
  });

  it("searches until stopped under infinite analysis, and to the depth while Play is on — Play needs a move (CTA-160)", () => {
    mountEngineOn();
    openTab("engine");
    expect(FakeEngine.latest().searchOptions.at(-1)).toEqual({ depth: 20, movetime: 0 });

    fireEvent.click(screen.getByRole("switch", { name: "Infinite analysis" }));
    expect(FakeEngine.latest().searchOptions.at(-1)).toEqual({ infinite: true });

    play();
    expect(FakeEngine.latest().searchOptions.at(-1)).toEqual({ depth: 20, movetime: 0 });
  });

  it("asks the engine for Threads and Hash as Play with Engine does — a multi-thread engine's threads adjustable here too (CTA-160)", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    localStorage.setItem("chessapp.engine", "stockfish-19-lite-multi");
    mountEngineOn();
    openTab("engine");

    expect(FakeEngine.latest().descriptor?.id).toBe("stockfish-19-lite-multi");
    expect(FakeEngine.latest().setOptions).toEqual(
      expect.arrayContaining([["MultiPV", 3], ["Threads", 1], ["Hash", 16]]),
    );
    expect(screen.getByRole("slider", { name: "Threads" })).toBeEnabled();
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toBeEnabled();
    vi.unstubAllGlobals();
  });

  it("pauses when the board is flipped — the engine's side changed under it (CTA-74)", () => {
    mountEngineOn();
    play();
    act(() => {
      screen.getByTestId("board-control-flip").click();
    });
    expect(pressed()).toBe("false");
    expect(boardOptions().position).toBe(START);
  });

  it("pauses when the reader steps back, and they go on by hand until Play again", () => {
    mountEngineOn();
    play();
    drag("e2", "e4");
    engineSearches("e7e5 g1f3");
    expect(boardOptions().position).toBe(AFTER_E4_E5);

    act(() => {
      screen.getByTestId("board-control-previous").click();
    });
    expect(pressed()).toBe("false");
    // A different reply by hand; the engine does not answer it.
    drag("c7", "c5");
    engineSearches("g1f3 b8c6");
    expect(boardOptions().position).toBe(
      "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    );

    // Play again: the reader's turn (White), so it waits for their move.
    play();
    drag("g1", "f3");
    engineSearches("b8c6 f1b5");
    expect(boardOptions().position).toBe(
      "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    );
  });

  it("plays at once at the engine's turn from a search already finished", () => {
    mountEngineOn();
    drag("e2", "e4");
    engineSearches("e7e5 g1f3");
    expect(boardOptions().position).toBe(AFTER_E4);
    play();
    expect(boardOptions().position).toBe(AFTER_E4_E5);
  });

  it("stops when the engine is switched off", () => {
    mountEngineOn();
    play();
    expect(pressed()).toBe("true");
    fireEvent.click(screen.getByTestId("analysis-setting-engine"));
    expect(pressed()).toBe("false");
  });
});

describe("Play — the engine's thinking, shown", () => {
  it("says the engine is thinking, with the depth, until its move lands; then it is the reader's", () => {
    mountEngineOn();
    expect(screen.queryByTestId("analysis-play-status")).toBeNull();
    act(() => {
      screen.getByTestId("board-control-flip").click();
    });
    fireEvent.click(screen.getByTestId("analysis-play"));

    // White to move and the engine is White: it is thinking.
    expect(screen.getByTestId("analysis-play-status")).toHaveAttribute("data-status", "thinking");
    expect(screen.getByTestId("analysis-play-status")).toHaveTextContent("Engine is thinking");
    expect(screen.getByTestId("analysis-play-spinner")).toBeInTheDocument();

    // A streamed line: the depth reached shows as it climbs.
    const engine = FakeEngine.latest();
    act(() => {
      engine.say({
        fen: engine.lastSearch,
        uciMessage: "info",
        depth: 14,
        multipv: 1,
        positionEvaluation: "20",
        pv: "e2e4 e7e5",
      });
    });
    expect(screen.getByTestId("analysis-play-depth")).toHaveTextContent("depth 14");

    act(() => {
      engine.say({ fen: engine.lastSearch, uciMessage: "bestmove", bestMove: "e2e4" });
    });
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(screen.getByTestId("analysis-play-status")).toHaveAttribute("data-status", "your-move");
    expect(screen.queryByTestId("analysis-play-spinner")).toBeNull();
  });

  it("shows nothing once paused", () => {
    mountEngineOn();
    fireEvent.click(screen.getByTestId("analysis-play"));
    expect(screen.getByTestId("analysis-play-status")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-play"));
    expect(screen.queryByTestId("analysis-play-status")).toBeNull();
  });
});

describe("a fresh board starts with the engine off (CTA-148)", () => {
  it("has the switch off, no search running, and Play disabled until the reader switches it on", () => {
    mount();
    const engineSwitch = () => within(screen.getByTestId("analysis-setting-engine")).getByRole("switch", { name: i18n.t("analysis.engineSwitch") });
    expect(engineSwitch()).not.toBeChecked();
    expect(FakeEngine.instances.flatMap((engine) => engine.searches)).toEqual([]);
    expect(screen.getByTestId("analysis-play")).toBeDisabled();

    fireEvent.click(screen.getByTestId("analysis-setting-engine"));
    expect(engineSwitch()).toBeChecked();
    expect(FakeEngine.latest().searches).toEqual([START]);
  });
});

describe("the header (CTA-148)", () => {
  it("has Save, Play and the engine switch — and no previous / next, no link to the list", async () => {
    await stored("a1", "1. e4 *", ["e4"], { name: "One" });
    mount("/tools/analysis?analysis=a1");
    expect(screen.getByTestId("analysis-save")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-play")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-settings")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-setting-engine")).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-saved-list")).toBeNull();
    expect(screen.queryByTestId("analysis-sibling-previous")).toBeNull();
    expect(screen.queryByTestId("analysis-sibling-next")).toBeNull();
  });

  it("shows the opening as one line of link text — full name and ECO on hover, a click opens the explorer in a new tab", async () => {
    book.entries = { [AFTER_E4]: { eco: "B00", name: "King's Pawn Game", moves: "1. e4" } };
    mount(`/tools/analysis?fen=${encodeURIComponent(AFTER_E4)}`);
    const link = await screen.findByTestId("analysis-current-opening-eco");
    expect(link).toHaveTextContent("King's Pawn Game");
    expect(link).toHaveAttribute("title", "B00 · King's Pawn Game");
    expect(link).toHaveAttribute("href", expect.stringContaining("/openings?fen="));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAccessibleName(/King's Pawn Game.*B00.*new tab/);
  });

  it("shows no opening at all where the position has none", async () => {
    mount();
    // The book is read, and the start position is no opening.
    await waitFor(() => expect(screen.queryByText(i18n.t("openings.current.loading"))).toBeNull());
    expect(screen.queryByTestId("analysis-current-opening")).toBeNull();
    expect(screen.queryByText(i18n.t("openings.current.unknown"))).toBeNull();
  });
});

describe("the players plated on the board (CTA-148)", () => {
  const GAME = '[White "Amy"]\n[Black "Bob"]\n[WhiteElo "1900"]\n[Result "1-0"]\n\n1. e4 e5 1-0';

  it("plates a saved game's players with their result and Elo, as the Library's board does", async () => {
    await stored("g1", GAME);
    mount("/tools/analysis?analysis=g1");
    expect(screen.getByTestId("analysis-captured-white-plate-name")).toHaveTextContent("Amy");
    expect(screen.getByTestId("analysis-captured-white-plate-elo")).toHaveTextContent("1900");
    expect(screen.getByTestId("analysis-captured-white-plate-result")).toHaveTextContent("1");
    expect(screen.getByTestId("analysis-captured-black-plate-name")).toHaveTextContent("Bob");
    expect(screen.getByTestId("analysis-captured-black-plate-result")).toHaveTextContent("0");
    expect(screen.queryByTestId("analysis-captured-black-plate-elo")).toBeNull();
  });

  it("follows the orientation — the player at the top changes with the flip", async () => {
    await stored("g1", GAME);
    mount("/tools/analysis?analysis=g1");
    const top = () => screen.getAllByTestId(/analysis-captured-(white|black)-plate$/).map((plate) => plate.getAttribute("data-testid"));
    const before = top();
    act(() => {
      screen.getByTestId("board-control-flip").click();
    });
    expect(top()).toEqual([...before].reverse());
  });

  it("plates no one for a position", () => {
    mount();
    expect(screen.queryByTestId("analysis-captured-white-plate-name")).toBeNull();
    expect(screen.queryByTestId("analysis-captured-black-plate-name")).toBeNull();
  });

  it("plates no one for an analysis of its own with no names", async () => {
    await stored("plain", "1. e4 *", ["e4"]);
    mount("/tools/analysis?analysis=plain");
    expect(screen.queryByTestId("analysis-captured-white-plate-name")).toBeNull();
    expect(screen.queryByTestId("analysis-captured-black-plate-name")).toBeNull();
  });
});

describe("the Arrows tab (CTA-98)", () => {
  const radio = (kind: "width" | "palette", id: string) =>
    screen.getByTestId(`analysis-arrows-${kind}-${id}`);

  it("holds the next-move arrows switch, which the Engine tab no longer does", async () => {
    await stored("a1", "1. e4 e5 (1... c5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    openTab("engine");
    expect(screen.queryByTestId("analysis-arrows")).toBeNull();

    openTab("arrows");
    expect(boardOptions().arrows).toHaveLength(2);
    fireEvent.click(within(screen.getByTestId("analysis-arrows")).getByRole("switch"));
    expect(boardOptions().arrows).toEqual([]);
  });

  it("offers a tag only while some move in the tree carries it", async () => {
    await stored("a1", "1. e4 e5 (1... c5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    openTab("arrows");
    expect(radio("width", "none")).toBeEnabled();
    expect(radio("width", "lines")).toBeEnabled();
    expect(radio("width", "eval")).toBeDisabled();
    expect(radio("width", "games")).toBeDisabled();
    expect(radio("width", "prc")).toBeDisabled();

    // A comment carrying a count, written through the move menu: offered at once.
    fireEvent.contextMenu(screen.getByTestId("move-ply-2"), { clientX: 40, clientY: 60 });
    fireEvent.click(screen.getByTestId("move-menu-comment"));
    fireEvent.change(screen.getByTestId("comment-dialog-text"), {
      target: { value: "Most played. games:120" },
    });
    fireEvent.click(screen.getByTestId("comment-dialog-save"));
    expect(radio("width", "games")).toBeEnabled();
    expect(radio("width", "eval")).toBeDisabled();
  });

  it("sizes the arrows by the chosen tag, over the board, the untagged move gray", async () => {
    await stored("a1", "1. e4 e5 {[%eval 0.3]} (1... c5 {[%eval 0.4]}) (1... a5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    openTab("arrows");
    expect(screen.queryByTestId("analysis-width-arrows-overlay")).toBeNull();

    fireEvent.click(radio("width", "eval"));
    expect(boardOptions().arrows).toEqual([]);
    const overlay = screen.getByTestId("analysis-width-arrows-overlay");
    expect(overlay.querySelectorAll("path")).toHaveLength(3);
    expect(overlay.querySelector('path[data-to="a5"]')).toHaveAttribute(
      "fill",
      UNTAGGED_NEXT_MOVE_ARROW_COLOR,
    );
  });

  it("recolours every arrow by the palette", async () => {
    await stored("a1", "1. e4 e5 (1... c5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    openTab("arrows");
    fireEvent.click(radio("palette", "colorblind"));
    const { colorblind } = NEXT_MOVE_ARROW_PALETTES;
    expect(boardOptions().arrows?.map((arrow) => arrow.color)).toEqual([
      colorblind.mainline,
      colorblind.sideline,
    ]);
  });

  it("opens as the record says, keeping a tag the tree lacks but drawing as None", async () => {
    await stored("a1", "1. e4 e5 (1... c5) *", ["e4"], {
      arrowWidthSource: "prc",
      arrowPalette: "lichess",
    });
    mount("/tools/analysis?analysis=a1");
    openTab("arrows");
    expect(radio("width", "prc")).toBeChecked();
    expect(radio("width", "prc")).toBeDisabled();
    expect(screen.getByTestId("analysis-arrows-width-drawn-as-none")).toBeInTheDocument();
    expect(radio("palette", "lichess")).toBeChecked();
    // Drawn as None: the library arrows, in the record's palette.
    expect(screen.queryByTestId("analysis-width-arrows-overlay")).toBeNull();
    expect(boardOptions().arrows?.[0].color).toBe(NEXT_MOVE_ARROW_PALETTES.lichess.mainline);

    // The record keeps the choice across an Update.
    drag("g8", "f6");
    fireEvent.click(screen.getByTestId("analysis-save"));
    fireEvent.click(screen.getByTestId("analysis-changes-update"));
    await waitFor(() => expect(findSavedAnalysis("a1")?.path).toEqual(["e4", "Nf6"]));
    expect(findSavedAnalysis("a1")).toMatchObject({ arrowWidthSource: "prc", arrowPalette: "lichess" });
  });

  it("keeps a new board's choices on its first save", async () => {
    mount();
    drag("e2", "e4");
    openTab("arrows");
    fireEvent.click(radio("width", "lines"));
    fireEvent.click(radio("palette", "colorblind"));
    fireEvent.click(screen.getByTestId("analysis-save"));
    fireEvent.change(screen.getByTestId("analysis-save-name"), { target: { value: "Mine" } });
    fireEvent.click(screen.getByTestId("analysis-save-confirm"));
    await waitFor(() => expect(listed()).toHaveLength(1));
    expect(listed()[0]).toMatchObject({
      showArrows: true,
      arrowWidthSource: "lines",
      arrowPalette: "colorblind",
    });
  });
});

describe("the workspace an analysis opened from the saved list has (CTA-145)", () => {
  const AFTER_D4 = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1";
  const AFTER_C4 = "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1";

  /** The board in the shell's own places: the right panel, and the board's left column (or its drawer, `compact`). */
  const BackButton = () => {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>history back</button>;
  };
  const mountIn = (entry: string, compact = false) =>
    render(
      <AppThemeWithLang>
        <MemoryRouter initialEntries={[entry]}>
          <RightPanelProvider>
            <BoardLeftPanelProvider>
              <Routes>
                <Route path="/tools/analysis" element={<AnalysisBoard />} />
                <Route path="*" element={<div data-testid="elsewhere" />} />
              </Routes>
              <Where />
              <BackButton />
              <BoardLeftPanelOutlet compact={compact} />
              <RightPanelOutlet />
            </BoardLeftPanelProvider>
          </RightPanelProvider>
        </MemoryRouter>
      </AppThemeWithLang>,
    );

  /**
   * A folder of three tutorial positions, Lesson 3 the newest, with a
   * sub-folder holding one more — and one analysis Unfiled.
   */
  const tutorial = async () => {
    const folder = (await createAnalysisFolder("Tutorial", null))!;
    const sub = (await createAnalysisFolder("Endings", folder.id))!;
    const filed = { folderId: folder.id };
    await stored("a1", "1. e4 *", ["e4"], { ...filed, name: "Lesson 1", updatedAt: "2026-01-01T00:00:00.000Z" });
    await stored("a2", "1. d4 *", ["d4"], { ...filed, name: "Lesson 2", updatedAt: "2026-01-02T00:00:00.000Z" });
    await stored("a3", "1. c4 *", ["c4"], { ...filed, name: "Lesson 3", updatedAt: "2026-01-03T00:00:00.000Z" });
    await stored("s1", "1. Nf3 *", ["Nf3"], { folderId: sub.id, name: "Rook ending", updatedAt: "2026-01-04T00:00:00.000Z" });
    await stored("loose", "1. g3 *", [], { name: "Loose" });
    return { folder, sub };
  };
  const tree = () => screen.getByRole("tree", { name: "Tutorial" });
  /** The rows of the tree, level by level: its names, in order. */
  const rowNames = () => within(tree()).getAllByRole("treeitem").map((row) => row.textContent);
  const openFolder = (id: string) => fireEvent.click(screen.getByTestId(`analysis-folder-view-tree-${id}`));

  it("opens the list's tree beside the board, rooted at the folder it was opened from, the open analysis current", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    expect(screen.getByRole("navigation", { name: "Tutorial" })).toBeInTheDocument();
    // The root's contents: the sub-folder (with its count) first, then the analyses, newest first. Nothing outside it.
    expect(rowNames()).toEqual(["Endings1", "Lesson 3", "Lesson 2", "Lesson 1"]);
    expect(within(tree()).getByRole("treeitem", { current: "page" })).toHaveTextContent("Lesson 2");
    expect(screen.queryByText("Loose")).toBeNull();
    // The board is the analysis, as it always was.
    expect(boardOptions().position).toBe(AFTER_D4);
    await expectNoAxeViolations(screen.getByRole("navigation", { name: "Tutorial" }));
  });

  it("opens the chain to the analysis in a sub-folder", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=s1&folder=${folder.id}`);
    expect(screen.getByRole("treeitem", { name: /Endings/ })).toHaveAttribute("aria-expanded", "true");
    expect(within(tree()).getByRole("treeitem", { current: "page" })).toHaveTextContent("Rook ending");
  });

  it("is rooted at the top level for an empty ?folder= — the Unfiled analyses are there", async () => {
    await tutorial();
    mountIn("/tools/analysis?analysis=loose&folder=");
    const all = screen.getByRole("tree", { name: "Saved analyses" });
    expect(within(all).getByRole("treeitem", { current: "page" })).toHaveTextContent("Loose");
    expect(within(all).getByRole("treeitem", { name: /Tutorial/ })).toBeInTheDocument();
  });

  it("is the plain board without the list's context", async () => {
    await tutorial();
    mountIn("/tools/analysis?analysis=a2");
    expect(screen.queryByRole("tree")).toBeNull();
    expect(screen.queryByTestId("analysis-sibling-previous")).toBeNull();
    expect(screen.queryByTestId("layout-board-left-panel")).toBeNull();
  });

  it("follows the sort the reader had in the list", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}&sort=name&dir=desc`);
    // The folders first, then the analyses by name, Z to A.
    expect(rowNames()).toEqual(["Endings1", "Lesson 3", "Lesson 2", "Lesson 1"]);
    expect(screen.getByTestId("analysis-sibling-next")).toHaveAttribute("href", expect.stringContaining("analysis=a1"));
  });

  it("opens another analysis on a click, its board and name, the root and the sort kept in the URL", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}&sort=name`);
    fireEvent.click(within(tree()).getByRole("treeitem", { name: "Lesson 3" }));

    await waitFor(() => expect(boardOptions().position).toBe(AFTER_C4));
    expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 3");
    expect(where()).toContain("analysis=a3");
    expect(where()).toContain(`folder=${folder.id}`);
    expect(where()).toContain("sort=name");
    expect(within(tree()).getByRole("treeitem", { current: "page" })).toHaveTextContent("Lesson 3");
  });

  it("keeps the root where it was opened from when the reader opens an analysis in a sub-folder", async () => {
    const { folder, sub } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    openFolder(sub.id);
    fireEvent.click(screen.getByRole("treeitem", { name: "Rook ending" }));
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Rook ending"));
    expect(where()).toContain(`folder=${folder.id}`);
    expect(screen.getByRole("tree", { name: "Tutorial" })).toBeInTheDocument();
  });

  it("keeps the folders the reader opened open as it steps to another analysis", async () => {
    const { folder, sub } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    openFolder(sub.id);
    expect(screen.getByRole("treeitem", { name: /Endings/ })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(within(tree()).getByRole("treeitem", { name: "Lesson 3" }));
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 3"));
    expect(screen.getByRole("treeitem", { name: /Endings/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("goes back to the analysis before on the browser's Back", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    fireEvent.click(within(tree()).getByRole("treeitem", { name: "Lesson 3" }));
    await waitFor(() => expect(boardOptions().position).toBe(AFTER_C4));
    fireEvent.click(screen.getByRole("button", { name: "history back" }));
    await waitFor(() => expect(boardOptions().position).toBe(AFTER_D4));
    expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 2");
  });

  it("steps through the open analysis' folder with previous and next, disabled at the ends", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a3&folder=${folder.id}`);
    const next = () => screen.getByRole("link", { name: i18n.t("analysis.folderView.next") });
    const previous = () => screen.getByRole("link", { name: i18n.t("analysis.folderView.previous") });

    // Newest first: Lesson 3 is the first, so nothing is before it.
    expect(screen.getByTestId("analysis-sibling-previous")).toBeDisabled();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 2"));
    expect(boardOptions().position).toBe(AFTER_D4);
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 1"));
    expect(screen.getByTestId("analysis-sibling-next")).toBeDisabled();
    fireEvent.click(previous());
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 2"));
    expect(where()).toContain("analysis=a2");
    expect(where()).toContain(`folder=${folder.id}`);
  });

  it("closes into the saved list, on the folder and in the order the board was opened from", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}&sort=name&dir=desc`);
    expect(screen.getByRole("link", { name: i18n.t("analysis.folderView.close") })).toHaveAttribute(
      "href",
      `/tools/analysis/saved?folder=${folder.id}&sort=name&dir=desc`,
    );
    fireEvent.click(screen.getByRole("link", { name: i18n.t("analysis.folderView.close") }));
    await waitFor(() => expect(where()).toBe(`/tools/analysis/saved?folder=${folder.id}&sort=name&dir=desc`));
    expect(screen.getByTestId("elsewhere")).toBeInTheDocument();
  });

  it("folds to a rail and opens again, the board and its URL as they are — and keeps it folded as it steps on", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    const before = where();
    fireEvent.click(screen.getByRole("button", { name: i18n.t("analysis.folderView.collapse") }));
    expect(screen.queryByRole("tree")).toBeNull();
    expect(screen.getByRole("button", { name: i18n.t("analysis.folderView.expand") })).toBeInTheDocument();
    // Close stays on the rail, and the board is as it was.
    expect(screen.getByRole("link", { name: i18n.t("analysis.folderView.close") })).toBeInTheDocument();
    expect(boardOptions().position).toBe(AFTER_D4);
    expect(where()).toBe(before);

    fireEvent.click(screen.getByTestId("analysis-sibling-next"));
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 1"));
    expect(screen.queryByRole("tree")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: i18n.t("analysis.folderView.expand") }));
    expect(within(tree()).getByRole("treeitem", { current: "page" })).toHaveTextContent("Lesson 1");
  });

  it("does not open another analysis over unsaved changes — Save / Update / Discard come first — and writes nothing", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    drag("e7", "e5");

    expect(screen.getByTestId("analysis-folder-view-locked")).toHaveTextContent(i18n.t("analysis.folderView.locked"));
    expect(screen.getByRole("treeitem", { name: "Lesson 3" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("treeitem", { name: "Lesson 3" })).not.toHaveAttribute("href");
    expect(screen.getByTestId("analysis-sibling-previous")).toBeDisabled();
    expect(screen.getByTestId("analysis-sibling-next")).toBeDisabled();
    // Both say why, by name.
    expect(screen.getAllByRole("button", { name: i18n.t("analysis.folderView.locked") })).toHaveLength(2);
    expect(findSavedAnalysis("a2")?.pgn).not.toContain("e5");

    fireEvent.click(screen.getByTestId("analysis-save"));
    fireEvent.click(within(screen.getByTestId("analysis-changes")).getByTestId("analysis-changes-discard"));
    expect(screen.queryByTestId("analysis-folder-view-locked")).toBeNull();
    expect(screen.getByRole("treeitem", { name: "Lesson 3" })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByTestId("analysis-sibling-next")).not.toBeDisabled();
    expect(findSavedAnalysis("a2")?.pgn).not.toContain("e5");
  });

  it("goes on in a saved copy with the same workspace — the copy listed and current — not as a new arrival", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}&sort=name`);
    drag("e7", "e5");
    fireEvent.click(screen.getByTestId("analysis-save"));
    fireEvent.click(within(screen.getByTestId("analysis-changes")).getByTestId("analysis-changes-copy"));

    await waitFor(() => expect(listed()).toHaveLength(6));
    const copy = listed().find((row) => row.name === "Lesson 2 (copy)")!;
    await waitFor(() => expect(where()).toContain(`analysis=${copy.id}`));
    expect(where()).toContain(`folder=${folder.id}`);
    expect(where()).toContain("sort=name");
    await waitFor(() => expect(within(tree()).getByRole("treeitem", { current: "page" })).toHaveTextContent("Lesson 2 (copy)"));
    // The session went on: the move played is still on the board.
    expect(boardOptions().position).toContain("4p3");
  });

  it("ends when a new board is loaded: no tree, no previous / next", async () => {
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    openTab("engine");
    fireEvent.click(screen.getByTestId("analysis-clear"));
    await waitFor(() => expect(screen.queryByRole("tree")).toBeNull());
    expect(screen.queryByTestId("analysis-sibling-next")).toBeNull();
  });

  it("narrows the tree by the words typed, opening the folders above the matches — and keeps them as it steps on", async () => {
    const user = userEvent.setup();
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    const box = screen.getByRole("searchbox", { name: i18n.t("savedAnalyses.table.filter") });
    await user.type(box, "rook");

    // Only what the words keep: the sub-folder, opened, and its analysis.
    await waitFor(() => expect(rowNames()).toEqual(["Endings1", "Rook ending"]));
    expect(screen.getByRole("treeitem", { name: /Endings/ })).toHaveAttribute("aria-expanded", "true");
    expect(findSavedAnalysis("a2")?.pgn).not.toContain("rook");

    // Stepping to another analysis is a new board: the words stay.
    fireEvent.click(screen.getByTestId("analysis-sibling-next"));
    await waitFor(() => expect(screen.getByTestId("analysis-name")).toHaveTextContent("Lesson 1"));
    expect(screen.getByRole("searchbox", { name: i18n.t("savedAnalyses.table.filter") })).toHaveValue("rook");
    expect(rowNames()).toEqual(["Endings1", "Rook ending"]);

    await user.clear(screen.getByRole("searchbox", { name: i18n.t("savedAnalyses.table.filter") }));
    await waitFor(() => expect(rowNames()).toContain("Lesson 3"));
  });

  it("says when the words keep nothing", async () => {
    const user = userEvent.setup();
    const { folder } = await tutorial();
    mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`);
    await user.type(screen.getByRole("searchbox", { name: i18n.t("savedAnalyses.table.filter") }), "zugzwang");
    expect(await screen.findByTestId("analysis-folder-view-no-match")).toHaveTextContent(i18n.t("savedAnalyses.table.noMatch"));
    // The board is as it was.
    expect(boardOptions().position).toBe(AFTER_D4);
  });

  it("is a drawer under the shell's breakpoint — closed to begin with, opened from the board, closed on Escape, no fold", async () => {
    const wide = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: /max-width/.test(query),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const user = userEvent.setup();
      const { folder } = await tutorial();
      mountIn(`/tools/analysis?analysis=a2&folder=${folder.id}`, true);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByTestId("layout-board-left-panel")).toBeNull();

      await user.click(screen.getByRole("button", { name: i18n.t("analysis.folderView.toggle") }));
      const sheet = await screen.findByRole("dialog", { name: i18n.t("analysis.folderView.drawer") });
      expect(within(sheet).getByRole("tree", { name: "Tutorial" })).toBeInTheDocument();
      expect(within(sheet).queryByRole("button", { name: i18n.t("analysis.folderView.collapse") })).toBeNull();
      await expectNoAxeViolations(sheet);

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(boardOptions().position).toBe(AFTER_D4);
    } finally {
      window.matchMedia = wide;
    }
  });
});

describe("the Analysis Board — accessible (CTA-113)", () => {
  it.each(["moves", "map", "load", "export", "engine", "arrows"])("passes axe on its %s tab", async (tab) => {
    mount();
    drag("e2", "e4");
    fireEvent.click(screen.getByTestId(`analysis-panel-tab-${tab}`));
    await expectNoAxeViolations(screen.getByTestId("analysis-panel"));
  });

  it("walks its tabs with the arrow keys, each tab naming its panel's heading", async () => {
    const user = userEvent.setup();
    mount();
    screen.getByRole("tab", { name: "Moves" }).focus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Map");
    expect(screen.getByRole("heading", { level: 2, name: "Map" })).toBeInTheDocument();
  });

  it("names its header's actions and saves a new board from the keyboard", async () => {
    const user = userEvent.setup();
    mount();
    drag("e2", "e4");
    const save = screen.getByTestId("analysis-save");
    expect(save).not.toHaveAttribute("aria-pressed");
    save.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: i18n.t("analysis.save.title") })).toBeInTheDocument();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(listed()).toHaveLength(1));
  });
});

describe("the PGN's shapes on the board (CTA-143)", () => {
  /** A right-button gesture, as the board reports it, from one square to another. */
  const rightDrag = (from: string, to: string, keys: { shiftKey?: boolean; altKey?: boolean } = {}) => {
    const event = { button: 2, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...keys };
    act(() => boardOptions().onSquareMouseDown!({ square: from, piece: null }, event));
    act(() => boardOptions().onSquareMouseUp!({ square: to, piece: null }, event));
  };

  it("draws the move's [%cal] arrows with the next-move arrows, and its [%csl] circles", async () => {
    await stored("a1", "1. e4 {Sharp. [%cal Rd7d5][%csl Ye5]} e5 (1... c5) *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    expect(boardOptions().arrows).toEqual([
      expect.objectContaining({ startSquare: "e7", endSquare: "e5" }),
      expect.objectContaining({ startSquare: "c7", endSquare: "c5" }),
      { startSquare: "d7", endSquare: "d5", color: "#882020" },
    ]);
    const ring = screen.getByTestId("analysis-shape-circles").querySelector("circle");
    expect(ring).toHaveAttribute("data-square", "e5");
    // The library's own right-drag arrows are off: the board's shapes are the comment's.
    expect(boardOptions().allowDrawingArrows).toBe(false);
  });

  it("writes a drawn arrow and circle into the move's comment, a change to keep, and out in the PGN", async () => {
    await stored("a1", "1. e4 {Sharp.} e5 *", ["e4"]);
    mount("/tools/analysis?analysis=a1");
    expect(screen.getByTestId("analysis-save")).toBeDisabled();

    rightDrag("g1", "f3", { altKey: true });
    rightDrag("d4", "d4");
    expect(boardOptions().arrows).toContainEqual({ startSquare: "g1", endSquare: "f3", color: "#003088" });
    expect(screen.getByTestId("analysis-shape-circles").querySelector("circle")).toHaveAttribute("data-square", "d4");
    // The prose is all the comment block reads.
    expect(screen.getByTestId("analysis-annotations")).toHaveTextContent("Sharp.");
    expect(screen.getByTestId("analysis-annotations")).not.toHaveTextContent(/cal|csl/);

    openTab("export");
    expect((screen.getByTestId("analysis-export-pgn") as HTMLTextAreaElement).value).toContain(
      "1. e4 { Sharp. [%cal Bg1f3] [%csl Gd4] } 1... e5",
    );

    // Drawn again, the arrow comes off.
    rightDrag("g1", "f3", { altKey: true });
    expect(boardOptions().arrows).not.toContainEqual(expect.objectContaining({ startSquare: "g1" }));

    // A change like any other edit: Update keeps it with the record.
    fireEvent.click(screen.getByTestId("analysis-save"));
    fireEvent.click(within(screen.getByTestId("analysis-changes")).getByTestId("analysis-changes-update"));
    await waitFor(() => expect(findSavedAnalysis("a1")?.pgn).toContain("{ Sharp. [%csl Gd4] }"));
  });
});
