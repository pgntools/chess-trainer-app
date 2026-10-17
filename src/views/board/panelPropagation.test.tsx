import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import i18n from "../../i18n";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { BoardLeftPanelProvider } from "../main/boardLeftPanel";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";

/*
  **The propagation assertion** — CTA-60's acceptance criterion 4, and the whole
  reason the issue exists.

  The claim the unified core makes is not "the screens look alike"; it is that
  the best-variations block and the panel skeleton live in **one component**, so
  a change to that component demonstrably changes every board. Asserting
  that by comparing rendered markup would only say they agree today. So this
  file **replaces** `core/BoardPanel` with a sentinel and renders every
  board: if any one of them grew a panel of its own — a fork, a copy, a second
  skeleton — its sentinel would be missing, and the count below would be short.

  That is the failure this test exists to catch, and it is the one a reviewer
  cannot catch by reading: a screen that renders `<MyOwnPanel>` looks perfectly
  reasonable in isolation.

  `boards.test.tsx` is the other half — it renders the real panel and asserts
  what is inside it.
*/

vi.mock("./core/BoardPanel", () => ({
  default: ({
    testId,
    tabs,
  }: {
    testId: string;
    tabs: readonly { id: string; label: string }[];
  }) => (
    <div data-testid="the-one-board-panel" data-panel-id={testId}>
      {/* The tabs come through, so the sentinel also proves the slot contract
          is what each screen is filling rather than a panel of its own. */}
      <span data-testid="panel-tab-ids">
        {tabs.map((tab) => tab.id).join(",")}
      </span>
    </div>
  ),
}));

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
    detailsTab="settings"
    onDetailsTabChange={() => {}}
    drawerOpen={false}
    onDrawerOpenChange={() => {}}
  />
);


/** A Case of Analysis V2 (CTA-186), on its board. */
const CASE_FIXTURE = gameCaseOf({ id: "fixture-case", projectId: "fixture-project", name: "" }, parsePgnTree('[White "A"]\n[Black "B"]\n\n1. e4 e5 *'));
const AnalysisCase = () => <CaseBoard record={CASE_FIXTURE} />;

/** Every board composed from the core, by the id its panel carries. */
const BOARDS: readonly { name: string; panelId: string; Screen: () => ReactNode }[] =
  [
    // Play with Engine, a v2 screen since CTA-74.
    { name: "Play with Engine", panelId: "play-with-engine-panel", Screen: PlayWithEngine },
    // The Library's game board (CTA-75).
    { name: "Library game", panelId: "library-game-panel", Screen: LibraryGame },
    // The Openings explorer (CTA-78), in Openings v2's place.
    { name: "Openings explorer", panelId: "openings-panel", Screen: OpeningsBoard },
    // Masked Pieces (CTA-79), Play with Engine's screen in a costume — in the
    // dev boards' place.
    { name: "Masked Pieces", panelId: "masked-play-panel", Screen: MaskedPlay },
    // Analysis V2's Case board (CTA-186) — the app's analysis board since CTA-192.
    { name: "Analysis V2 case", panelId: "analysis-case-panel", Screen: AnalysisCase },
  ];

const renderBoard = (Screen: () => ReactNode) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/dev"]}>
        <BoardLeftPanelProvider>
          <RightPanelProvider>
            <Screen />
            <RightPanelOutlet />
          </RightPanelProvider>
        </BoardLeftPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("en");
});

describe("the one panel skeleton", () => {
  it.each(BOARDS)(
    "$name renders it, and no panel of its own",
    ({ panelId, Screen }) => {
      const { unmount } = renderBoard(Screen);

      const panels = screen.getAllByTestId("the-one-board-panel");
      // Exactly one, and it is this screen's — a board that built its own
      // would render zero of these, and a board that rendered two skeletons
      // would be a bug of its own.
      expect(panels).toHaveLength(1);
      expect(panels[0]).toHaveAttribute("data-panel-id", panelId);

      unmount();
    },
  );

  it("changes every board at once when that one component changes", () => {
    /*
      The propagation itself, stated as an assertion. The mock above *is* the
      change: one edit to one module, and every board renders it. A mount
      and a sentinel each, and the panel id proving each one came from the
      screen under test rather than from a leftover mount.
    */
    const seen: string[] = [];

    for (const { Screen } of BOARDS) {
      const { unmount } = renderBoard(Screen);
      seen.push(
        screen
          .getByTestId("the-one-board-panel")
          .getAttribute("data-panel-id") ?? "missing",
      );
      expect(screen.getByTestId("panel-tab-ids").textContent).toContain(
        "moves",
      );
      unmount();
    }

    expect(seen).toEqual(BOARDS.map((board) => board.panelId));
  });

  it("gives every board the Moves tab through the same slot — and an Engine tab only to the Play boards (CTA-181)", () => {
    /*
      The tab strip is the skeleton's; what goes in it is the screen's. Moves
      is common to all of them. Since CTA-181 the search settings are the top
      bar's Engine menu and no analysis board has an Engine tab: only Play
      with Engine and Masked Pieces keep one, for the opponent's strength.
    */
    const PLAY_BOARDS = ["play-with-engine-panel", "masked-play-panel"];
    for (const { Screen, panelId } of BOARDS) {
      const { unmount } = renderBoard(Screen);
      const ids = (screen.getByTestId("panel-tab-ids").textContent ?? "").split(",");
      expect(ids).toContain("moves");
      if (PLAY_BOARDS.includes(panelId)) expect(ids, panelId).toContain("engine");
      else expect(ids, panelId).not.toContain("engine");
      unmount();
    }
  });
});
