import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../../i18n";
import { storeEngineId } from "../../../lib/engineChoice";
import { DEFAULT_ENGINE_SETTINGS } from "../../../lib/engineSettings";
import type { EngineDescriptor, EngineHandle } from "../../../lib/engineTypes";
import { registerEngine } from "../../../lib/engines";
import { parsePgnTree } from "../../../lib/pgn";
import {
  findPlayedGame,
  playedGamesSnapshot,
  resetPlayedGameStore,
  savePlayedGame,
} from "../../../lib/playedGameStore";
import { playedGameOf, type PlayedGameEngine } from "../../../lib/playedGames";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { boardOptions, FakeEngine } from "../../board/boardTestHarness";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";

vi.mock("../../../lib/engine", async () => ({
  default: (await import("../../board/boardTestHarness")).FakeEngine,
}));

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

vi.mock("../../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../../board/boardTestHarness");
  return openingsMock(
    importOriginal as () => Promise<typeof import("../../../lib/openings")>,
  );
});

import PlayWithEngine from "./PlayWithEngine";
import { arrivalOf } from "./usePlayGame";

/*
  Play with Engine, v2 (CTA-74): a new board with Play on, the engine playing
  the side not at the bottom, pausing on a step back or a change of side, side
  lines from an earlier position, the autosave to the played-games store, and
  the `?fen=` / `?saved=` arrivals (the old store's ids too). The shared panel
  and square are asserted with the other v2 boards (`boards.test.tsx`,
  `panelPropagation.test.tsx`).
*/

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const AFTER_D4 = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1";

function Where() {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
}

const mount = (entry = "/engine/play") =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/engine/play" element={<PlayWithEngine />} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
          <Where />
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const where = () => screen.getByTestId("where").textContent ?? "";

const drag = (from: string, to: string) => {
  let accepted = false;
  act(() => {
    accepted = boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });
  return accepted;
};

/** End the search for the position on screen with a line and a bestmove. */
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

/** The stored games — the store's writes are IndexedDB's, so tests wait on them. */
const games = () => playedGamesSnapshot() ?? [];

const playButton = () => screen.getByTestId("play-with-engine-play");
const isPlaying = () => playButton().getAttribute("aria-pressed") === "true";
const click = (testId: string) => fireEvent.click(screen.getByTestId(testId));

beforeEach(async () => {
  FakeEngine.reset();
  await i18n.changeLanguage("en");
});

describe("Play with Engine — a new game", () => {
  it("opens on the standard start, the reader on White, the engine on and Play on", () => {
    mount();
    expect(boardOptions().id).toBe("play-with-engine");
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().boardOrientation).toBe("white");
    expect(
      screen.getByTestId("play-with-engine-setting-engine").querySelector("input"),
    ).toBeChecked();
    expect(isPlaying()).toBe(true);
    expect(screen.getByTestId("play-with-engine-play-status")).toHaveAttribute(
      "data-status",
      "your-move",
    );
  });

  it("opens a ?fen= with Black to move with the reader on Black, the board turned", () => {
    mount(`/engine/play?fen=${encodeURIComponent(AFTER_E4)}`);
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
    expect(isPlaying()).toBe(true);
    expect(screen.getByTestId("play-with-engine-play-status")).toHaveAttribute(
      "data-status",
      "your-move",
    );
  });

  it("ignores an unreadable ?fen=", () => {
    mount("/engine/play?fen=nonsense");
    expect(boardOptions().position).toBe(START);
  });
});

describe("Play with Engine — a new game's options from the Lobby's link (CTA-82)", () => {
  const depthValue = () => screen.getByTestId("engine-setting-depth-value").textContent;

  it("takes the side, the settings and the eval bar from the query", () => {
    mount("/engine/play?side=black&skill=5&depth=8&movetime=2500&lines=2&evalbar=0");
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().boardOrientation).toBe("black");
    // The engine is White and answers at once, at the strength asked for.
    expect(FakeEngine.latest().setOptions).toContainEqual(["Skill Level", 5]);
    expect(FakeEngine.latest().setOptions).toContainEqual(["MultiPV", 2]);
    expect(screen.queryByTestId("eval-bar")).not.toBeInTheDocument();
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByText(/Level 5/)).toBeInTheDocument();
    expect(depthValue()).toBe("8");
    expect(screen.getByTestId("engine-setting-movetime-value")).toHaveTextContent("2.5s");
    expect(screen.getByTestId("engine-setting-evalbar").querySelector("input")).not.toBeChecked();
  });

  it("reads each field on its own: an unreadable one is the default, one out of range is clamped", () => {
    mount("/engine/play?side=purple&skill=abc&depth=99&evalbar=maybe");
    expect(boardOptions().boardOrientation).toBe("white");
    expect(screen.getByTestId("eval-bar")).toBeInTheDocument();
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByText(/Level 10/)).toBeInTheDocument();
    expect(depthValue()).toBe("24");
  });

  it("lets a side beat the side to move of a ?fen=, and the FEN decide without one", () => {
    mount(`/engine/play?fen=${encodeURIComponent(AFTER_E4)}&side=white&skill=3`);
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("white");
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByText(/Level 3/)).toBeInTheDocument();
  });

  it("is beaten by ?saved=", async () => {
    await savePlayedGame(
      playedGameOf("s1", parsePgnTree("1. e4 *"), ["e4"], {
        ...DEFAULT_ENGINE_SETTINGS,
        playAs: "white",
        skillLevel: 7,
      }),
    );
    mount("/engine/play?saved=s1&side=black&skill=2");
    expect(boardOptions().boardOrientation).toBe("white");
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByText(/Level 7/)).toBeInTheDocument();
  });

  it("reads ?side=random as no side at all (CTA-90)", () => {
    expect(arrivalOf(new URLSearchParams("side=random&skill=4")).request).toEqual({
      settings: { skillLevel: 4 },
    });
  });

  it("starts with the pinned lines hidden when the link says so (CTA-90)", () => {
    mount("/engine/play?variations=0");
    // The block is there; its own header checkbox is the live control, unchecked.
    expect(screen.getByTestId("play-with-engine-panel-variations")).toBeInTheDocument();
    const toggle = screen.getByTestId("variations-toggle").querySelector("input")!;
    expect(toggle).not.toBeChecked();
    expect(screen.queryByTestId("variation-1-pending")).not.toBeInTheDocument();

    // Checking it is the way back: the waiting line returns.
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(screen.getByTestId("variation-1-pending")).toBeInTheDocument();
  });
});

describe("Play with Engine — the engine plays the other side", () => {
  it("answers the reader's move, and never plays the reader's side", () => {
    mount();
    // A search of the start finished: it is the reader's turn, so nothing moves.
    engineSearches("e2e4 e7e5");
    expect(boardOptions().position).toBe(START);

    expect(drag("e2", "e4")).toBe(true);
    expect(screen.getByTestId("play-with-engine-play-status")).toHaveAttribute(
      "data-status",
      "thinking",
    );
    expect(screen.getByTestId("play-with-engine-play-spinner")).toBeInTheDocument();
    engineSearches("e7e5 g1f3");
    expect(boardOptions().position).toBe(AFTER_E4_E5);
  });

  it("pauses when the reader switches side, and Play then has the engine take White at once", () => {
    mount();
    // The engine searched the start and finished while it was the reader's turn.
    engineSearches("d2d4 d7d5");
    click("board-control-flip");
    expect(boardOptions().boardOrientation).toBe("black");
    expect(isPlaying()).toBe(false);
    expect(boardOptions().position).toBe(START);

    fireEvent.click(playButton());
    expect(isPlaying()).toBe(true);
    // White's turn, a finished search in hand: its move is played at once.
    expect(boardOptions().position).toBe(AFTER_D4);
  });

  it("takes the header's side toggle for the side — the board turns and Play pauses", () => {
    mount();
    click("play-with-engine-side-black");
    expect(boardOptions().boardOrientation).toBe("black");
    expect(isPlaying()).toBe(false);
    // …and it is no longer in the Engine tab, nor is New game.
    click("play-with-engine-panel-tab-engine");
    expect(screen.queryByTestId("engine-setting-playas")).not.toBeInTheDocument();
    expect(screen.queryByTestId("engine-new-game")).not.toBeInTheDocument();
  });

  it("pauses on a step back, and a move by hand there is a side line Play goes on from", () => {
    mount();
    drag("e2", "e4");
    engineSearches("e7e5");
    expect(boardOptions().position).toBe(AFTER_E4_E5);

    click("board-control-first");
    expect(isPlaying()).toBe(false);
    expect(boardOptions().position).toBe(START);

    // By hand, from the start: a side line beside 1. e4.
    expect(drag("d2", "d4")).toBe(true);
    expect(boardOptions().position).toBe(AFTER_D4);
    const moves = screen.getByTestId("play-with-engine-panel-content-moves");
    expect(moves).toHaveTextContent(/e4/);
    expect(moves).toHaveTextContent(/d4/);

    // Play again: the engine answers there, in the side line.
    fireEvent.click(playButton());
    expect(isPlaying()).toBe(true);
    engineSearches("d7d5");
    expect(boardOptions().position).toBe(
      "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2",
    );
  });

  it("stops when the engine is switched off", () => {
    mount();
    click("play-with-engine-setting-engine");
    expect(isPlaying()).toBe(false);
    expect(playButton()).toBeDisabled();
  });
});

describe("Play with Engine — the game saves itself", () => {
  it("writes nothing for an untouched board", () => {
    mount();
    expect(games()).toHaveLength(0);
    expect(where()).toBe("/engine/play");
  });

  it("writes the game on every move, and the URL names it", async () => {
    mount();
    drag("e2", "e4");
    await waitFor(() => expect(games()).toHaveLength(1));
    const [game] = games();
    expect(game.path).toEqual(["e4"]);
    expect(game.settings.playAs).toBe("white");
    await waitFor(() => expect(where()).toBe(`/engine/play?saved=${game.id}`));

    engineSearches("e7e5");
    await waitFor(() => expect(games()[0].path).toEqual(["e4", "e5"]));
    expect(games()).toHaveLength(1);
    expect(games()[0].pgn).toContain("1. e4 e5");
    // The finished scores ride along, keyed by position.
    await waitFor(() =>
      expect(games()[0].evals?.some((entry) => entry.fen === AFTER_E4)).toBe(true),
    );
  });

  it("keeps side lines in the record", async () => {
    mount();
    drag("e2", "e4");
    click("board-control-first");
    drag("d2", "d4");
    await waitFor(() => expect(games()[0]?.pgn).toMatch(/1\. e4 \(1\. d4\)/));
  });

  it("discards the game's saved progress on Replay, once asked, and starts over", async () => {
    mount();
    drag("e2", "e4");
    await waitFor(() => expect(games()).toHaveLength(1));
    const first = games()[0];

    click("play-with-engine-replay");
    // Asked first: cancelling keeps everything.
    fireEvent.click(screen.getByText("Cancel"));
    expect(games()).toHaveLength(1);

    click("play-with-engine-replay");
    click("play-with-engine-confirm-ok");
    expect(boardOptions().position).toBe(START);
    expect(isPlaying()).toBe(true);
    expect(where()).toBe("/engine/play");
    await waitFor(() => expect(findPlayedGame(first.id)).toBeUndefined());
    expect(games()).toHaveLength(0);

    drag("d2", "d4");
    await waitFor(() => expect(games()).toHaveLength(1));
    expect(games()[0].id).not.toBe(first.id);
  });

  it("discards a game whose first write is still out when Replay is pressed", async () => {
    mount();
    drag("e2", "e4");
    // Replay before the write has landed: the queued removal runs after it.
    click("play-with-engine-replay");
    click("play-with-engine-confirm-ok");
    await waitFor(() => expect(games()).toHaveLength(0));
    expect(where()).toBe("/engine/play");
  });
});

describe("Play with Engine — resuming", () => {
  const stored = async (pgn: string, path: string[], playAs: "white" | "black") => {
    const record = playedGameOf(
      "p1",
      parsePgnTree(pgn),
      path,
      { ...DEFAULT_ENGINE_SETTINGS, playAs, skillLevel: 7 },
      undefined,
      new Date("2026-01-01T00:00:00Z"),
    );
    await savePlayedGame(record);
    return record;
  };

  it("goes on at the node and on the side it was left, at its strength", async () => {
    await stored("1. e4 e5 2. Nf3 *", ["e4"], "black");
    mount("/engine/play?saved=p1");
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByText(/Level 7/)).toBeInTheDocument();
  });

  it("waits for the store's first read on a reload, rather than starting a new game", async () => {
    await stored("1. e4 e5 2. Nf3 *", ["e4"], "black");
    // A reload: nothing has been read yet.
    resetPlayedGameStore();
    mount("/engine/play?saved=p1");
    expect(screen.getByTestId("play-with-engine-loading")).toBeInTheDocument();
    await screen.findByTestId("board");
    expect(boardOptions().position).toBe(AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("re-orders nothing by being opened", async () => {
    const record = await stored("1. e4 e5 *", ["e4", "e5"], "white");
    mount("/engine/play?saved=p1");
    const after = findPlayedGame("p1");
    expect(after?.pgn).toBe(record.pgn);
    expect(after?.updatedAt).toBe(record.updatedAt);
    expect(where()).toBe("/engine/play?saved=p1");
  });

  it("plays on into the same row", async () => {
    await stored("1. e4 e5 *", ["e4", "e5"], "white");
    mount("/engine/play?saved=p1");
    drag("g1", "f3");
    await waitFor(() => expect(findPlayedGame("p1")?.path).toEqual(["e4", "e5", "Nf3"]));
    expect(games()).toHaveLength(1);
  });

  it("opens a resigned game still resigned", async () => {
    await savePlayedGame(
      playedGameOf(
        "r1",
        parsePgnTree("1. e4 e5 *"),
        ["e4", "e5"],
        DEFAULT_ENGINE_SETTINGS,
        undefined,
        new Date(),
        undefined,
        "white",
      ),
    );
    mount("/engine/play?saved=r1");
    expect(screen.getByTestId("play-with-engine-resigned")).toHaveTextContent("0-1");
    expect(isPlaying()).toBe(false);
    expect(boardOptions().allowDragging).toBe(false);
  });

  it("resumes with the lines shown whatever the link says beside ?saved= (CTA-90)", async () => {
    await stored("1. e4 *", ["e4"], "white");
    mount("/engine/play?saved=p1&variations=0");
    expect(screen.getByTestId("variations-toggle").querySelector("input")).toBeChecked();
  });
});

describe("Play with Engine — resigning", () => {
  it("is off until a move is played", () => {
    mount();
    expect(screen.getByTestId("play-with-engine-resign")).toBeDisabled();
  });

  it("ends the game once asked: the reader's side loses, Play stops, the board takes no moves", async () => {
    mount();
    drag("e2", "e4");
    engineSearches("e7e5");

    click("play-with-engine-resign");
    click("play-with-engine-confirm-ok");

    expect(screen.getByTestId("play-with-engine-resigned")).toHaveTextContent(
      "You resigned · 0-1",
    );
    expect(isPlaying()).toBe(false);
    expect(playButton()).toBeDisabled();
    expect(boardOptions().allowDragging).toBe(false);
    expect(screen.getByTestId("play-with-engine-resign")).toBeDisabled();

    await waitFor(() => expect(games()[0]?.resigned).toBe("white"));
    expect(games()[0].pgn).toContain('[Result "0-1"]');
  });

  it("is undone by Replay, which starts a new game", () => {
    mount();
    drag("e2", "e4");
    click("play-with-engine-resign");
    click("play-with-engine-confirm-ok");
    click("play-with-engine-replay");
    click("play-with-engine-confirm-ok");
    expect(screen.queryByTestId("play-with-engine-resigned")).not.toBeInTheDocument();
    expect(isPlaying()).toBe(true);
    expect(boardOptions().allowDragging).toBe(true);
  });
});

/*
  The game view's own shape (CTA-91): no Map tab, the back button to the
  Lobby first in the header, the score chip hidden while the engine's lines
  are, and the game-over treatment once a game has ended.
*/
describe("Play with Engine — the game view's shape", () => {
  it("shows Moves and Engine, and no Map tab", () => {
    mount();
    expect(screen.getByTestId("play-with-engine-panel-tab-moves")).toBeInTheDocument();
    expect(screen.getByTestId("play-with-engine-panel-tab-engine")).toBeInTheDocument();
    expect(screen.queryByTestId("play-with-engine-panel-tab-map")).not.toBeInTheDocument();
  });

  it("starts the header with the back button to the Lobby", () => {
    mount();
    const back = screen.getByTestId("play-with-engine-back");
    expect(back).toHaveAttribute("href", "/engine/games");
    // First in the header, before the opening line and the game's controls.
    expect(
      screen.getByTestId("play-with-engine-panel-header").firstElementChild,
      // The design system's IconAction holds its button in a span (CTA-109).
    ).toContainElement(back);
    expect(screen.getByTestId("play-with-engine-current-opening")).toBeInTheDocument();
  });

  it("hides the score chip while the pinned lines are hidden, and returns it with them", () => {
    mount("/engine/play?variations=0");
    engineSearches("e2e4 e7e5");
    // Seeded hidden (CTA-90): the lines are away, and so is the chip (CTA-91)
    // — the status row itself stays.
    expect(screen.getByTestId("play-with-engine-panel-variations")).toBeInTheDocument();
    expect(screen.queryByTestId("play-with-engine-panel-status-score")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("variations-toggle").querySelector("input")!);
    expect(screen.getByTestId("play-with-engine-panel-status-score")).toHaveTextContent(
      "+0.20",
    );
  });
});

describe("Play with Engine — the game over", () => {
  /** One move from a back-rank mate: the rook takes the eighth. */
  const MATE_IN_ONE = "6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1";

  it("states the result once the board decides it, and offers the game to the Analysis Board", async () => {
    mount(`/engine/play?fen=${encodeURIComponent(MATE_IN_ONE)}`);
    // Nothing has ended yet, and nothing is stored to link.
    expect(screen.queryByTestId("play-with-engine-ended")).not.toBeInTheDocument();
    expect(screen.queryByTestId("play-with-engine-open-analysis")).not.toBeInTheDocument();

    expect(drag("e1", "e8")).toBe(true);
    expect(screen.getByTestId("play-with-engine-ended")).toHaveTextContent("Game over · 1-0");
    // The button may wait the one autosave between the final move and the
    // record the link names.
    expect(screen.queryByTestId("play-with-engine-open-analysis")).not.toBeInTheDocument();

    await waitFor(() => expect(games()).toHaveLength(1));
    const [game] = games();
    expect(screen.getByTestId("play-with-engine-open-analysis")).toHaveAttribute(
      "href",
      `/tools/analysis?game=${encodeURIComponent(`play/games/${game.id}`)}`,
    );
  });

  it("offers a resigned game too, and takes the whole treatment away on Replay", async () => {
    mount();
    drag("e2", "e4");
    engineSearches("e7e5");
    click("play-with-engine-resign");
    click("play-with-engine-confirm-ok");

    expect(screen.getByTestId("play-with-engine-resigned")).toHaveTextContent(
      "You resigned · 0-1",
    );
    await waitFor(() => expect(games()).toHaveLength(1));
    expect(screen.getByTestId("play-with-engine-open-analysis")).toHaveAttribute(
      "href",
      `/tools/analysis?game=${encodeURIComponent(`play/games/${games()[0].id}`)}`,
    );

    click("play-with-engine-replay");
    click("play-with-engine-confirm-ok");
    expect(screen.queryByTestId("play-with-engine-resigned")).not.toBeInTheDocument();
    expect(screen.queryByTestId("play-with-engine-open-analysis")).not.toBeInTheDocument();
  });

  it("is there for a resumed game that arrives already ended", async () => {
    await savePlayedGame(
      playedGameOf("ended", parsePgnTree("1. f3 e5 2. g4 Qh4#"), [], DEFAULT_ENGINE_SETTINGS),
    );
    mount("/engine/play?saved=ended");
    expect(screen.getByTestId("play-with-engine-ended")).toHaveTextContent("Game over · 0-1");
    expect(screen.getByTestId("play-with-engine-open-analysis")).toHaveAttribute(
      "href",
      `/tools/analysis?game=${encodeURIComponent("play/games/ended")}`,
    );
  });
});

describe("Play with Engine — accessibility (CTA-109)", () => {
  it("passes axe with a game in progress", async () => {
    mount();
    drag("e2", "e4");
    engineSearches("e7e5");
    await expectNoAxeViolations();
  });

  it("passes axe once the game is over, its result a status that is read out", async () => {
    mount();
    drag("e2", "e4");
    click("play-with-engine-resign");
    click("play-with-engine-confirm-ok");
    expect(screen.getByTestId("play-with-engine-resigned")).toHaveAttribute("role", "status");
    await expectNoAxeViolations();
  });

  it("asks before Replay from the keyboard, and gives the focus back to Replay", async () => {
    mount();
    drag("e2", "e4");
    const replay = screen.getByRole("button", { name: "Replay — start over" });
    replay.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Start over?" });
    expect(dialog).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(replay).toHaveFocus();
  });

  it("works the Engine tab without a pointer: the arrows switch and a slider", async () => {
    mount();
    fireEvent.click(screen.getByTestId("play-with-engine-panel-tab-engine"));
    const arrows = screen.getByRole("switch", { name: "Show next-move arrows" });
    arrows.focus();
    await userEvent.keyboard(" ");
    expect(arrows).not.toBeChecked();
    const depth = screen.getByRole("slider", { name: "Search depth" });
    depth.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByTestId("engine-setting-depth-value")).toHaveTextContent(String(DEFAULT_ENGINE_SETTINGS.depth + 1));
  });
});

/*
  The engine that plays (CTA-153): the reader's choice from Settings → Engine,
  read once as a game begins and written on the record; a resumed game goes on
  with its own, and with a notice where that one cannot run here.
*/
describe("Play with Engine — the engine that plays (CTA-153)", () => {
  /** An engine that declares an Elo, as the Stockfish 19 builds do — a stand-in built by the shared fake. */
  class EloEngine extends FakeEngine {
    override readonly options = new Map([
      ["Threads", { name: "Threads", type: "spin", min: 1, max: 1 }],
      ["Hash", { name: "Hash", type: "spin", min: 1, max: 1024 }],
      ["MultiPV", { name: "MultiPV", type: "spin", min: 1, max: 256 }],
      ["Skill Level", { name: "Skill Level", type: "spin", min: 0, max: 20 }],
      ["UCI_Elo", { name: "UCI_Elo", type: "spin", min: 1320, max: 3190 }],
      ["UCI_LimitStrength", { name: "UCI_LimitStrength", type: "check" }],
    ]);
  }

  const ELO: PlayedGameEngine = { id: "test-elo-engine", name: "Test Elo Engine", version: "7", strength: "elo" };
  const eloDescriptor: EngineDescriptor = {
    id: ELO.id,
    name: ELO.name,
    version: ELO.version,
    kind: "local",
    capabilities: { maxDepth: 24, strength: "both", multiThread: false },
    // The shared fake stands in for a real handle, as it does for the default engine's.
    create: () => new EloEngine() as unknown as EngineHandle,
  };
  const removers: (() => void)[] = [];
  const register = () => removers.push(registerEngine(eloDescriptor));
  afterEach(() => removers.splice(0).forEach((remove) => remove()));

  const resumable = (engine: PlayedGameEngine | undefined, id = "g1") =>
    savePlayedGame(
      playedGameOf(
        id,
        parsePgnTree("1. e4 e5 *"),
        ["e4", "e5"],
        { ...DEFAULT_ENGINE_SETTINGS, elo: 1800, skillLevel: 7 },
        undefined,
        new Date("2026-01-01T00:00:00Z"),
        undefined,
        undefined,
        undefined,
        engine,
      ),
    );

  it("plays a new game with the default engine, and writes it on the record", async () => {
    mount();
    expect(FakeEngine.latest()).not.toBeInstanceOf(EloEngine);

    drag("e2", "e4");
    await waitFor(() => expect(games()).toHaveLength(1));

    expect(games()[0].engine).toMatchObject({ id: "stockfish-2019-wasm", version: "2019-08-15", strength: "skill" });
    // The default keeps the wording every earlier game has.
    expect(games()[0].pgn).toContain('[Black "Stockfish (level 10)"]');
    expect(screen.queryByTestId("play-with-engine-engine-notice")).toBeNull();
  });

  it("plays a new game with the engine the reader chose, naming it with its Elo on the record", async () => {
    register();
    storeEngineId(ELO.id);

    mount();
    expect(FakeEngine.latest()).toBeInstanceOf(EloEngine);

    drag("e2", "e4");
    await waitFor(() => expect(games()).toHaveLength(1));

    expect(games()[0].engine).toEqual(ELO);
    expect(games()[0].pgn).toContain('[Black "Test Elo Engine (Elo 2100)"]');
  });

  it("asks that engine for an Elo, with the limit on — and shows the strength as an Elo", () => {
    register();
    storeEngineId(ELO.id);

    mount();

    const engine = FakeEngine.latest();
    expect(engine.setOptions).toContainEqual(["UCI_Elo", 2100]);
    expect(engine.setOptions).toContainEqual(["UCI_LimitStrength", 1]);
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Strength" })).toBeNull();
  });

  it("names the engine that plays, on the Engine tab", async () => {
    register();
    await resumable(ELO);
    mount("/engine/play?saved=g1");

    click("play-with-engine-panel-tab-engine");

    expect(screen.getByTestId("play-with-engine-engine-name")).toHaveTextContent("Played by Test Elo Engine (7)");
  });

  it("shows Skill Level, as ever, on the default engine", () => {
    mount();
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByRole("slider", { name: "Strength" })).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Strength (Elo)" })).toBeNull();
  });

  it("keeps its engine when the choice changes under it — a game is played by one engine", () => {
    register();
    mount();
    const first = FakeEngine.latest();

    act(() => storeEngineId(ELO.id));

    expect(FakeEngine.instances).toHaveLength(1);
    expect(first.terminated).toBe(false);
  });

  it("begins the next game under the engine chosen now: Replay", async () => {
    register();
    mount();
    drag("e2", "e4");
    await waitFor(() => expect(games()[0]?.engine?.id).toBe("stockfish-2019-wasm"));
    const first = FakeEngine.latest();

    act(() => storeEngineId(ELO.id));
    click("play-with-engine-replay");
    click("play-with-engine-confirm-ok");

    expect(first.terminated).toBe(true);
    expect(FakeEngine.latest()).toBeInstanceOf(EloEngine);
    drag("e2", "e4");
    await waitFor(() => expect(games().some((game) => game.engine?.id === ELO.id)).toBe(true));
  });

  it("resumes a game with the engine its record names, whatever is chosen now", async () => {
    register();
    await resumable(ELO);

    // The reader's choice is the default; the game's own engine plays.
    mount("/engine/play?saved=g1");

    expect(FakeEngine.latest()).toBeInstanceOf(EloEngine);
    expect(screen.queryByTestId("play-with-engine-engine-notice")).toBeNull();
    click("play-with-engine-panel-tab-engine");
    expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeInTheDocument();
  });

  it("resumes a game from before the choice with the default engine, and says nothing", async () => {
    register();
    storeEngineId(ELO.id);
    await resumable(undefined);

    mount("/engine/play?saved=g1");

    // Absent means the default engine — not the one chosen now.
    expect(FakeEngine.latest()).not.toBeInstanceOf(EloEngine);
    expect(screen.queryByTestId("play-with-engine-engine-notice")).toBeNull();
    expect(findPlayedGame("g1")?.engine).toBeUndefined();
  });

  it("falls back to the default, with a notice, where the game's own engine cannot run here", async () => {
    // Registered nowhere: a build the registry no longer has.
    await resumable({ id: "gone-engine", name: "Gone Engine", version: "3", strength: "elo" });

    mount("/engine/play?saved=g1");

    expect(FakeEngine.latest()).not.toBeInstanceOf(EloEngine);
    const notice = screen.getByTestId("play-with-engine-engine-notice");
    expect(notice).toHaveTextContent("This game was played with Gone Engine, which cannot run here");
    expect(notice).toHaveTextContent("so Stockfish 2019 plays on");
  });

  it("says so for an engine this page cannot run — the multi-thread build without isolation", async () => {
    await resumable({ id: "stockfish-19-lite-multi", name: "Stockfish 19 Lite (multi-thread)", version: "19", strength: "elo" });

    mount("/engine/play?saved=g1");

    expect(screen.getByTestId("play-with-engine-engine-notice")).toHaveTextContent("Stockfish 19 Lite (multi-thread)");
  });

  it("keeps naming the game's own engine on its record while another plays it on", async () => {
    const gone: PlayedGameEngine = { id: "gone-engine", name: "Gone Engine", version: "3", strength: "elo" };
    await resumable(gone);
    mount("/engine/play?saved=g1");

    drag("g1", "f3");
    await waitFor(() => expect(findPlayedGame("g1")?.path).toEqual(["e4", "e5", "Nf3"]));

    // Opening a game elsewhere must never rewrite who played it.
    expect(findPlayedGame("g1")?.engine).toEqual(gone);
  });

  it("reads in Hebrew", async () => {
    await i18n.changeLanguage("he");
    await resumable({ id: "gone-engine", name: "Gone Engine", version: "3", strength: "elo" });

    mount("/engine/play?saved=g1");

    expect(screen.getByTestId("play-with-engine-engine-notice")).toHaveTextContent("Gone Engine");
    expect(screen.getByTestId("play-with-engine-engine-notice")).toHaveTextContent("המשחק הזה שוחק עם");
  });
});
