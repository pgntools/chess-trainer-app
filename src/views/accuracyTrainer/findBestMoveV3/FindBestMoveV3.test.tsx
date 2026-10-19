import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

/** The screen, the game's moves between positions played out at once — `stepDelayMs` for the test that watches them. */
const mount = (stepDelayMs = 0) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/accuracy-trainer/find-best-move-v3"]}>
        <BoardLeftPanelProvider>
          <RightPanelProvider>
            <BoardLeftPanelOutlet compact={false} />
            <FindBestMoveV3 stepDelayMs={stepDelayMs} />
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
    await user.click(screen.getByRole("tab", { name: "Settings" }));
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

  it("asks Black's positions facing Black; a pass on the last goes on to the summary at once", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "Black");
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 1 of 1 · 1… Black");
    expect(boardOptions().boardOrientation).toBe("black");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("find-best-move-v3-report-measures-passed")).toHaveTextContent("1");
    // A pass is put off for later: its best moves hidden there too.
    expect(screen.getByTestId("find-best-move-v3-report-table-row-0")).not.toHaveTextContent("e5, c5");
  });

  it("goes on from a pass at once, and plays the game's moves to the next position out one by one", async () => {
    const user = userEvent.setup();
    mount(1000);
    await startWith(user, "White");
    expect(boardOptions().position).toBe(START);
    // The clock faked once the session runs: Testing Library's own waits are timers too.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      // A pass: on to 2. Qh5's position — the board starts where it was, then 1. e4, then 1... e5, a second apart.
      fireEvent.click(screen.getByRole("button", { name: "Pass" }));
      expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 2 of 2 · 2. White");
      expect(boardOptions().position).toBe(START);
      act(() => vi.advanceTimersByTime(1000));
      expect(boardOptions().position).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
      act(() => vi.advanceTimersByTime(1000));
      expect(boardOptions().position).toBe(AFTER_E5);
      expect(boardOptions().allowDragging).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops playing the game's moves out once the reader moves the board", async () => {
    const user = userEvent.setup();
    mount(1000);
    await startWith(user, "White");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Pass" }));
      act(() => vi.advanceTimersByTime(1000));
      // The reader steps back to the start: the rest is theirs.
      fireEvent.click(screen.getByTestId("board-control-first"));
      act(() => vi.advanceTimersByTime(3000));
      expect(boardOptions().position).toBe(START);
    } finally {
      vi.useRealTimers();
    }
  });

  it("switches the next-move arrows from its panel's Settings", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    expect(screen.getByRole("heading", { level: 2, name: "Alice – Bob" })).toBeInTheDocument();
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    expect(boardOptions().arrows).toEqual([expect.objectContaining({ startSquare: "e2", endSquare: "e4" })]);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
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

  it("lists the reader's moves on the left panel's Moves tab — moved up or down, deleted, on the board too — and checks them in that order", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // A session opens on the left panel's Your moves.
    expect(screen.getByRole("tab", { name: "Your moves" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("find-best-move-v3-details-moves-empty")).toHaveTextContent("No move yet");

    // Three lines from the start position: Nf3, d4, e4 — in the order played.
    drag("g1", "f3");
    await user.click(screen.getByTestId("board-control-first"));
    drag("d2", "d4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("e2", "e4");
    const items = () =>
      within(screen.getByRole("list", { name: "Your moves, best first" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent);
    expect(items()).toEqual(["1.Nf3", "2.d4", "3.e4"]);

    // e4 to the top, two steps up; Nf3 deleted.
    await user.click(screen.getByRole("button", { name: "Move e4 up" }));
    await user.click(screen.getByRole("button", { name: "Move e4 up" }));
    expect(items()).toEqual(["1.e4", "2.Nf3", "3.d4"]);
    await user.click(screen.getByRole("button", { name: "Delete Nf3" }));
    expect(items()).toEqual(["1.e4", "2.d4"]);
    // The board's tree followed: the footer's moves, and the mainline the reader's first.
    expect(screen.getByTestId("find-best-move-v3-candidates")).toHaveTextContent("Your moves: 1. e4 2. d4");
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");

    // Checked in that order: both of the top 3 found, each in its place — the tab now every line, the reader's marked.
    await user.click(screen.getByRole("button", { name: "Check (2)" }));
    expect(screen.getByTestId("find-best-move-v3-graded-headline")).toHaveTextContent("You found 2 of the top 3 — 2 in their place.");
    expect(screen.queryByRole("button", { name: /^Move |^Delete / })).not.toBeInTheDocument();
    expect(screen.getByTestId("find-best-move-v3-details-moves-headline")).toHaveTextContent("You found 2 of the top 3 — 2 in their place.");
    expect(screen.getByTestId("find-best-move-v3-details-line-1")).toHaveTextContent("Yours #1In place");
    expect(screen.getByTestId("find-best-move-v3-details-line-3")).not.toHaveTextContent("Yours");
  });

  it("shows on Your moves the position the board stands at — stepping back to an earlier one, its moves graded among every line", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // 1. e4's position: e4 and Nf3 — the 1st and the 3rd of the top 3.
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("g1", "f3");
    await user.click(screen.getByRole("button", { name: "Check (2)" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // On 2. Qh5's position: its own moves, none yet.
    const label = () => screen.getByTestId("find-best-move-v3-details-moves-label");
    expect(label()).toHaveTextContent("Position 2 of 2 · 2. White");
    expect(screen.getByTestId("find-best-move-v3-details-moves-empty")).toHaveTextContent("No move yet");

    // Back to the start: the first position's moves, graded, every line shown with the reader's marked.
    await user.click(screen.getByTestId("board-control-first"));
    expect(label()).toHaveTextContent("Position 1 of 2 · 1. White");
    expect(screen.getByTestId("find-best-move-v3-details-moves-headline")).toHaveTextContent("You found 2 of the top 3 — 1 in their place.");
    const lines = within(screen.getByRole("list", { name: "The engine's lines, best first, your moves marked" })).getAllByRole("listitem");
    expect(lines.map((line) => line.textContent)).toEqual([
      "1.e4GameThe move played in the game+0.30 · −0Yours #1In placeBest",
      "2.d4+0.25 · −5",
      "3.Nf3+0.20 · −10Yours #2Good",
    ]);
    // Past it, on the way to the next — still the first; forward to the position on screen — its own again.
    await user.click(screen.getByTestId("move-ply-1"));
    expect(label()).toHaveTextContent("Position 1 of 2");
    await user.click(screen.getByTestId("move-ply-2"));
    expect(label()).toHaveTextContent("Position 2 of 2");
    expect(screen.getByTestId("find-best-move-v3-details-moves-empty")).toBeInTheDocument();
  });

  it("answers a passed position later: back to it, Answer it now, moves, Check — then on to the position left, its work kept", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // Put off for later — and on to the next at once.
    await user.click(screen.getByRole("button", { name: "Pass" }));

    // On 2. Qh5's position, a move of the reader's; then back to the start — the passed one.
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 2 of 2");
    drag("f1", "c4");
    await user.click(screen.getByTestId("board-control-first"));
    expect(screen.getByTestId("find-best-move-v3-details-moves-label")).toHaveTextContent("Position 1 of 2");
    expect(screen.getByTestId("find-best-move-v3-details-moves-passed")).toBeInTheDocument();
    // Its lines stay hidden.
    expect(screen.queryByRole("list", { name: "The engine's lines, best first, your moves marked" })).not.toBeInTheDocument();
    await waitFor(async () => expect((await sessionCase())?.pgn ?? "").toContain("{ Find Best Move: passed }"));

    // Answer it now: the position on screen again, nothing of the game after it.
    await user.click(screen.getByRole("button", { name: "Answer it now" }));
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 1 of 2 · 1. White");
    expect(boardOptions().position).toBe(START);
    expect(screen.queryByTestId("move-ply-1")).not.toBeInTheDocument();
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Check (1)" }));
    expect(screen.getByTestId("find-best-move-v3-graded-headline")).toHaveTextContent("You found 1 of the top 3 — 1 in their place.");
    // The pass's comment gone, the new answer in its place.
    await waitFor(async () => {
      const pgn = (await sessionCase())?.pgn ?? "";
      expect(pgn).not.toContain("passed");
      expect(pgn).toContain("{ Find Best Move: 1. e4 (#1, Best) — 1 of the top 3, 1 in place }");
    });

    // Next: back to the position left, the reader's Bc4 there still.
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("find-best-move-v3-progress")).toHaveTextContent("Position 2 of 2");
    expect(screen.getByTestId("find-best-move-v3-candidates")).toHaveTextContent("Your moves: 1. Bc4");
  });
});
