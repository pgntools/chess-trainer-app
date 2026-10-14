import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import i18n from "../../i18n";
import { stubReducedMotion } from "../../test/reducedMotion";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";

/*
  Every board composed from the v2 core, rendered for real (CTA-60's criteria,
  carried on as the boards shipped): the Analysis Board, Play with Engine,
  Masked Pieces (CTA-79), the Library's game board and the Openings explorer.
  (The Development section's own boards, Play v2 and Masked v2, were the last
  there and went with CTA-79.)

  `panelPropagation.test.tsx` is the other half: it replaces the panel with
  a sentinel to prove every board renders *one* component. This file keeps
  the real one and asserts what is inside it — that the shared skeleton's
  parts actually reach every board, that the masked board adds a costume and
  nothing else, and that each board keeps the one thing that is its own.
*/

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("./boardTestHarness")).builtinEnginesMock(importOriginal),
);

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("./boardTestHarness");
  return reactChessboardMock();
});

vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("./boardTestHarness");
  return openingsMock(
    importOriginal as () => Promise<typeof import("../../lib/openings")>,
  );
});

import { boardOptions, FakeEngine } from "./boardTestHarness";
import { storeEngineId } from "../../lib/engineChoice";
import { storeEngineSearchSettings } from "../../lib/engineSearchInEffect";
import { EngineMenu } from "../main/EngineMenu";
import { loadPlayedGames, playedGamesSnapshot } from "../../lib/playedGameStore";
import PlayWithEngine from "../engine/play/PlayWithEngine";
import LibraryGameBoard from "../library/LibraryGameBoard";
import OpeningsBoard from "../openings/OpeningsBoard";
import { parsePgnTree } from "../../lib/pgn";
import MaskedPlay from "../engine/masked/MaskedPlay";
import { CaseBoard } from "../analysisV2/CaseWorkspace";
import { gameCaseOf } from "../../lib/analysisProjects";


/** A game of an uploaded collection on the Library's board (CTA-75). */
const LIBRARY_FIXTURE = {
  id: "fixture",
  name: "Fixture",
  source: "uploaded" as const,
  games: ['[White "A"]\n[Black "B"]\n\n1. e4 e5 *'],
};
const LibraryGame = () => (
  <LibraryGameBoard
    collection={LIBRARY_FIXTURE}
    number={1}
    tree={parsePgnTree(LIBRARY_FIXTURE.games[0])}
  />
);

/** A Case of Analysis V2 (CTA-186), on its board. */
const CASE_FIXTURE = gameCaseOf({ id: "fixture-case", projectId: "fixture-project", name: "" }, parsePgnTree('[White "A"]\n[Black "B"]\n\n1. e4 e5 *'));
const AnalysisCase = () => <CaseBoard record={CASE_FIXTURE} />;
const BOARDS: readonly {
  name: string;
  id: string;
  Screen: () => ReactNode;
  /** Whether the pinned engine lines show from the start — all but Masked Pieces. */
  linesShown?: false;
  /** Whether the engine's switch starts off (CTA-148) — every board on `useAnalysisSession`. */
  engineOff?: true;
  /**
   * The board's own Engine tab — the Play boards' strength. Since CTA-181 the
   * analysis boards have none: the search settings are the top bar's Engine
   * menu, the eval bar the header's engine menu.
   */
  engineTab?: true;
  /**
   * The engine's on / off a small switch in its header, its other choices a
   * Settings tab — Analysis V2's Case board (CTA-186) — not the play / pause
   * and its menu every other board has.
   */
  engineSwitch?: true;
  /** A tab beside Moves, to open in the tab-panel test. */
  otherTab: string;
}[] = [
  // Analysis v2 shipped as the Analysis Board (CTA-73); it stays in the set.
  // Play with Engine, a v2 screen since CTA-74.
  { name: "Play with Engine", id: "play-with-engine", Screen: PlayWithEngine, engineTab: true, otherTab: "engine" },
  { name: "Library game", id: "library-game", Screen: LibraryGame, engineOff: true, otherTab: "map" },
  // The Openings explorer (CTA-78), in Openings v2's place.
  { name: "Openings explorer", id: "openings", Screen: OpeningsBoard, engineOff: true, otherTab: "map" },
  // Masked Pieces (CTA-79): Play with Engine's screen in a costume — its
  // engine lines wait behind a switch.
  { name: "Masked Pieces", id: "masked-play", Screen: MaskedPlay, linesShown: false, engineTab: true, otherTab: "engine" },
  // Analysis V2's Case board (CTA-186), composed as the Analysis Board is.
  { name: "Analysis V2 case", id: "analysis-case", Screen: AnalysisCase, engineOff: true, engineSwitch: true, otherTab: "map" },
];

const renderBoard = (Screen: () => ReactNode, entry = "/dev") =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <Screen />
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

/** Drag a piece, the way the board would report it. */
const drag = (from: string, to: string) => {
  let accepted = false;
  act(() => {
    accepted = boardOptions().onPieceDrop!({
      sourceSquare: from,
      targetSquare: to,
    });
  });
  return accepted;
};

/** Switch a board's engine — on, for a board that starts with it off (CTA-148). */
const toggleEngine = (id: string) =>
  act(() => {
    screen.getByTestId(`${id}-setting-engine`).click();
  });

/** Push one `info` line for the position currently being searched. */
const engineReports = (info: {
  depth: number;
  multipv?: number;
  cp?: number;
  pv: string;
}) => {
  const engine = FakeEngine.latest();
  const fen = engine.lastSearch;
  act(() => {
    engine.say({
      fen,
      uciMessage: "info",
      depth: info.depth,
      multipv: info.multipv,
      positionEvaluation: info.cp === undefined ? undefined : String(info.cp),
      pv: info.pv,
    });
  });
};

/** End the current search with a bestmove, as the wrapper would. */
const engineFinishes = (bestMove: string) => {
  const engine = FakeEngine.latest();
  const fen = engine.lastSearch;
  act(() => {
    engine.say({ fen, uciMessage: "bestmove", bestMove });
  });
};

beforeEach(async () => {
  localStorage.clear();
  FakeEngine.reset();
  await i18n.changeLanguage("en");
});

describe("every v2 board, from the same core", () => {
  it.each(BOARDS)("$name renders the shared board square", ({ id, Screen }) => {
    // Criterion 3: the board, the eval bar and the captured strips are the
    // shared `EngineBoardSquare`'s, reached through `BoardShell` — so the
    // square's own test ids are the same on every board but the prefix.
    const { unmount } = renderBoard(Screen);

    expect(screen.getByTestId(`${id}-screen`)).toBeInTheDocument();
    expect(screen.getByTestId(`${id}-board`)).toBeInTheDocument();
    expect(boardOptions().id).toBe(id);

    unmount();
  });

  it.each(BOARDS)("$name renders the shared panel skeleton", ({ id, Screen, engineTab, engineSwitch }) => {
    const { unmount } = renderBoard(Screen);

    // Criterion 4, rendered for real: the pinned variations block, the status
    // row, the Moves tab and the shared board controls.
    expect(screen.getByTestId(`${id}-panel`)).toBeInTheDocument();
    expect(screen.getByTestId(`${id}-panel-status`)).toBeInTheDocument();
    expect(screen.getByTestId(`${id}-panel-tab-moves`)).toBeInTheDocument();
    expect(screen.getByTestId("board-controls")).toBeInTheDocument();
    // The Engine tab only where the board has its own (the Play boards' strength) — CTA-181.
    if (engineTab) expect(screen.getByTestId(`${id}-panel-tab-engine`)).toBeInTheDocument();
    else expect(screen.queryByTestId(`${id}-panel-tab-engine`)).not.toBeInTheDocument();
    if (engineSwitch) {
      // The Case board's engine: a switch in its header, and no menu (CTA-186).
      expect(screen.getByRole("switch", { name: i18n.t("analysisV2.workspace.engine") })).toHaveAttribute("data-testid", `${id}-setting-engine`);
      expect(screen.queryByTestId(`${id}-engine-menu`)).not.toBeInTheDocument();
    } else {
      // Every other board's engine: a play / pause in its header, and its menu (CTA-181).
      expect(screen.getByRole("button", { name: i18n.t("boardEngine.toggle") })).toHaveAttribute("data-testid", `${id}-setting-engine`);
      expect(screen.getByRole("button", { name: i18n.t("boardEngine.menu") })).toHaveAttribute("data-testid", `${id}-engine-menu`);
    }

    unmount();
  });

  it.each(BOARDS)("$name names its tab panel by its tab, whichever is open (CTA-112)", ({ id, Screen, otherTab }) => {
    const { unmount } = renderBoard(Screen);
    const panel = screen.getByTestId(`${id}-panel`);
    const linked = () => {
      const tab = within(panel).getByRole("tab", { selected: true });
      const region = within(panel).getByRole("tabpanel");
      expect(region).toHaveAttribute("aria-labelledby", tab.id);
      expect(tab).toHaveAttribute("aria-controls", region.id);
      expect(region).toHaveAccessibleName(tab.textContent ?? "");
    };
    linked();
    act(() => screen.getByTestId(`${id}-panel-tab-${otherTab}`).click());
    expect(within(panel).getByRole("tab", { selected: true })).toBe(screen.getByTestId(`${id}-panel-tab-${otherTab}`));
    linked();
    unmount();
  });

  it.each(BOARDS.filter((board) => board.linesShown !== false))(
    "$name pins the engine's lines above its tabs",
    ({ id, Screen, engineOff }) => {
    /*
      CTA-55 on every board, which is the drift this issue closes: before
      CTA-60 this block existed on the Analysis Board alone. The lines are
      pushed through the fake engine, so what is asserted is a real search
      result reaching a real `BestVariations`.
    */
    const { unmount } = renderBoard(Screen);
    if (engineOff) toggleEngine(id);

    engineReports({ depth: 14, multipv: 1, cp: 42, pv: "e2e4 e7e5" });

    const block = screen.getByTestId(`${id}-panel-variations`);
    expect(within(block).getByText("+0.42")).toBeInTheDocument();
    expect(screen.getByTestId(`${id}-panel-status-score`)).toHaveTextContent(
      "+0.42",
    );

    unmount();
    },
  );

  it.each(BOARDS)("$name hides the lines while its engine is off", ({ id, Screen, engineOff }) => {
    const { unmount } = renderBoard(Screen);

    // Some boards start with it off already (CTA-148).
    if (!engineOff) toggleEngine(id);

    expect(
      screen.queryByTestId(`${id}-panel-variations`),
    ).not.toBeInTheDocument();
    // The status row stays and says so honestly, rather than the block
    // claiming to be waiting for a switch the reader turned off.
    expect(screen.getByTestId(`${id}-panel-status`)).toHaveTextContent(
      i18n.t("analysis.settings.engineOff"),
    );

    unmount();
  });

  it.each(BOARDS)("$name searches the position on screen", ({ id, Screen, engineOff }) => {
    const { unmount } = renderBoard(Screen);
    if (engineOff) toggleEngine(id);

    expect(FakeEngine.latest().lastSearch).toBe(boardOptions().position);

    unmount();
  });

  it.each(BOARDS.filter((board) => board.engineOff === true))(
    "$name starts with its engine off — no search runs, Play is disabled — until the reader switches it on (CTA-148)",
    ({ id, Screen, engineSwitch }) => {
      const { unmount } = renderBoard(Screen);
      // A play / pause is pressed while on; a switch, checked.
      const engineOn = () =>
        engineSwitch
          ? (screen.getByTestId(`${id}-setting-engine`) as HTMLInputElement).checked
          : screen.getByTestId(`${id}-setting-engine`).getAttribute("aria-pressed") === "true";

      expect(engineOn()).toBe(false);
      expect(FakeEngine.instances.flatMap((engine) => engine.searches)).toEqual([]);
      expect(screen.getByTestId(`${id}-play`)).toBeDisabled();
      toggleEngine(id);
      expect(engineOn()).toBe(true);
      expect(FakeEngine.latest().searches.length).toBeGreaterThan(0);
      expect(screen.getByTestId(`${id}-play`)).toBeEnabled();

      unmount();
    },
  );
});

/*
  The search settings are one global set (CTA-181): set in the top bar's
  Engine menu, read by every board from its next search — depth and move
  time on `go`, lines, Threads and Hash as options.
*/
describe("the global search settings reach every board (CTA-181)", () => {
  it.each(BOARDS)("$name searches to the top bar's depth and move time, with its lines", ({ id, Screen, engineOff }) => {
    storeEngineSearchSettings({ depth: 9, moveTimeMs: 5000, multiPv: 4 });
    const { unmount } = renderBoard(Screen);
    if (engineOff) toggleEngine(id);
    const engine = FakeEngine.latest();
    expect(engine.searchOptions.at(-1)).toEqual({ depth: 9, movetime: 5000 });
    expect(engine.setOptions).toContainEqual(["MultiPV", 4]);

    // A change applies from the next search, on the board already open.
    act(() => storeEngineSearchSettings({ depth: 11 }));
    expect(FakeEngine.latest().searchOptions.at(-1)).toEqual({ depth: 11, movetime: 5000 });
    unmount();
  });

  it.each(BOARDS.filter((board) => board.linesShown !== false))(
    "$name fills its depth chip toward the top bar's depth while it searches (CTA-195)",
    ({ id, Screen, engineOff }) => {
      storeEngineSearchSettings({ depth: 20, moveTimeMs: 0 });
      const { unmount } = renderBoard(Screen);
      if (engineOff) toggleEngine(id);
      engineReports({ depth: 15, multipv: 1, cp: 10, pv: "e2e4" });

      const block = screen.getByTestId(`${id}-panel-variations`);
      const chip = within(block).getByRole("progressbar", { name: "Depth 15 of 20" });
      expect(chip).toHaveTextContent("Depth 15/20");
      expect(chip).toHaveAttribute("aria-valuenow", "75");

      // The search answered: the depth reached, no fill — as before.
      engineFinishes("e2e4");
      expect(within(block).queryByRole("progressbar")).not.toBeInTheDocument();
      expect(within(block).getByTestId("analysis-depth")).toHaveTextContent(/^Depth 15$/);
      unmount();
    },
  );

  it.each(BOARDS)("$name tells the top bar what its engine is doing", ({ id, Screen, engineOff }) => {
    const { unmount } = render(
      <AppThemeWithLang>
        <MemoryRouter initialEntries={["/dev"]}>
          <RightPanelProvider>
            <EngineMenu />
            <Screen />
            <RightPanelOutlet />
          </RightPanelProvider>
        </MemoryRouter>
      </AppThemeWithLang>,
    );
    const icon = () => screen.getByTestId("header-engine-icon");
    if (engineOff) {
      expect(icon()).toHaveAttribute("data-state", "off");
      toggleEngine(id);
    }
    // On, a search running: the icon breathes.
    expect(icon()).toHaveAttribute("data-state", "searching");
    engineReports({ depth: 9, multipv: 1, cp: 10, pv: "e2e4" });
    act(() => {
      const engine = FakeEngine.latest();
      engine.say({ fen: engine.lastSearch, uciMessage: "bestmove", bestMove: "e2e4" });
    });
    // The search answered: on, still.
    expect(icon()).toHaveAttribute("data-state", "on");
    unmount();
    // Gone with the board: a screen with no board leaves the icon neutral.
    render(
      <AppThemeWithLang>
        <MemoryRouter>
          <EngineMenu />
        </MemoryRouter>
      </AppThemeWithLang>,
    );
    expect(icon()).toHaveAttribute("data-state", "none");
  });
});

describe("reduced motion, on every board (CTA-111)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(BOARDS)("$name animates its pieces as it always has without the preference", ({ Screen }) => {
    const { unmount } = renderBoard(Screen);
    expect(boardOptions().showAnimations).toBeUndefined();
    unmount();
  });

  it.each(BOARDS)("$name moves its pieces without animation when the reader asks for reduced motion", ({ Screen }) => {
    stubReducedMotion();
    const { unmount } = renderBoard(Screen);
    expect(boardOptions().showAnimations).toBe(false);
    unmount();
  });
});

describe("an Analysis case's board (Analysis V2, CTA-186)", () => {
  it("never moves a piece, whatever the engine says", () => {
    renderBoard(AnalysisCase);

    const before = boardOptions().position;
    engineReports({ depth: 12, cp: 10, pv: "e2e4" });
    engineFinishes("e2e4");

    // No `onBestMove` is passed, so the branch that plays one does not exist.
    expect(boardOptions().position).toBe(before);
  });

  it("accepts moves for both colours, from any node", () => {
    renderBoard(AnalysisCase);

    expect(drag("e2", "e4")).toBe(true);
    expect(drag("e7", "e5")).toBe(true);
    // Back to the start, and a different first move: a variation, not an error.
    act(() => {
      screen.getByTestId("board-control-first").click();
    });
    expect(drag("d2", "d4")).toBe(true);
  });
});

describe("Masked Pieces (CTA-79)", () => {
  it("adds a costume and nothing else", () => {
    /*
      The masked board hands the board a `pieces` renderer — the only honest
      place to disguise a piece — and the same composition underneath, which
      is why the true position it reports is identical to Play with Engine's.
    */
    const { unmount } = renderBoard(MaskedPlay);
    expect(boardOptions().pieces).toBeDefined();
    const maskedStart = boardOptions().position;
    // The extra tab, and only one.
    expect(screen.getByTestId("masked-play-panel-tab-masking")).toBeInTheDocument();
    unmount();

    renderBoard(PlayWithEngine);
    expect(boardOptions().pieces).toBeUndefined();
    expect(boardOptions().position).toBe(maskedStart);
    expect(
      screen.queryByTestId("play-with-engine-panel-tab-masking"),
    ).not.toBeInTheDocument();
  });

  it("plays ordinary legal chess underneath the costume", () => {
    renderBoard(MaskedPlay);

    // A knight move the mask draws as a pawn is still a knight move.
    expect(drag("g1", "f3")).toBe(true);
    // And an illegal one is still illegal.
    expect(drag("a1", "a5")).toBe(false);
  });

  it("keeps its engine lines behind a switch, the score chip with them (CTA-91)", () => {
    renderBoard(MaskedPlay);

    engineReports({ depth: 14, multipv: 1, cp: 42, pv: "e2e4 e7e5" });
    expect(screen.queryByTestId("masked-play-panel-variations")).not.toBeInTheDocument();
    // The chip hides with the block: the engine's lines away is the engine's
    // talk away, the number included. The status row itself stays.
    expect(screen.queryByTestId("masked-play-panel-status-score")).not.toBeInTheDocument();
    expect(screen.getByTestId("masked-play-panel-status")).toBeInTheDocument();

    act(() => {
      screen.getByTestId("masked-play-panel-tab-masking").click();
    });
    act(() => {
      screen.getByTestId("mask-setting-lines").querySelector("input")!.click();
    });
    expect(screen.getByTestId("masked-play-panel-variations")).toBeInTheDocument();
    expect(screen.getByTestId("masked-play-panel-status-score")).toHaveTextContent("+0.42");
  });

  it("saves its game with the engine games, costume and all", async () => {
    renderBoard(MaskedPlay);

    expect(drag("e2", "e4")).toBe(true);

    await waitFor(() => expect(playedGamesSnapshot()).toHaveLength(1));
    expect(playedGamesSnapshot()?.[0].mask?.notation).toBe(true);
  });
});

describe("the Openings explorer (CTA-78)", () => {
  it("keeps nothing: no save, and no store written", async () => {
    renderBoard(OpeningsBoard);

    expect(drag("e2", "e4")).toBe(true);
    expect(screen.queryByTestId("openings-save")).not.toBeInTheDocument();
    expect(await loadPlayedGames()).toEqual([]);
  });

  it("carries the book explorer in a tab of its own", () => {
    renderBoard(OpeningsBoard);

    // The book is stubbed empty here, so what is asserted is that the explorer
    // is on screen at all — the slot, not eco.json.
    expect(screen.getByTestId("openings-panel-tab-book")).toBeInTheDocument();
    expect(screen.getByTestId("openings-book")).toBeInTheDocument();
  });
});

/*
  The reader's engine (CTA-153): every board builds the engine chosen in
  Settings → Engine — one shared place (`useEngineModule`), so one test over
  the set. (The repertoire player has its own composition and its own row in
  `RepertoirePlayer.test.tsx`.)
*/
describe("the reader's engine reaches every board (CTA-153)", () => {
  /** The multi-thread build — the other engine a reader can choose, on an isolated page. */
  const chosen = { id: "stockfish-19-lite-multi" };
  const isChosen = (engine: FakeEngine) => engine.descriptor?.id === chosen.id;
  beforeEach(() => {
    FakeEngine.reset();
    vi.stubGlobal("crossOriginIsolated", true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(BOARDS.map((board) => [board.name, board] as const))("%s builds the engine the reader chose", (_name, board) => {
    storeEngineId(chosen.id);

    renderBoard(board.Screen);

    expect(isChosen(FakeEngine.latest())).toBe(true);
    expect(FakeEngine.instances.filter((engine) => !engine.terminated)).toHaveLength(1);
  });

  it.each(BOARDS.map((board) => [board.name, board] as const))("%s builds the default engine when none was chosen", (_name, board) => {
    renderBoard(board.Screen);

    expect(isChosen(FakeEngine.latest())).toBe(false);
  });

  // Every board but the games against the engine, which keep theirs (below).
  const following = BOARDS.filter((board) => board.id !== "play-with-engine" && board.id !== "masked-play");

  it.each(following.map((board) => [board.name, board] as const))(
    "%s swaps to a new choice — the old engine terminated, one running",
    (_name, board) => {
      renderBoard(board.Screen);
      const first = FakeEngine.latest();
      expect(isChosen(first)).toBe(false);

      act(() => storeEngineId(chosen.id));

      expect(first.terminated).toBe(true);
      expect(isChosen(FakeEngine.latest())).toBe(true);
      expect(FakeEngine.instances.filter((engine) => !engine.terminated)).toHaveLength(1);
    },
  );

  it.each(
    BOARDS.filter((board) => board.id === "play-with-engine" || board.id === "masked-play").map((board) => [board.name, board] as const),
  )("%s keeps a game's engine when the choice changes under it", (_name, board) => {
    renderBoard(board.Screen);
    const first = FakeEngine.latest();

    act(() => storeEngineId(chosen.id));

    expect(first.terminated).toBe(false);
    expect(FakeEngine.instances).toHaveLength(1);
  });
});
