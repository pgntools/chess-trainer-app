import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { loadAnalysisCases } from "../../../lib/analysisCaseStore";
import { loadAnalysisProjects } from "../../../lib/analysisProjectStore";
import { EVALUATE_POSITION_KIND } from "../../../lib/jobs/kinds/evaluatePosition/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { legalMove } from "../../../test/answeringEngine";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { boardOptions, FakeEngine } from "../../board/boardTestHarness";
import { BoardLeftPanelOutlet, BoardLeftPanelProvider } from "../../main/boardLeftPanel";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";

vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

// The page's job runtime, its engine kinds answering every search at once (the jobs kit's engine).
vi.mock("../../../lib/jobs/kinds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/jobs/kinds")>();
  // The answering engine's own module — not the jobs kit, which imports the runtime and so this registry.
  const { engineDeps } = await import("../../../test/answeringEngine");
  return { ...actual, jobKinds: () => actual.jobKinds({ engine: engineDeps() }) };
});

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

import FindBestMoveV2 from "./FindBestMoveV2";

/*
  Find Best Move v2 (CTA-238, experimental, dev-only): v1's setup, then a
  regular analysis board at each position — moves, side lines, comments,
  glyphs — and the first move of the line on screen chosen as the answer,
  graded as v1 grades one. The setup and the grading are v1's and the lib's
  (`FindBestMoveV1.test.tsx`, `lib/accuracyTrainer.test.ts`); this is the board.
*/

/** White's 1. e4 and 2. Qh5, Black's 1... e5, each with the engine's lines. */
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
      <MemoryRouter initialEntries={["/accuracy-trainer/find-best-move-v2"]}>
        <BoardLeftPanelProvider>
          <RightPanelProvider>
            <BoardLeftPanelOutlet compact={false} />
            <FindBestMoveV2 />
            <RightPanelOutlet />
          </RightPanelProvider>
        </BoardLeftPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

/** Drop a piece on the stubbed board, as a drag would; whether the board kept it. */
const drag = (from: string, to: string) => {
  let accepted = false;
  act(() => {
    accepted = boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });
  return accepted;
};

const startWhite = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("textbox", { name: "Or paste its PGN" }));
  await user.paste(ANALYSED);
  await user.click(screen.getByRole("button", { name: "Load" }));
  await user.click(screen.getByRole("button", { name: "White" }));
  await user.click(screen.getByRole("button", { name: "Start" }));
  // Start makes the session's Case first.
  await screen.findByTestId("find-best-move-v2-progress");
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
  FakeEngine.reset();
});

describe("Find Best Move v2 (CTA-238)", () => {
  it("starts on v1's setup, marked experimental", async () => {
    mount();
    expect(screen.getByTestId("find-best-move-v2-experimental")).toHaveTextContent("Experimental");
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pick a case…" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("is an analysis board at the position: moves both sides, side lines, comments and glyphs — none of the game's", async () => {
    const user = userEvent.setup();
    mount();
    await startWhite(user);

    // A board of the reader's own at the position: nothing of the game's in it.
    expect(boardOptions().position).toBe(START);
    expect(screen.getByTestId("find-best-move-v2-progress")).toHaveTextContent("Position 1 of 2 · 1. White");
    expect(screen.queryByText("Qh5")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play a move to choose it" })).toBeDisabled();

    // Moves are played, both sides.
    expect(drag("e2", "e4")).toBe(true);
    drag("e7", "e5");
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    expect(screen.getByTestId("move-ply-2")).toHaveTextContent("e5");

    // A comment, from the move menu.
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    await user.click(screen.getByTestId("move-menu-comment"));
    await user.type(screen.getByTestId("comment-dialog-text"), "Take the centre.");
    await user.click(screen.getByTestId("comment-dialog-save"));
    // On the move it is about, the comment block shows it.
    await user.click(screen.getByTestId("move-ply-1"));
    expect(screen.getByTestId("find-best-move-v2-annotations")).toHaveTextContent("Take the centre.");

    // A glyph, from the move menu.
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    fireEvent.click(screen.getByTestId("move-menu-annotate"));
    fireEvent.click(screen.getByTestId("nag-dialog-choice-1"));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4!");

    // Deep in the line, Choose takes its first move.
    await user.click(screen.getByTestId("move-ply-2"));
    expect(screen.getByRole("button", { name: "Choose e4" })).toBeEnabled();
    await expectNoAxeViolations();

    // A side line from the start: on it, its first move is the choice.
    await user.click(screen.getByTestId("board-control-first"));
    drag("d2", "d4");
    expect(screen.getByRole("button", { name: "Choose d4" })).toBeEnabled();
    expect(FakeEngine.instances).toHaveLength(0);
  });

  it("grades the move chosen, reveals the lines, goes on, and keeps the reader's analysis for the session", async () => {
    const user = userEvent.setup();
    mount();
    await startWhite(user);

    drag("e2", "e4");
    drag("e7", "e5");
    await user.click(screen.getByRole("button", { name: "Choose e4" }));

    // The Result tab: the engine's lines, the choice graded.
    expect(screen.getByRole("tab", { name: "Result" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("find-best-move-v2-graded-headline")).toHaveTextContent("You found the best move.");
    expect(screen.getByTestId("find-best-move-v2-graded-verdict-e4")).toHaveTextContent("Best");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("find-best-move-v2-progress")).toHaveTextContent("Position 2 of 2 · 2. White");
    expect(screen.getByRole("tab", { name: "Moves" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Result" })).toBeDisabled();
    // A fresh board at the next position.
    expect(screen.queryByTestId("move-ply-1")).not.toBeInTheDocument();
    expect(boardOptions().position).toBe("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");

    drag("f1", "c4");
    await user.click(screen.getByRole("button", { name: "Choose Bc4" }));
    expect(screen.getByTestId("find-best-move-v2-graded-headline")).toHaveTextContent("You found 1 of the top 2.");

    await user.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByTestId("find-best-move-v2-report-measures-bestRate")).toHaveTextContent("50% (1 of 2)");
    await expectNoAxeViolations();

    // Back to the first position: its analysis as the reader left it.
    await user.click(screen.getByRole("button", { name: "Open 1. e4" }));
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    expect(screen.getByTestId("move-ply-2")).toHaveTextContent("e5");
    expect(boardOptions().boardOrientation).toBe("white");
  });

  it("takes a pass", async () => {
    const user = userEvent.setup();
    mount();
    await startWhite(user);
    await user.click(screen.getByRole("button", { name: "Pass" }));
    expect(screen.getByTestId("find-best-move-v2-graded-headline")).toHaveTextContent("You passed.");
  });

  it("has its own panel beside the board: the game's name, and Settings' next-move arrows switch", async () => {
    const user = userEvent.setup();
    mount();
    // Nothing loaded: the exercise's name.
    expect(screen.getByRole("heading", { level: 2, name: "Find Best Move v2" })).toBeInTheDocument();
    await startWhite(user);
    expect(screen.getByRole("heading", { level: 2, name: "Alice – Bob" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");

    // A move played, then back to the position: its next-move arrow is drawn.
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    expect(boardOptions().arrows).toEqual([expect.objectContaining({ startSquare: "e2", endSquare: "e4" })]);

    const arrows = screen.getByRole("switch", { name: "Show next-move arrows" });
    expect(arrows).toBeChecked();
    await user.click(arrows);
    expect(boardOptions().arrows).toEqual([]);
    await user.click(arrows);
    expect(boardOptions().arrows).toHaveLength(1);
    await expectNoAxeViolations();
  });

  it("keeps the session as a Case in the Find Best Move project — the mainline, the reader's analysis and the answer", async () => {
    const user = userEvent.setup();
    mount();
    await startWhite(user);
    // Its Case, linked from the panel.
    expect(screen.getByRole("link", { name: "Open the session's case" })).toHaveAttribute("href", expect.stringMatching(/^\/analysis\/projects\/.+\/cases\/.+/));
    const project = (await loadAnalysisProjects()).find((each) => each.name === "Find Best Move");
    expect(project?.folderId).toBeNull();
    const record = (await loadAnalysisCases()).find((each) => each.projectId === project?.id);
    expect(record?.name).toBe("Alice – Bob — Find Best Move v2");

    drag("e2", "e4");
    drag("e7", "e5");
    await user.click(screen.getByRole("button", { name: "Choose e4" }));
    await waitFor(async () => {
      const pgn = (await loadAnalysisCases()).find((each) => each.id === record?.id)?.pgn ?? "";
      // The game's moves alone, then the session's: the answer on the start position, the reader's line merged in.
      expect(pgn).toContain("{ Find Best Move: e4 — Best (0 cp) }");
      expect(pgn).toContain("1. e4 e5 2. Qh5");
      expect(pgn).not.toContain("[%eval");
    });
  });

  it("asks the engine with too few lines: a plain game taken, a job on the first move, Choose waiting for it, its line graded and kept", async () => {
    const user = userEvent.setup();
    mount();
    // Use the engine — a plain game is taken.
    await user.click(screen.getByRole("switch", { name: "Use the engine" }));
    await user.click(screen.getByRole("textbox", { name: "Or paste its PGN" }));
    await user.paste('[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    await user.click(screen.getByRole("button", { name: "Load" }));
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Carol – Dan — 3 positions to train");
    await user.click(screen.getByRole("button", { name: "White" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByTestId("find-best-move-v2-progress");
    expect(jobRuntime().snapshot() ?? []).toEqual([]);

    // The first move queues the position's search — on the session's Case, MultiPV the lines needed.
    const best = legalMove(START);
    drag(best.slice(0, 2), best.slice(2, 4));
    await waitFor(() => expect(jobRuntime().snapshot()?.filter((job) => job.kind === EVALUATE_POSITION_KIND)).toHaveLength(1));
    const job = jobRuntime().snapshot()![0];
    expect(job.title).toBe("Evaluate position — Carol – Dan, 1. White");
    expect(job.subjects[0].type).toBe("analysis-case");
    expect(job.input).toMatchObject({ fen: START, path: [], search: { multiPv: 3 } });
    // Another move at the position — a side line — asks nothing more.
    await user.click(screen.getByTestId("board-control-first"));
    const other = best === "g1f3" ? "b1c3" : "g1f3";
    expect(drag(other.slice(0, 2), other.slice(2, 4))).toBe(true);

    // Back on the engine's move, chosen: graded against its line once its search ends.
    await user.click(screen.getByTestId("move-ply-1"));
    await user.click(screen.getByRole("button", { name: /^Choose / }));
    expect(await screen.findByTestId("find-best-move-v2-graded-headline", {}, { timeout: 10_000 })).toHaveTextContent("You found the best move.");
    expect(jobRuntime().snapshot()?.filter((each) => each.kind === EVALUATE_POSITION_KIND)).toHaveLength(1);
    await waitFor(async () => {
      const pgn = (await loadAnalysisCases()).find((each) => each.id === job.subjects[0].id)?.pgn ?? "";
      expect(pgn).toContain("[%eval 0.20,20]");
    });
  });
});
