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

// The page's job runtime, its engine kinds answering every search at once — the answering
// engine's own module, not the jobs kit, which imports the runtime and so this registry back.
vi.mock("../../../lib/jobs/kinds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/jobs/kinds")>();
  const { engineDeps } = await import("../../../test/answeringEngine");
  return { ...actual, jobKinds: () => actual.jobKinds({ engine: engineDeps() }) };
});

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

import FindBestMoveV3 from "./FindBestMoveV3";

/*
  Find Best Move v3 (CTA-238, experimental, dev-only): a game loaded, a side
  picked; at each position an analysis board showing every move before it and
  none after — moves, side lines, comments, glyphs — the reader's lines from
  it their moves, in order, checked against the top N (the tree's lines, and
  the engine's); the session a Case. The pure parts are `lib/findBestMoveSession.test.ts` and
  `lib/accuracyTrainer.test.ts`; this is the screen.
*/

/** White's 1. e4 and 2. Qh5, Black's 1... e5 — each with the engine's lines. */
const ANALYSED = `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-3"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] }) 2... Nc6 *`;

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const mount = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/accuracy-trainer/find-best-move-v3"]}>
        <BoardLeftPanelProvider>
          <RightPanelProvider>
            <BoardLeftPanelOutlet compact={false} />
            <FindBestMoveV3 />
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

const load = async (user: ReturnType<typeof userEvent.setup>, pgn: string) => {
  await user.click(screen.getByRole("textbox", { name: "Or paste its PGN" }));
  await user.paste(pgn);
  await user.click(screen.getByRole("button", { name: "Load" }));
};

const startWith = async (user: ReturnType<typeof userEvent.setup>, side: "White" | "Black" | "Both", pgn = ANALYSED) => {
  await load(user, pgn);
  await user.click(screen.getByRole("button", { name: side }));
  await user.click(screen.getByRole("button", { name: "Start" }));
  // Start makes the session's Case first.
  await screen.findByTestId("find-best-move-v3-progress");
};

/** The session's one Case, as stored. */
const sessionCase = async () => {
  const project = (await loadAnalysisProjects()).find((each) => each.name === "Find Best Move");
  return (await loadAnalysisCases()).find((each) => each.projectId === project?.id);
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
  FakeEngine.reset();
});

describe("Find Best Move v3 (CTA-238)", () => {
  it("starts on its setup, marked experimental, its own panel beside the board", async () => {
    mount();
    expect(screen.getByTestId("find-best-move-v3-experimental")).toHaveTextContent("Experimental");
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pick a case…" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Find Best Move v3" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    await expectNoAxeViolations();
  });

  it("shows every move before the position and none after — and the board answers only from the position", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // 1. e4: the start, nothing of the game shown.
    expect(boardOptions().position).toBe(START);
    expect(screen.queryByTestId("move-ply-1")).not.toBeInTheDocument();
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Check (1)" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // 2. Qh5's position: the game's 1. e4 e5 there, the board on it; Qh5 and Nc6 hidden.
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 2 of 2 · 2. White");
    expect(boardOptions().position).toBe(AFTER_E5);
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    expect(screen.getByTestId("move-ply-2")).toHaveTextContent("e5");
    expect(screen.queryByTestId("move-ply-3")).not.toBeInTheDocument();
    expect(screen.queryByText("Qh5")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check (0)" })).toBeDisabled();

    // Before the position the board takes no move; on it, it does.
    await user.click(screen.getByTestId("move-ply-1"));
    expect(boardOptions().allowDragging).toBe(false);
    await user.click(screen.getByTestId("move-ply-2"));
    expect(boardOptions().allowDragging).toBe(true);
    expect(drag("f1", "c4")).toBe(true);
    expect(screen.getByRole("button", { name: "Check (1)" })).toBeEnabled();
  });

  it("is an analysis board at the position: moves both sides, side lines, comments and glyphs", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");

    expect(drag("e2", "e4")).toBe(true);
    drag("e7", "e5");
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    expect(screen.getByTestId("move-ply-2")).toHaveTextContent("e5");

    // A comment, from the move menu — shown on its move.
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    await user.click(screen.getByTestId("move-menu-comment"));
    await user.type(screen.getByTestId("comment-dialog-text"), "Take the centre.");
    await user.click(screen.getByTestId("comment-dialog-save"));
    await user.click(screen.getByTestId("move-ply-1"));
    expect(screen.getByTestId("find-best-move-v3-annotations")).toHaveTextContent("Take the centre.");

    // A glyph, from the move menu.
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    fireEvent.click(screen.getByTestId("move-menu-annotate"));
    fireEvent.click(screen.getByTestId("nag-dialog-choice-1"));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4!");

    // Each line from the position is one of the reader's moves, in the lines' order; a reply within one is none.
    expect(screen.getByTestId("find-best-move-v3-candidates")).toHaveTextContent("Your moves: 1. e4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("d2", "d4");
    expect(screen.getByTestId("find-best-move-v3-candidates")).toHaveTextContent("Your moves: 1. e4 2. d4");
    // Promoted, d4 is the reader's first.
    fireEvent.contextMenu(screen.getByTestId(/^tree-move-/));
    fireEvent.click(screen.getByTestId("move-menu-promote"));
    expect(screen.getByTestId("find-best-move-v3-candidates")).toHaveTextContent("Your moves: 1. d4 2. e4");
    expect(screen.getByRole("button", { name: "Check (2)" })).toBeEnabled();
    expect(FakeEngine.instances).toHaveLength(0);
    await expectNoAxeViolations();
  });

  it("checks the moves found against the top N, in order — reveals the lines, goes on, and keeps the session's work in its Case", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    expect(screen.getByRole("link", { name: "Open the session's case" })).toHaveAttribute("href", expect.stringMatching(/^\/analysis\/projects\/.+\/cases\/.+/));
    const record = await sessionCase();
    expect(record?.name).toBe("Alice – Bob — Find Best Move");
    // Three to find, fixed for the session.
    expect(screen.getByRole("slider", { name: "Moves to find" })).toBeDisabled();

    // The top 3 here, in order: e4, d4, Nf3.
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("d2", "d4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("g1", "f3");
    await user.click(screen.getByRole("button", { name: "Check (3)" }));
    expect(screen.getByRole("tab", { name: "Result" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("find-best-move-v3-graded-headline")).toHaveTextContent("Every best move found, each in its place — 3 of 3.");
    expect(screen.getByTestId("find-best-move-v3-graded-order-d4")).toHaveTextContent("2In place");

    await user.click(screen.getByRole("button", { name: "Next" }));
    // The earlier position's work is before this one: shown.
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    // The top 2 here are Nf3, Bc4: both found, the wrong way round.
    drag("f1", "c4");
    await user.click(screen.getByTestId("move-ply-2"));
    drag("g1", "f3");
    // A comment before the position — kept with the rest.
    fireEvent.contextMenu(screen.getByTestId("move-ply-2"));
    await user.click(screen.getByTestId("move-menu-comment"));
    await user.type(screen.getByTestId("comment-dialog-text"), "The only reply.");
    await user.click(screen.getByTestId("comment-dialog-save"));
    await user.click(screen.getByRole("button", { name: "Check (2)" }));
    expect(screen.getByTestId("find-best-move-v3-graded-headline")).toHaveTextContent("You found 2 of the top 2 — 0 in their place.");

    await user.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByTestId("find-best-move-v3-report-measures-foundRate")).toHaveTextContent("100% (5 of 5)");
    expect(screen.getByTestId("find-best-move-v3-report-measures-inPlaceRate")).toHaveTextContent("60% (3 of 5)");
    expect(screen.getByTestId("find-best-move-v3-report-measures-perfect")).toHaveTextContent("1");

    // The Case: the game's moves as its mainline, the reader's lines and comment, each answer on its position.
    await waitFor(async () => {
      const pgn = (await sessionCase())?.pgn ?? "";
      expect(pgn).toContain("{ Find Best Move: 1. e4 (#1, Best), 2. d4 (#2, Good), 3. Nf3 (#3, Good) — 3 of the top 3, 3 in place }");
      expect(pgn).toContain("{ The only reply. }");
      expect(pgn).toContain("{ Find Best Move: 1. Bc4 (#2, Good), 2. Nf3 (#1, Best) — 2 of the top 2, 0 in place } 2. Qh5");
    });

    // Back to the first position from the summary: graded, as answered.
    await user.click(screen.getByRole("button", { name: "Open 1. e4" }));
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 1 of 2");
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().boardOrientation).toBe("white");
  });

  it("asks Black's positions facing Black, and takes a pass", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "Black");
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 1 of 1 · 1… Black");
    expect(boardOptions().boardOrientation).toBe("black");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    expect(screen.getByTestId("find-best-move-v3-graded-headline")).toHaveTextContent("You passed.");
  });

  it("switches the next-move arrows from its panel's Settings", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    expect(screen.getByRole("heading", { level: 2, name: "Alice – Bob" })).toBeInTheDocument();
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    expect(boardOptions().arrows).toEqual([expect.objectContaining({ startSquare: "e2", endSquare: "e4" })]);
    await user.click(screen.getByRole("switch", { name: "Show next-move arrows" }));
    expect(boardOptions().arrows).toEqual([]);
  });

  it("takes a plain game once the engine is on — loaded before or after the switch", async () => {
    const user = userEvent.setup();
    mount();
    await load(user, '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    expect(screen.getByText(/Turn on Use the engine in the panel's Settings/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    await user.click(screen.getByRole("switch", { name: "Use the engine" }));
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Carol – Dan — 3 positions to train");
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
    await user.click(screen.getByRole("switch", { name: "Use the engine" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  it("asks the engine where the lines are too few: a job on the first move, the choice graded once it ends, its line kept", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("switch", { name: "Use the engine" }));
    await startWith(user, "White", '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    expect(jobRuntime().snapshot() ?? []).toEqual([]);

    // The first move queues the position's search — on the session's Case, MultiPV the lines needed.
    const best = legalMove(START);
    drag(best.slice(0, 2), best.slice(2, 4));
    await waitFor(() => expect(jobRuntime().snapshot()?.filter((job) => job.kind === EVALUATE_POSITION_KIND)).toHaveLength(1));
    const job = jobRuntime().snapshot()![0];
    expect(job.title).toBe("Evaluate position — Carol – Dan, 1. White");
    expect(job.subjects[0]).toEqual({ type: "analysis-case", id: (await sessionCase())?.id });
    expect(job.input).toMatchObject({ fen: START, path: [], search: { multiPv: 3 } });

    // Another move at the position — a side line — asks nothing more.
    await user.click(screen.getByTestId("board-control-first"));
    const other = best === "g1f3" ? "b1c3" : "g1f3";
    expect(drag(other.slice(0, 2), other.slice(2, 4))).toBe(true);

    // Checked: graded against the engine's line once its search ends — its one line the one to find, and the reader's first.
    await user.click(screen.getByRole("button", { name: "Check (2)" }));
    expect(await screen.findByTestId("find-best-move-v3-graded-headline", {}, { timeout: 10_000 })).toHaveTextContent("Every best move found, each in its place — 1 of 1.");
    expect(jobRuntime().snapshot()?.filter((each) => each.kind === EVALUATE_POSITION_KIND)).toHaveLength(1);
    await waitFor(async () => expect((await sessionCase())?.pgn ?? "").toContain("[%eval 0.20,20]"));
  });
});
