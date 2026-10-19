import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { addAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { createAnalysisProject } from "../../../lib/analysisProjectStore";
import { parsePgnTree } from "../../../lib/pgn";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { boardOptions, FakeEngine } from "../../board/boardTestHarness";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";

vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

import FindBestMoveV1 from "./FindBestMoveV1";

/*
  The Accuracy Trainer (CTA-238, experimental, dev-only): a fully analysed
  game loaded, a side picked, each position answered with moves played on the
  board, graded against the tree's engine lines, then the summary. The
  grading itself is `lib/accuracyTrainer.test.ts`'s; this is the screen.
*/

/** A computer analysis's shape: White's 1. e4 and 2. Qh5, Black's 1... e5, each with the engine's lines. */
const ANALYSED = `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-3"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] }) *`;

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const mount = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/accuracy-trainer/find-best-move-v1"]}>
        <RightPanelProvider>
          <FindBestMoveV1 />
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

/** Drop a piece on the stubbed board, as a drag would; whether the board kept it. */
const drag = (from: string, to: string) => {
  let accepted = true;
  act(() => {
    accepted = boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });
  return accepted;
};

const loadPasted = async (user: ReturnType<typeof userEvent.setup>, pgn: string) => {
  await user.click(screen.getByRole("textbox", { name: "Or paste its PGN" }));
  await user.paste(pgn);
  await user.click(screen.getByRole("button", { name: "Load" }));
};

const suggestions = () =>
  within(screen.getByRole("list", { name: "Your moves" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
  FakeEngine.reset();
});

describe("the Accuracy Trainer (CTA-238)", () => {
  it("is marked experimental, and starts on its setup: nothing loaded, Start off, no summary yet", async () => {
    mount();
    expect(screen.getByTestId("find-best-move-v1-experimental")).toHaveTextContent("Experimental");
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Summary" })).toBeDisabled();
    await expectNoAxeViolations();
  });

  it("refuses a game with no engine lines, plainly", async () => {
    const user = userEvent.setup();
    mount();
    await loadPasted(user, "1. e4 { [%eval 0.3] } 1... e5 2. Nf3 *");
    expect(screen.getByText(/This game carries no engine lines/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  it("walks the side's positions: moves played on the board join the list, Submit grades them, Next, then the summary", async () => {
    const user = userEvent.setup();
    mount();
    await loadPasted(user, ANALYSED);
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Alice – Bob — 3 positions with the engine's lines: White 2, Black 1.");

    await user.click(screen.getByRole("button", { name: "White" }));
    await user.click(screen.getByRole("button", { name: "Start" }));

    // The first of White's two positions: the start, facing White.
    expect(screen.getByTestId("find-best-move-v1-progress")).toHaveTextContent("Position 1 of 2 · 1. White");
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().boardOrientation).toBe("white");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    // A legal move is read, not played: on the list, the board back where it was.
    expect(drag("e2", "e4")).toBe(false);
    expect(drag("g1", "f3")).toBe(false);
    // An illegal one adds nothing, a repeated one counts once.
    drag("e2", "e5");
    drag("e2", "e4");
    expect(suggestions()).toEqual(["e4", "Nf3"]);
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().arrows).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remove Nf3" }));
    expect(suggestions()).toEqual(["e4"]);
    drag("b1", "c3");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    // Graded: the engine's lines revealed, the board no longer takes moves.
    expect(screen.getByTestId("find-best-move-v1-graded-headline")).toHaveTextContent("You found the best move.");
    expect(screen.getByTestId("find-best-move-v1-graded-verdict-e4")).toHaveTextContent("Best");
    expect(screen.getByTestId("find-best-move-v1-graded-verdict-Nc3")).toHaveTextContent("Outside the top 3");
    expect(boardOptions().allowDragging).toBe(false);
    await expectNoAxeViolations();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("find-best-move-v1-progress")).toHaveTextContent("Position 2 of 2 · 2. White");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    expect(screen.getByTestId("find-best-move-v1-graded-headline")).toHaveTextContent("You passed.");

    // The last position: on to the summary.
    await user.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("find-best-move-v1-report-measures-answered")).toHaveTextContent("1");
    expect(screen.getByTestId("find-best-move-v1-report-measures-passed")).toHaveTextContent("1");
    expect(screen.getByTestId("find-best-move-v1-report-measures-bestRate")).toHaveTextContent("50% (1 of 2)");
    expect(screen.getByTestId("find-best-move-v1-report-measures-outside")).toHaveTextContent("1");
    await expectNoAxeViolations();

    // Back to a position from the table: graded, as answered.
    await user.click(screen.getByRole("button", { name: "Open 1. e4" }));
    expect(screen.getByTestId("find-best-move-v1-progress")).toHaveTextContent("Position 1 of 2");
    expect(screen.getByTestId("find-best-move-v1-graded-verdict-e4")).toHaveTextContent("Best");

    // No engine ran.
    expect(FakeEngine.instances).toHaveLength(0);

    // A new session goes back to the setup, the game still loaded.
    await user.click(screen.getByRole("button", { name: "New session" }));
    expect(screen.getByTestId("accuracy-setup-loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });

  it("asks Black's positions facing Black", async () => {
    const user = userEvent.setup();
    mount();
    await loadPasted(user, ANALYSED);
    await user.click(screen.getByRole("button", { name: "Black" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByTestId("find-best-move-v1-progress")).toHaveTextContent("Position 1 of 1 · 1… Black");
    expect(boardOptions().boardOrientation).toBe("black");
    drag("c7", "c5");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByTestId("find-best-move-v1-graded-headline")).toHaveTextContent("You found 1 of the top 2.");
  });

  it("takes a promotion through the picker, as its SAN", async () => {
    const user = userEvent.setup();
    mount();
    await loadPasted(
      user,
      `[FEN "8/P6k/8/8/8/8/8/K7 w - - 0 1"]\n[SetUp "1"]\n\n1. a8=Q { [%eval 9.00] } (1. Kb2 { [%eval 0.50] }) *`,
    );
    await user.click(screen.getByRole("button", { name: "Start" }));
    drag("a7", "a8");
    await user.click(screen.getByRole("button", { name: "Knight" }));
    expect(suggestions()).toEqual(["a8=N"]);
  });

  it("loads a Case picked from Analysis", async () => {
    const project = await createAnalysisProject("Training", null);
    await addAnalysisCases([gameCaseOf({ id: "c-analysed", projectId: project!.id, name: "Analysed game" }, parsePgnTree(ANALYSED))]);
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "Pick a case…" }));
    const dialog = await screen.findByRole("dialog", { name: "Pick a case" });
    await user.click(within(dialog).getByRole("combobox", { name: "Case" }));
    await user.click(await screen.findByRole("option", { name: "Analysed game" }));
    await user.click(within(dialog).getByRole("button", { name: "Load" }));
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Analysed game — 3 positions");
  });
});
