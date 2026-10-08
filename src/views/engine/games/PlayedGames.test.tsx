import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";

import i18n from "../../../i18n";
import { approximateElo, DEFAULT_ENGINE_SETTINGS } from "../../../lib/engineSettings";
import { parsePgnTree } from "../../../lib/pgn";
import { playedGamesSnapshot, savePlayedGame } from "../../../lib/playedGameStore";
import { playedGameOf } from "../../../lib/playedGames";
import { MASK_PRESETS } from "../../../lib/pieceMask";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";
import type { OpeningBook } from "../../../lib/openings";
import { FakeEngine } from "../../board/boardTestHarness";
import { whenPlayed } from "../../../blocks/tables";
import PlayedGames from "./PlayedGames";

/*
  The engine's Lobby (CTA-82; the Saved games list of CTA-74): the games flat
  and newest first, each row's Continue, Analysis and asked-first delete, the
  colour and opening filters — and the new-game form in the right panel.
*/

// The form handshakes an engine (never searching) for the options it declares.
vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

/*
  The Board editor tab's board (CTA-83): the spare-piece trio, with the
  provider keeping the options it was handed — how a test drags a piece.
*/
const editorBoard = vi.hoisted(() => ({ options: null as Record<string, unknown> | null }));
vi.mock("react-chessboard", () => ({
  ChessboardProvider: ({
    options,
    children,
  }: {
    options: Record<string, unknown>;
    children: React.ReactNode;
  }) => {
    editorBoard.options = options;
    return <div>{children}</div>;
  },
  Chessboard: () => (
    <div data-testid="board" data-position={String(editorBoard.options?.position)} />
  ),
  SparePiece: ({ pieceType }: { pieceType: string }) => <div data-testid={`spare-${pieceType}`} />,
}));
const editorDrag = (pieceType: string, from: string, to: string | null) =>
  act(() => {
    (editorBoard.options!.onPieceDrop as (args: unknown) => boolean)({
      piece: { pieceType, isSparePiece: false, position: from },
      sourceSquare: from,
      targetSquare: to,
    });
  });

/*
  A two-entry book, handed over when the test says so — so "until the book
  lands" is a state a test can stand in.
*/
const book = vi.hoisted(() => ({
  resolve: (() => {}) as (landed: OpeningBook) => void,
  promise: Promise.resolve({} as OpeningBook),
}));
vi.mock("../../../lib/openings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/openings")>()),
  loadOpeningBook: () => book.promise,
}));
const OPENINGS: OpeningBook = {
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": {
    eco: "C20",
    name: "King's Pawn Game",
    moves: "1. e4 e5",
  },
  "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2": {
    eco: "D00",
    name: "Queen's Pawn Game",
    moves: "1. d4 d5",
  },
};
const landBook = async () => {
  await act(async () => {
    book.resolve(OPENINGS);
    await book.promise;
  });
};

function Where() {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
}

const mount = (entry = "/engine/games") =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <PlayedGames />
          <RightPanelOutlet />
          <Where />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const listed = () =>
  screen.queryAllByTestId(/^played-games-row-/).map((row) => row.dataset.testid?.slice(17));

/**
 * One readable row's data cells, in the table's column order — after the
 * pick checkbox (the row's actions have a column of their own at its end
 * since CTA-109).
 */
const cells = (id: string) =>
  within(screen.getByTestId(`played-games-row-${id}`)).getAllByRole("cell").slice(1);

/** Tick a row's pick checkbox. */
const tick = (id: string) =>
  fireEvent.click(within(screen.getByTestId(`played-games-pick-${id}`)).getByRole("checkbox"));

const store = (
  id: string,
  pgn: string,
  playAs: "white" | "black" = "white",
  when = "2026-09-20T10:00:00Z",
) =>
  savePlayedGame(
    playedGameOf(id, parsePgnTree(pgn), [], { ...DEFAULT_ENGINE_SETTINGS, playAs, elo: 1500 }, undefined, new Date(when)),
  );

beforeEach(async () => {
  FakeEngine.reset();
  book.promise = new Promise((resolve) => {
    book.resolve = resolve;
  });
  await i18n.changeLanguage("en");
});

describe("Lobby — the list", () => {
  it("says it is reading until the store's first read lands, then that there is nothing yet", async () => {
    mount();
    expect(screen.getByTestId("played-games-loading")).toBeInTheDocument();
    expect(await screen.findByTestId("played-games-empty")).toBeInTheDocument();
    expect(screen.getByTestId("played-games-count")).toHaveTextContent("Games: 0");
  });

  it("lists the games newest first, the pairing White-first in its columns", async () => {
    await store("a", "1. e4 (1. d4) 1... e5 *", "white", "2026-09-01T10:00:00Z");
    await store("b", "1. d4 d5 *", "black", "2026-09-20T10:00:00Z");
    mount();

    expect(listed()).toEqual(["b", "a"]);
    const a = cells("a");
    expect(a[0]).toHaveTextContent("Human");
    expect(a[1]).toHaveTextContent("Unknown");
    expect(a[2]).toHaveTextContent("Stockfish 19 Lite Elo 1500");
    expect(a[3]).toHaveTextContent("1500");
    const b = cells("b");
    expect(b[0]).toHaveTextContent("Stockfish 19 Lite Elo 1500");
    expect(b[1]).toHaveTextContent("1500");
    expect(b[2]).toHaveTextContent("Human");
    expect(b[3]).toHaveTextContent("Unknown");
  });

  it("names each engine by its build, with the Elo it was set to where it took one (CTA-153)", async () => {
    const other = (id: string, strength: "skill" | "elo", when: string) =>
      savePlayedGame(
        playedGameOf(
          id,
          parsePgnTree("1. e4 e5 *"),
          [],
          { ...DEFAULT_ENGINE_SETTINGS, skillLevel: 5, elo: 1750 },
          undefined,
          new Date(when),
          undefined,
          undefined,
          undefined,
          { id: "my-engine", name: "My Engine", version: "3", strength },
        ),
      );
    await other("elo", "elo", "2026-09-20T10:00:00Z");
    await other("skill", "skill", "2026-09-10T10:00:00Z");
    await store("legacy", "1. e4 e5 *", "white", "2026-09-01T10:00:00Z");
    mount();

    // An Elo-driven game: named by its Elo, and that Elo in the Elo column, not an estimate.
    expect(cells("elo")[2]).toHaveTextContent("My Engine Elo 1750");
    expect(cells("elo")[3]).toHaveTextContent("1750");
    // A Skill Level engine: named, with its level and the estimate.
    expect(cells("skill")[2]).toHaveTextContent("My Engine level 5");
    expect(cells("skill")[3]).toHaveTextContent(String(approximateElo(5)));
    // A record that names no engine is the default's.
    expect(cells("legacy")[2]).toHaveTextContent("Stockfish 19 Lite Elo 1500");
  });

  it("gives the moves with the side lines, the result and the date", async () => {
    await store("a", "1. e4 (1. d4) 1... e5 *", "white", "2026-09-01T10:00:00Z");
    await store("m", "1. f3 e5 2. g4 Qh4# 0-1", "white", "2026-09-02T10:00:00Z");
    mount();
    const a = cells("a");
    expect(a[6]).toHaveTextContent(/^1/);
    expect(a[6]).toHaveTextContent("1 side line");
    expect(a[4]).toHaveTextContent("*");
    // The table's one date format (CTA-109).
    expect(a[8]).toHaveTextContent("2026-09-01");
    expect(cells("m")[4]).toHaveTextContent("0-1");
    // The table mirrors under Hebrew; its notation and dates never do (the
    // `dir` attribute, not a CSS direction the RTL plugin would flip).
    expect(a[4]).toHaveAttribute("dir", "ltr");
    expect(a[8]).toHaveAttribute("dir", "ltr");
    expect(a[0]).toHaveAttribute("dir", "auto");
  });

  it("continues a game on Play with Engine, and hands it to the Analysis Board", async () => {
    await store("a", "1. e4 *");
    mount();
    // Icon-only links: the link is the icon, its name the label — naming its row (CTA-109).
    expect(screen.getByTestId("played-games-continue-a")).toHaveAccessibleName(
      `Continue the game Human – Stockfish 19 Lite Elo 1500 of ${whenPlayed("2026-09-20T10:00:00Z")}`,
    );
    expect(screen.getByTestId("played-games-continue-a")).toHaveAttribute(
      "href",
      "/engine/play?saved=a",
    );
    expect(screen.getByTestId("played-games-analysis-a")).toHaveAccessibleName(
      `Analyse the game Human – Stockfish 19 Lite Elo 1500 of ${whenPlayed("2026-09-20T10:00:00Z")}`,
    );
    expect(screen.getByTestId("played-games-analysis-a")).toHaveAttribute(
      "href",
      `/tools/analysis?game=${encodeURIComponent("play/games/a")}`,
    );
  });

  it("hides Continue on a game that has ended, and keeps it on one still on (CTA-90)", async () => {
    await store("live", "1. e4 *");
    // Mated: the final position decides the result; resigned: the record does.
    await store("mated", "1. f3 e5 2. g4 Qh4# 0-1");
    await savePlayedGame(
      playedGameOf("resigned", parsePgnTree("1. e4 e5 *"), [], DEFAULT_ENGINE_SETTINGS,
        undefined, undefined, undefined, "black"),
    );
    mount();

    expect(screen.getByTestId("played-games-continue-live")).toBeInTheDocument();
    expect(screen.queryByTestId("played-games-continue-mated")).not.toBeInTheDocument();
    expect(screen.queryByTestId("played-games-continue-resigned")).not.toBeInTheDocument();
    // Analysis and the pick stay on every row.
    expect(screen.getByTestId("played-games-analysis-mated")).toBeInTheDocument();
    expect(screen.getByTestId("played-games-analysis-resigned")).toBeInTheDocument();
    expect(screen.getByTestId("played-games-pick-resigned")).toBeInTheDocument();
    // The actions share one column (CTA-109): a game without Continue keeps
    // every other cell where it is — the rows are the same shape.
    expect(
      within(screen.getByTestId("played-games-row-live")).getAllByRole("cell"),
    ).toHaveLength(11);
    expect(
      within(screen.getByTestId("played-games-row-mated")).getAllByRole("cell"),
    ).toHaveLength(11);
  });

  it("deletes the ticked games only once asked", async () => {
    await store("a", "1. e4 *");
    await store("b", "1. d4 *");
    mount();
    // Nothing is ticked: there is no delete to press.
    expect(screen.queryByTestId("played-games-delete-picked")).not.toBeInTheDocument();

    tick("a");
    tick("b");
    expect(screen.getByTestId("played-games-delete-picked")).toHaveTextContent(
      "Delete picked (2)",
    );
    fireEvent.click(screen.getByTestId("played-games-delete-picked"));
    expect(screen.getByTestId("played-games-delete-dialog")).toHaveTextContent(
      "Delete 2 picked games?",
    );
    // Asking is not deleting.
    expect(playedGamesSnapshot()).toHaveLength(2);
    fireEvent.click(screen.getByTestId("played-games-delete-confirm"));
    expect(await screen.findByTestId("played-games-empty")).toBeInTheDocument();
    expect(playedGamesSnapshot()).toHaveLength(0);
  });
});

describe("Lobby — the table (CTA-100)", () => {
  /** Games whose lengths and dates differ, one a minute. */
  const seed = async (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const when = new Date(Date.parse("2026-09-01T10:00:00Z") + index * 60_000).toISOString();
      const pgn = index % 2 === 0 ? "1. e4 *" : "1. e4 e5 2. Nf3 Nc6 3. Bb5 *";
      await store(`g${String(index).padStart(2, "0")}`, pgn, "white", when);
    }
  };

  it("heads its columns in order, every one a sort header", async () => {
    await seed(1);
    mount();
    expect(
      within(screen.getByTestId("played-games-frame-table"))
        .getAllByRole("columnheader")
        .map((head) => head.textContent),
    ).toEqual([
      // The pick, the data columns, then the row actions' column (CTA-109).
      "",
      "White",
      "Elo",
      "Black",
      "Elo",
      "Result",
      "Opening",
      "Moves",
      "Masked",
      "Date",
      "",
    ]);
  });

  it("opens newest first; a click on a header sorts by it, and a second turns it", async () => {
    await store("short", "1. e4 *", "white", "2026-09-03T10:00:00Z");
    await store("long", "1. e4 e5 2. Nf3 Nc6 3. Bb5 *", "white", "2026-09-01T10:00:00Z");
    await store("mid", "1. d4 d5 *", "white", "2026-09-02T10:00:00Z");
    mount();
    // The default: the day each game was begun, newest first.
    expect(listed()).toEqual(["short", "mid", "long"]);

    // A new column opens its own way — the numbers high first. The ties (two
    // one-move games) break by date, following the direction.
    fireEvent.click(screen.getByTestId("played-games-sort-moves"));
    expect(listed()).toEqual(["long", "short", "mid"]);
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?sort=moves");

    fireEvent.click(screen.getByTestId("played-games-sort-moves"));
    expect(listed()).toEqual(["mid", "short", "long"]);
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?sort=moves&dir=asc");

    // The default direction is not written; the default column is not either.
    fireEvent.click(screen.getByTestId("played-games-sort-moves"));
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?sort=moves");
    fireEvent.click(screen.getByTestId("played-games-sort-date"));
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games");
    expect(listed()).toEqual(["short", "mid", "long"]);
  });

  it("pages the table, and a new filter or a new rows-per-page starts at the first page", async () => {
    await seed(52);
    mount();
    // 50 rows a default page holds (CTA-109's one page-size set), of 52.
    expect(screen.getAllByTestId(/^played-games-row-/)).toHaveLength(50);
    expect(screen.getByTestId("played-games-count")).toHaveTextContent("Games: 52");

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(screen.getAllByTestId(/^played-games-row-/)).toHaveLength(2);
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?page=1");

    fireEvent.mouseDown(within(screen.getByTestId("played-games-pager")).getByRole("combobox"));
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "25" }));
    expect(screen.getAllByTestId(/^played-games-row-/)).toHaveLength(25);
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?rows=25");

    // The filter starts the table over at its first page.
    fireEvent.click(screen.getByTestId("played-games-filter-color-white"));
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?rows=25&color=white");
    expect(listed()[0]).toBe("g51");
  });

  it("offers the one page-size set, 25 / 50 / 100 / 250, 50 by default (CTA-109)", async () => {
    await seed(1);
    mount();
    const pager = screen.getByTestId("played-games-pager");
    expect(within(pager).getByRole("combobox")).toHaveTextContent("50");
    fireEvent.mouseDown(within(pager).getByRole("combobox"));
    expect(
      within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["25", "50", "100", "250"]);
  });

  it("reads an older link's ?rows=10 as the default, and clamps its ?page= (CTA-109)", async () => {
    await seed(52);
    mount("/engine/games?rows=10&page=3");
    // Ten is no longer a page size: a page holds 50, and page 3 of two is the last.
    expect(within(screen.getByTestId("played-games-pager")).getByRole("combobox")).toHaveTextContent("50");
    expect(screen.getAllByTestId(/^played-games-row-/)).toHaveLength(2);
    expect(listed()).toEqual(["g01", "g00"]);
  });

  it("reads the sort, the rows and the page from the URL", async () => {
    await seed(27);
    const table = mount("/engine/games?sort=moves&dir=asc&rows=25&page=1");
    expect(screen.getAllByTestId(/^played-games-row-/)).toHaveLength(2);
    // Moves ascending: the one-move games first, so the page holds the last two.
    expect(listed()).toEqual(["g23", "g25"]);

    // A page past the end is clamped to the last one there is.
    table.unmount();
    mount("/engine/games?page=5");
    expect(screen.getAllByTestId(/^played-games-row-/)).toHaveLength(27);
  });

  it("selects all over the rows the table shows, and unticks without losing other picks", async () => {
    await seed(3);
    mount();

    // One row ticked of three: select-all is neither ticked nor plain.
    tick("g01");
    const all = within(screen.getByTestId("played-games-select-all")).getByRole("checkbox");
    expect(all).not.toBeChecked();
    expect(all).toHaveAttribute("data-indeterminate", "true");

    // Ticked: every row the table shows joins the picks.
    fireEvent.click(all);
    expect(screen.getByTestId("played-games-delete-picked")).toHaveTextContent(
      "Delete picked (3)",
    );
    expect(within(screen.getByTestId("played-games-pick-g00")).getByRole("checkbox")).toBeChecked();
    expect(within(screen.getByTestId("played-games-pick-g02")).getByRole("checkbox")).toBeChecked();
    expect(within(screen.getByTestId("played-games-select-all")).getByRole("checkbox")).toBeChecked();

    // Unticked: only the rows the table shows leave the picks.
    fireEvent.click(within(screen.getByTestId("played-games-select-all")).getByRole("checkbox"));
    expect(screen.queryByTestId("played-games-delete-picked")).not.toBeInTheDocument();
  });

  it("lists a record whose PGN will not parse, saying so, with only its pick", async () => {
    await savePlayedGame({
      id: "bad",
      pgn: "1. e4 e5 2. Qxd5 *",
      settings: DEFAULT_ENGINE_SETTINGS,
      path: [],
      savedAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    });
    mount();
    const row = screen.getByTestId("played-games-row-bad");
    // The pick, the note across the columns, and the actions' cell (empty:
    // nothing opens) — CTA-109's one actions column.
    expect(within(row).getAllByRole("cell")).toHaveLength(3);
    expect(row).toHaveTextContent("This game could not be read.");
    expect(within(row).getByTestId("played-games-pick-bad")).toBeInTheDocument();
    expect(within(row).queryByTestId("played-games-continue-bad")).not.toBeInTheDocument();
    expect(within(row).queryByTestId("played-games-analysis-bad")).not.toBeInTheDocument();
  });
});

describe("Lobby — a masked game (CTA-79)", () => {
  it("is marked Masked, continues on Masked Pieces and opens unmasked in Analysis", async () => {
    await store("plain", "1. e4 *");
    await savePlayedGame(
      playedGameOf(
        "m",
        parsePgnTree("1. Nf3 *"),
        [],
        DEFAULT_ENGINE_SETTINGS,
        undefined,
        undefined,
        undefined,
        undefined,
        { pieces: MASK_PRESETS.nonPawns, notation: true },
      ),
    );
    mount();

    expect(screen.getByTestId("played-games-masked-m")).toHaveTextContent("Masked");
    expect(screen.queryByTestId("played-games-masked-plain")).not.toBeInTheDocument();
    expect(screen.getByTestId("played-games-continue-m")).toHaveAttribute(
      "href",
      "/engine/masked?saved=m",
    );
    expect(screen.getByTestId("played-games-continue-plain")).toHaveAttribute(
      "href",
      "/engine/play?saved=plain",
    );
    // The PGN is the true game: the Analysis Board reads it as any other.
    expect(screen.getByTestId("played-games-analysis-m")).toHaveAttribute(
      "href",
      `/tools/analysis?game=${encodeURIComponent("play/games/m")}`,
    );
  });
});

describe("Lobby — filters (CTA-82)", () => {
  const three = async () => {
    await store("w1", "1. e4 e5 2. Nf3 *", "white");
    await store("b1", "1. e4 e5 *", "black");
    await store("w2", "1. d4 d5 *", "white");
  };
  const pickOpening = (name: string) => {
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Opening" }));
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name }));
  };

  it("narrows the list to the side the reader played, and says how many of how many", async () => {
    await three();
    mount();
    fireEvent.click(screen.getByTestId("played-games-filter-color-black"));
    expect(listed()).toEqual(["b1"]);
    expect(screen.getByTestId("played-games-count")).toHaveTextContent("Games: 1 of 3");
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?color=black");

    fireEvent.click(screen.getByTestId("played-games-filter-color-all"));
    expect(listed()).toEqual(["w2", "b1", "w1"]);
    expect(screen.getByTestId("played-games-count")).toHaveTextContent("Games: 3");
  });

  it("offers the openings the list reached once the book lands, and narrows by one", async () => {
    await three();
    mount();
    // Until the book lands: the filter is off and the list whole.
    expect(screen.getByRole("combobox", { name: "Opening" })).toHaveAttribute("aria-disabled", "true");
    expect(listed()).toHaveLength(3);

    await landBook();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Opening" }));
    expect(
      within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["All openings", "King's Pawn Game", "Queen's Pawn Game"]);
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Queen's Pawn Game" }));
    expect(listed()).toEqual(["w2"]);
  });

  it("combines the filters, and says so when nothing is left", async () => {
    await three();
    mount();
    await landBook();
    pickOpening("King's Pawn Game");
    expect(listed()).toEqual(["b1", "w1"]);
    fireEvent.click(screen.getByTestId("played-games-filter-color-white"));
    expect(listed()).toEqual(["w1"]);

    pickOpening("Queen's Pawn Game");
    fireEvent.click(screen.getByTestId("played-games-filter-color-black"));
    expect(listed()).toEqual([]);
    expect(screen.getByTestId("played-games-no-match")).toHaveTextContent(
      "No games match these filters.",
    );
    expect(screen.getByTestId("played-games-count")).toHaveTextContent("Games: 0 of 3");
  });

  it("reads the filters from the URL — the opening only once the book has landed", async () => {
    await three();
    mount(`/engine/games?color=white&opening=${encodeURIComponent("King's Pawn Game")}`);
    expect(listed()).toEqual(["w2", "w1"]);
    await landBook();
    expect(listed()).toEqual(["w1"]);
  });
});

describe("Lobby — the new-game form (CTA-82)", () => {
  const startHref = () =>
    new URLSearchParams(
      screen.getByTestId("new-game-start").getAttribute("href")!.split("?")[1],
    );

  it("renders the Engine tab's controls from the defaults, with the side and Start", async () => {
    mount();
    expect(screen.getByTestId("new-game-form")).toBeInTheDocument();
    expect(screen.getByTestId("engine-settings")).toBeInTheDocument();
    expect(screen.getByTestId("engine-setting-elo-value")).toHaveTextContent("2100 Elo");
    expect(screen.getByTestId("new-game-side-white")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("played-games-storage-note")).toBeInTheDocument();
    // An engine was handshaken for its options, and never asked to search.
    expect(FakeEngine.latest().searches).toEqual([]);

    const start = screen.getByTestId("new-game-start");
    expect(start.getAttribute("href")!.startsWith("/engine/play?")).toBe(true);
    expect(Object.fromEntries(startHref())).toEqual({
      side: "white",
      skill: "10",
      elo: "2100",
      depth: "14",
      movetime: "1000",
      lines: "3",
      threads: "1",
      hash: "16",
      evalbar: "1",
      variations: "1",
    });
  });

  it("carries the reader's choices on Start's link", async () => {
    mount();
    fireEvent.click(screen.getByTestId("new-game-side-black"));
    fireEvent.click(screen.getByTestId("engine-setting-evalbar"));
    const depth = within(screen.getByTestId("engine-setting-depth")).getByRole("slider");
    fireEvent.change(depth, { target: { value: 9 } });

    const params = startHref();
    expect(params.get("side")).toBe("black");
    expect(params.get("evalbar")).toBe("0");
    expect(params.get("depth")).toBe("9");
  });

  it("carries the Variations choice on Start's link, checked by default (CTA-90)", () => {
    mount();
    const box = () => screen.getByTestId("new-game-variations").querySelector("input")!;
    expect(box()).toBeChecked();
    expect(startHref().get("variations")).toBe("1");

    fireEvent.click(box());
    expect(startHref().get("variations")).toBe("0");

    fireEvent.click(box());
    expect(startHref().get("variations")).toBe("1");
  });
});

describe("Lobby — the new-game form's Board editor (CTA-83)", () => {
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1";
  const startParams = () =>
    new URLSearchParams(
      screen.getByTestId("new-game-start").getAttribute("href")!.split("?")[1],
    );

  it("has a Game and a Board editor tab, with Start and the note on both", () => {
    mount();
    expect(screen.getByTestId("new-game-tab-game")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("new-game-side")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("new-game-tab-editor"));
    expect(screen.getByTestId("new-game-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("new-game-side")).toBeNull();
    expect(screen.getByTestId("board")).toHaveAttribute("data-position", START);
    expect(screen.getByTestId("new-game-start")).toBeInTheDocument();
    expect(screen.getByTestId("played-games-storage-note")).toBeInTheDocument();
    // The standard start sends no position.
    expect(startParams().has("fen")).toBe(false);
  });

  it("sends an edited position as ?fen=, beside the Game tab's options, from either tab", () => {
    mount();
    fireEvent.click(screen.getByTestId("new-game-side-black"));
    fireEvent.click(screen.getByTestId("new-game-tab-editor"));
    editorDrag("wP", "e2", "e4");

    expect(startParams().get("fen")).toBe(AFTER_E4);
    expect(startParams().get("side")).toBe("black");

    fireEvent.click(screen.getByTestId("new-game-tab-game"));
    expect(startParams().get("fen")).toBe(AFTER_E4);
  });

  it("says on the Game tab that the position is custom, and resets it", () => {
    mount();
    expect(screen.queryByTestId("new-game-custom-position")).toBeNull();
    fireEvent.click(screen.getByTestId("new-game-tab-editor"));
    editorDrag("wP", "e2", "e4");
    fireEvent.click(screen.getByTestId("new-game-tab-game"));

    expect(screen.getByTestId("new-game-custom-position")).toHaveTextContent(AFTER_E4);
    fireEvent.click(screen.getByTestId("new-game-custom-position-reset"));

    expect(screen.queryByTestId("new-game-custom-position")).toBeNull();
    expect(startParams().has("fen")).toBe(false);
  });

  it("faces the editor's board to the side chosen on the Game tab", () => {
    mount();
    const orientation = () =>
      editorBoard.options?.boardOrientation;

    fireEvent.click(screen.getByTestId("new-game-tab-editor"));
    expect(orientation()).toBe("white");

    fireEvent.click(screen.getByTestId("new-game-tab-game"));
    fireEvent.click(screen.getByTestId("new-game-side-black"));
    fireEvent.click(screen.getByTestId("new-game-tab-editor"));
    expect(orientation()).toBe("black");
    // The side is the reader's choice, so the editor offers no Flip of its own.
    expect(screen.queryByTestId("new-game-editor-reset-flip")).toBeNull();
  });

  it("switches Start off, and says why, while the position is illegal", () => {
    mount();
    fireEvent.click(screen.getByTestId("new-game-tab-editor"));
    editorDrag("wK", "e1", null);

    const start = screen.getByTestId("new-game-start");
    expect(start).toBeDisabled();
    expect(start).not.toHaveAttribute("href");
    expect(screen.getByTestId("new-game-illegal")).toHaveTextContent("White has no king.");

    // Visible from the Game tab too.
    fireEvent.click(screen.getByTestId("new-game-tab-game"));
    expect(screen.getByTestId("new-game-illegal")).toBeInTheDocument();
    expect(screen.getByTestId("new-game-start")).toBeDisabled();
  });
});

describe("Lobby — accessibility (CTA-109)", () => {
  /** Games a minute apart, the newest last. */
  const seed = async (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const when = new Date(Date.parse("2026-09-01T10:00:00Z") + index * 60_000).toISOString();
      await store(`g${String(index).padStart(2, "0")}`, index % 2 === 0 ? "1. e4 *" : "1. d4 d5 2. c4 *", "white", when);
    }
  };

  it("passes axe with games, the new-game form beside them", async () => {
    await store("a", "1. e4 (1. d4) 1... e5 *");
    await store("m", "1. f3 e5 2. g4 Qh4# 0-1");
    mount();
    await expectNoAxeViolations();
  });

  it("passes axe with no games yet", async () => {
    mount();
    await screen.findByTestId("played-games-empty");
    await expectNoAxeViolations();
  });

  it("is worked by the keyboard alone: sort, picks, select-all, a row's action and the pages", async () => {
    // Two pages of the smallest size, not of the default 50: each query by name
    // below names every row's controls, and half the rows is half the work (CTA-124).
    await seed(26);
    mount("/engine/games?rows=25");
    const table = within(screen.getByRole("table", { name: "Your games" }));

    // A sort header is a button: Enter sorts by it.
    table.getByRole("button", { name: "Moves" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/engine/games?rows=25&sort=moves");

    // A pick is a checkbox named by its row: Space ticks it. (The newest game,
    // g25, is on the first page of the moves, high first.)
    const newest = whenPlayed("2026-09-01T10:25:00Z");
    table.getByRole("checkbox", { name: `Pick the game Human – Stockfish 19 Lite Elo 1500 of ${newest}` }).focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Delete picked (1)" })).toBeInTheDocument();

    // Select-all, from the header: every row the table shows, on every page.
    table.getByRole("checkbox", { name: "Select all the games the table shows" }).focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Delete picked (26)" })).toBeInTheDocument();
    await userEvent.keyboard(" ");
    expect(screen.queryByTestId("played-games-delete-picked")).not.toBeInTheDocument();

    // A row's action is a real link, reached by Tab.
    const continued = table.getByRole("link", { name: `Continue the game Human – Stockfish 19 Lite Elo 1500 of ${newest}` });
    continued.focus();
    expect(continued).toHaveFocus();
    expect(continued).toHaveAttribute("href", "/engine/play?saved=g25");

    // The pager's arrows are buttons.
    screen.getByRole("button", { name: "Go to next page" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("page=1");
  });

  it("asks before deleting from the keyboard, and gives the focus back to Delete picked", async () => {
    await store("a", "1. e4 *");
    mount();
    within(screen.getByRole("table", { name: "Your games" })).getAllByRole("checkbox")[1].focus();
    await userEvent.keyboard(" ");
    const deletePicked = screen.getByRole("button", { name: "Delete picked (1)" });
    deletePicked.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Delete the picked game?" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deletePicked).toHaveFocus();
    expect(playedGamesSnapshot()).toHaveLength(1);
  });

  it("works the new-game form without a pointer: the tabs, the side, the Variations box", async () => {
    mount();
    screen.getByRole("tab", { name: "Game" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Board editor" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("new-game-tab-editor")).toHaveAttribute("aria-selected", "true");
    screen.getByRole("tab", { name: "Game" }).focus();
    await userEvent.keyboard("{Enter}");

    const black = within(screen.getByRole("group", { name: "Play as" })).getByRole("button", { name: "Black" });
    black.focus();
    await userEvent.keyboard("{Enter}");
    expect(black).toHaveAttribute("aria-pressed", "true");

    const variations = screen.getByRole("checkbox", { name: "Variations" });
    variations.focus();
    await userEvent.keyboard(" ");
    expect(variations).not.toBeChecked();
    expect(screen.getByTestId("new-game-start").getAttribute("href")).toContain("variations=0");
  });
});
