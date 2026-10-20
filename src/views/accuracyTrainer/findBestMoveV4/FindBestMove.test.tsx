import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../../i18n";
import { addAnalysisCases, loadAnalysisCases, settledAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { createAnalysisProject, loadAnalysisProjects } from "../../../lib/analysisProjectStore";
import { sessionEvents as e } from "../../../lib/findBestMove/reducer";
import { createSessionCase } from "../../../lib/findBestMove/store";
import { parsePgnTree, readPgnTags } from "../../../lib/pgn";
import { EVALUATE_POSITION_KIND } from "../../../lib/jobs/kinds/evaluatePosition/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { legalMove } from "../../../test/answeringEngine";
import { expectNoAxeViolations } from "../../../test/axe";
import { PARTIAL_PGN, PLAIN_WORDS, RUY_LOPEZ_38, applied, sessionOfPgn } from "../../../test/findBestMoveKit";
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

// The browser's download, caught: what Download PGN hands it.
const downloaded = vi.hoisted(() => ({ pgns: [] as string[] }));
vi.mock("../../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/pgnExport")>()),
  downloadPgn: (_stem: string, pgns: readonly string[]) => {
    downloaded.pgns.push(...pgns);
    return true;
  },
}));

// The game boards' stub — and, for the New session form's Board editor, the spare-piece pair, the provider keeping its options.
const editorBoard = vi.hoisted(() => ({ options: null as Record<string, unknown> | null }));
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  const mock = reactChessboardMock();
  return {
    ...mock,
    // The editor's board takes no options of its own — its provider holds them.
    Chessboard: (props: { options?: Record<string, unknown> }) =>
      props.options === undefined ? <div data-testid="editor-board" /> : mock.Chessboard(props as { options: Record<string, unknown> }),
    ChessboardProvider: ({ options, children }: { options: Record<string, unknown>; children: React.ReactNode }) => {
      editorBoard.options = options;
      return <div>{children}</div>;
    },
    SparePiece: ({ pieceType }: { pieceType: string }) => <div data-testid={`spare-${pieceType}`} />,
  };
});

import FindBestMoveRoute from "./FindBestMoveRoute";
import SessionsLobby from "./SessionsLobby";

/*
  Find Best Move v4 (CTA-238, rebuilt in CTA-244 — experimental, dev-only): a
  game loaded, a side picked; at each position an analysis board showing
  every move before it and none after, the reader's lines from it their
  moves, in order, checked against the top N (the game's lines, and the
  engine's); the session a Case whose tags hold it. The pure parts are
  `lib/findBestMove/*.test.ts`; this is the screen. Every action is a write
  through the Case store, so what follows one is waited for.
*/

/** White's 1. e4 and 2. Qh5, Black's 1... e5 — each with the engine's lines. */
const ANALYSED = `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-3"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] }) 2... Nc6 *`;

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const ID = "find-best-move-v4";
const LOBBY = "/accuracy-trainer/find-best-move-v4";

/**
 * The screen at an address — the lobby, its New session form beside the
 * table, to start with; a session's own (`…/<caseId>`) to resume one — the
 * game's moves between positions played out at once: `stepDelayMs` for the
 * tests that watch them.
 */
const mount = (stepDelayMs = 0, at = LOBBY) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[at]}>
        <BoardLeftPanelProvider>
          <RightPanelProvider>
            <BoardLeftPanelOutlet compact={false} />
            <Routes>
              <Route path={`${LOBBY}/:caseId`} element={<FindBestMoveRoute stepDelayMs={stepDelayMs} />} />
              <Route path={LOBBY} element={<SessionsLobby />} />
            </Routes>
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


/** A piece dropped on the form's Board editor, as a drag would. */
const editorDrag = (pieceType: string, from: string, to: string | null) =>
  act(() => {
    (editorBoard.options!.onPieceDrop as (args: unknown) => boolean)({
      piece: { pieceType, isSparePiece: false, position: from },
      sourceSquare: from,
      targetSquare: to,
    });
  });

/** The header's "Position n of m · …", once the screen reads it — a write has to land first. */
const atPosition = (text: string) => waitFor(() => expect(screen.getByTestId(`${ID}-progress`)).toHaveTextContent(text));

/** The engine offered on a first move where the lines are too few, the engine off (CTA-245) — accepted, for the session. */
const acceptEngine = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = await screen.findByRole("dialog", { name: "Use the engine?" });
  await user.click(within(dialog).getByRole("button", { name: "Use the engine" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
};

/**
 * The engine offered on a first move where the lines are too few, the engine
 * off (CTA-245) — 2. Qh5's position has two, three to find — declined.
 */
const declineEngine = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = await screen.findByRole("dialog", { name: "Use the engine?" });
  await user.click(within(dialog).getByRole("button", { name: "Go on without it" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
};

const startWith = async (user: ReturnType<typeof userEvent.setup>, side: "White" | "Black" | "Both", pgn = ANALYSED) => {
  await load(user, pgn);
  await user.click(screen.getByRole("button", { name: side }));
  await user.click(screen.getByRole("button", { name: "Start" }));
  // Start makes the session's Case first.
  await screen.findByTestId(`${ID}-progress`);
};

/** The session's one Case, as stored. */
const sessionCase = async () => {
  const project = (await loadAnalysisProjects()).find((each) => each.name === "Find Best Move");
  return (await loadAnalysisCases()).find((each) => each.projectId === project?.id);
};

/** The session Case's PGN, once it holds `text`. */
const pgnHolds = (...texts: string[]) =>
  waitFor(async () => {
    const pgn = (await sessionCase())?.pgn ?? "";
    for (const text of texts) expect(pgn).toContain(text);
  });

beforeEach(async () => {
  await i18n.changeLanguage("en");
  FakeEngine.reset();
  downloaded.pgns = [];
});

describe("Find Best Move v4 (CTA-238, CTA-244)", () => {
  it("starts from the lobby's New session form — Game, Board editor and Settings tabs, Start under them", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: "New session" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Game" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Board editor" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pick a case…" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("shows every move before the position and none after — and the board answers only from the position", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    expect(screen.getByTestId(`${ID}-experimental`)).toHaveTextContent("Experimental");
    // 1. e4: the start, nothing of the game shown.
    expect(boardOptions().position).toBe(START);
    expect(screen.queryByTestId("move-ply-1")).not.toBeInTheDocument();
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Results (1)" }));
    await screen.findByTestId(`${ID}-graded-headline`);
    // On the position, the reader's e4 is also one of the top moves: one arrow to e2-e4, not two (the board keys its arrows by their squares).
    await user.click(screen.getByTestId("board-control-first"));
    const pairs = (boardOptions().arrows as { startSquare: string; endSquare: string }[]).map((arrow) => `${arrow.startSquare}${arrow.endSquare}`);
    expect(pairs).toContain("e2e4");
    expect(new Set(pairs).size).toBe(pairs.length);
    await user.click(screen.getByRole("button", { name: "Next" }));

    // 2. Qh5's position: the game's 1. e4 e5 there, the board on it; Qh5 and Nc6 hidden.
    await atPosition("Position 2 of 2 · 2. White");
    expect(boardOptions().position).toBe(AFTER_E5);
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    expect(screen.getByTestId("move-ply-2")).toHaveTextContent("e5");
    expect(screen.queryByTestId("move-ply-3")).not.toBeInTheDocument();
    expect(screen.queryByText("Qh5")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Results (0)" })).toBeDisabled();

    // Before the position the board takes no move; on it, it does.
    await user.click(screen.getByTestId("move-ply-1"));
    expect(boardOptions().allowDragging).toBe(false);
    await user.click(screen.getByTestId("move-ply-2"));
    expect(boardOptions().allowDragging).toBe(true);
    expect(drag("f1", "c4")).toBe(true);
    await declineEngine(user);
    expect(screen.getByRole("button", { name: "Results (1)" })).toBeEnabled();
    await expectNoAxeViolations();
  });

  it("offers no edit outside the position — the session's moves are not the reader's", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    await atPosition("Position 2 of 2");
    drag("f1", "c4");
    // An earlier move of the game: no move menu, no comment editing on it.
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    expect(screen.queryByTestId("move-menu-comment")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("move-ply-1"));
    expect(screen.queryByRole("button", { name: /add a comment/i })).not.toBeInTheDocument();
    // The reader's own move: the menu is there.
    fireEvent.contextMenu(screen.getByTestId("move-ply-3"));
    expect(screen.getByTestId("move-menu-comment")).toBeInTheDocument();
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
    expect(screen.getByTestId(`${ID}-annotations`)).toHaveTextContent("Take the centre.");

    // A glyph, from the move menu.
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    fireEvent.click(screen.getByTestId("move-menu-annotate"));
    fireEvent.click(screen.getByTestId("nag-dialog-choice-1"));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4!");

    // Each line from the position is one of the reader's moves, in the lines' order; a reply within one is none.
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. e4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("d2", "d4");
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. e4 2. d4");
    // Promoted, d4 is the reader's first.
    fireEvent.contextMenu(screen.getByTestId(/^tree-move-/));
    fireEvent.click(screen.getByTestId("move-menu-promote"));
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. d4 2. e4");
    expect(screen.getByRole("button", { name: "Results (2)" })).toBeEnabled();
    expect(FakeEngine.instances).toHaveLength(0);
    // The work is kept in the Case's tags, its comment and glyph with it.
    await pgnHolds('[FindBestMoveWork_1 "1. d4 (1. e4 $1 { Take the centre. } 1... e5)"]');
  });

  it("checks the moves found against the top N, in order — reveals the lines, goes on, and keeps the session in its Case", async () => {
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
    await user.click(screen.getByRole("button", { name: "Results (3)" }));
    expect(screen.getByRole("tab", { name: "Result" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("Every best move found, each in its place — 3 of 3.");
    expect(screen.getByTestId(`${ID}-graded-order-d4`)).toHaveTextContent("2In place");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 2");
    // The earlier position's lines are before this one: shown.
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");
    // The top 2 here are Nf3, Bc4: both found, the wrong way round.
    drag("f1", "c4");
    await declineEngine(user);
    await user.click(screen.getByTestId("move-ply-2"));
    drag("g1", "f3");
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("You found 2 of the top 2 — 0 in their place.");

    await user.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByTestId(`${ID}-report-measures-foundRate`)).toHaveTextContent("100% (5 of 5)");
    expect(screen.getByTestId(`${ID}-report-measures-inPlaceRate`)).toHaveTextContent("60% (3 of 5)");
    expect(screen.getByTestId(`${ID}-report-measures-perfect`)).toHaveTextContent("1");

    // The Case: the game's moves as its mainline, each answer on its move — no machine command anywhere.
    await pgnHolds(
      "{ Find Best Move: 1. e4 (#1, Best), 2. d4 (#2, Good), 3. Nf3 (#3, Good) — 3 of the top 3, 3 in place }",
      "2. Qh5 { [%eval -1.50] } { Find Best Move: 1. Bc4 (#2, Good), 2. Nf3 (#1, Best) — 2 of the top 2, 0 in place }",
    );
    expect((await sessionCase())?.pgn).not.toContain("[%fbm");

    // Back to the first position from the summary: graded, as answered.
    await user.click(screen.getByRole("button", { name: "Open 1. e4" }));
    await atPosition("Position 1 of 2");
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().boardOrientation).toBe("white");
  });

  it("asks Black's positions facing Black; a pass on the last goes on to the summary at once", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "Black");
    expect(screen.getByTestId(`${ID}-progress`)).toHaveTextContent("Position 1 of 1 · 1… Black");
    expect(boardOptions().boardOrientation).toBe("black");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(screen.getByTestId(`${ID}-report-measures-passed`)).toHaveTextContent("1"));
    // A pass is put off for later: its best moves hidden there too.
    expect(screen.getByTestId(`${ID}-report-table-row-2`)).not.toHaveTextContent("e5, c5");
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
      await act(async () => {
        await settledAnalysisCases();
      });
      expect(screen.getByTestId(`${ID}-progress`)).toHaveTextContent("Position 2 of 2 · 2. White");
      expect(boardOptions().position).toBe(START);
      act(() => vi.advanceTimersByTime(1000));
      expect(boardOptions().position).toBe(AFTER_E4);
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
      await act(async () => {
        await settledAnalysisCases();
      });
      act(() => vi.advanceTimersByTime(1000));
      // The reader steps back to the start: the rest is theirs.
      fireEvent.click(screen.getByTestId("board-control-first"));
      act(() => vi.advanceTimersByTime(3000));
      expect(boardOptions().position).toBe(START);
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps the replay: a gap of more than two plies jumps to the last two", async () => {
    // White's moves 1 and 5 alone: a gap of eight plies.
    const full = sessionOfPgn(RUY_LOPEZ_38, { side: "w", settings: { engine: true } });
    const record = { ...full, keys: [1, 9], positions: new Map([...full.positions].filter(([key]) => key === 1 || key === 9)) };
    const made = await createSessionCase({ record, headers: readPgnTags(RUY_LOPEZ_38), projectName: "Find Best Move", caseName: "Capped", words: PLAIN_WORDS });
    mount(1000, `${LOBBY}/${made!.caseId}`);
    await screen.findByTestId(`${ID}-progress`);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Pass" }));
      await act(async () => {
        await settledAnalysisCases();
      });
      const fenAfter = (plies: number) => {
        const tree = parsePgnTree(RUY_LOPEZ_38);
        let nodes = tree.moves;
        let fen = tree.startFen;
        for (let at = 0; at < plies; at += 1) {
          fen = nodes[0].fen;
          nodes = nodes[0].children;
        }
        return fen;
      };
      // From 1 to 9: the board starts at ply 6, and plays 7 and 8 out.
      expect(boardOptions().position).toBe(fenAfter(6));
      act(() => vi.advanceTimersByTime(1000));
      expect(boardOptions().position).toBe(fenAfter(7));
      act(() => vi.advanceTimersByTime(1000));
      expect(boardOptions().position).toBe(fenAfter(8));
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
    await waitFor(() => expect(boardOptions().arrows).toEqual([]));
  });

  it("takes a game with no engine lines — said, no switch, the session's engine off and offered at each position (CTA-246)", async () => {
    const user = userEvent.setup();
    mount();
    await load(user, '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Carol – Dan — 3 positions to train: White 2, Black 1.");
    expect(screen.getByTestId("accuracy-setup-no-lines")).toHaveTextContent("This game carries no engine lines, so training it needs the engine");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.queryByRole("switch", { name: "Use the engine" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Game" }));

    await user.click(screen.getByRole("button", { name: "White" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    await screen.findByTestId(`${ID}-progress`);
    await pgnHolds('[FindBestMoveEngine "off"]');
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.queryByRole("switch", { name: "Use the engine" })).not.toBeInTheDocument();

    // The first move offers the engine; declined, nothing is asked of it.
    const best = legalMove(START);
    drag(best.slice(0, 2), best.slice(2, 4));
    await declineEngine(user);
    expect(jobRuntime().snapshot() ?? []).toEqual([]);
  });

  it("asks the engine where the lines are too few: a job on the first move, the choice graded once it ends, its lines in the session", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White", '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    expect(jobRuntime().snapshot() ?? []).toEqual([]);

    // The first move, the engine taken from the offer, queues the position's search — on the session's Case, its key, MultiPV the lines needed.
    const best = legalMove(START);
    drag(best.slice(0, 2), best.slice(2, 4));
    await acceptEngine(user);
    await waitFor(() => expect(jobRuntime().snapshot()?.filter((job) => job.kind === EVALUATE_POSITION_KIND)).toHaveLength(1));
    const job = jobRuntime().snapshot()![0];
    expect(job.title).toBe("Evaluate position — Carol – Dan, 1. White");
    expect(job.subjects[0]).toEqual({ type: "analysis-case", id: (await sessionCase())?.id });
    expect(job.input).toMatchObject({ version: 2, fen: START, key: 1, search: { multiPv: 3 } });

    // Another move at the position — a side line — asks nothing more.
    await user.click(screen.getByTestId("board-control-first"));
    const other = best === "g1f3" ? "b1c3" : "g1f3";
    expect(drag(other.slice(0, 2), other.slice(2, 4))).toBe(true);

    // Checked: graded against the engine's line once its search ends — its one line the one to find, and the reader's first.
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`, {}, { timeout: 10_000 })).toHaveTextContent("Every best move found, each in its place — 1 of 1.");
    expect(jobRuntime().snapshot()?.filter((each) => each.kind === EVALUATE_POSITION_KIND)).toHaveLength(1);
    await pgnHolds(`engine:searched/${job.id}`, "[%eval 0.20]");
  });

  it("starts the engine thinking after Next when Settings says so — the offer on the first move still, the search only once graded (CTA-247)", async () => {
    const user = userEvent.setup();
    const { unmount } = mount();
    await startWith(user, "White", '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const group = screen.getByRole("radiogroup", { name: "Engine starts thinking" });
    expect(within(group).getByRole("radio", { name: "On the first move played" })).toBeChecked();
    await expectNoAxeViolations(group);
    await user.click(within(group).getByRole("radio", { name: "After Next is clicked" }));
    await pgnHolds('[FindBestMoveEngineStart "grade"]');

    // The first move still offers the engine; taken, the session's engine is on — and the position asks it nothing yet.
    const best = legalMove(START);
    drag(best.slice(0, 2), best.slice(2, 4));
    await acceptEngine(user);
    await pgnHolds('[FindBestMoveEngine "on"]', '[FindBestMove_1 "state:open"]');
    await user.click(screen.getByTestId("board-control-first"));
    const other = best === "g1f3" ? "b1c3" : "g1f3";
    expect(drag(other.slice(0, 2), other.slice(2, 4))).toBe(true);
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(jobRuntime().snapshot() ?? []).toEqual([]);

    // Graded: the search starts then, and the answer is graded once it ends.
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    await waitFor(() => expect(jobRuntime().snapshot()?.filter((job) => job.kind === EVALUATE_POSITION_KIND)).toHaveLength(1));
    expect(jobRuntime().snapshot()![0].input).toMatchObject({ key: 1, search: { multiPv: 3 } });
    expect(await screen.findByTestId(`${ID}-graded-headline`, {}, { timeout: 10_000 })).toHaveTextContent("1 of 1");

    // The choice is the session's: a reload of its address keeps it.
    const caseId = (await sessionCase())!.id;
    unmount();
    mount(0, `${LOBBY}/${caseId}`);
    await screen.findByTestId(`${ID}-progress`);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("radio", { name: "After Next is clicked" })).toBeChecked();
  });

  it("asks every analysed position of a partial analysis — a pass goes on to the very next, none skipped (CTA-245)", async () => {
    const user = userEvent.setup();
    mount();
    await load(user, PARTIAL_PGN);
    // White's 1. e4, 2. Nf3, 3. Nxe5 and 4. Nxc6 — 2. and 3. without a side line, the engine off.
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Alice – Bob — 8 positions to train: White 4, Black 4.");
    await user.click(screen.getByRole("button", { name: "White" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    await atPosition("Position 1 of 4 · 1. White");

    await user.click(screen.getByRole("button", { name: "Pass" }));
    await atPosition("Position 2 of 4 · 2. White");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    await atPosition("Position 3 of 4 · 3. White");

    await user.click(screen.getByRole("tab", { name: "Results" }));
    const list = within(screen.getByRole("list", { name: "The positions answered or passed" }));
    await waitFor(() =>
      expect(list.getAllByRole("button").map((row) => row.getAttribute("aria-label"))).toEqual([
        "Answer 1. White now — passed",
        "Answer 2. White now — passed",
        "Back to 3. White — answering now",
      ]),
    );
  });

  it("offers the engine on a first move where the lines are too few — declined, graded against the lines there are; a pass asks nothing (CTA-245)", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White", PARTIAL_PGN);
    // 1. e4's position has its lines: no offer.
    drag("e2", "e4");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 4 · 2. White");

    // 2. Nf3's has none.
    expect(drag("g1", "f3")).toBe(true);
    const dialog = await screen.findByRole("dialog", { name: "Use the engine?" });
    expect(within(dialog).getByText(/fewer of the engine's lines here than moves to find/)).toBeInTheDocument();
    await expectNoAxeViolations(dialog);
    await user.click(within(dialog).getByRole("button", { name: "Go on without it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Another line from the position asks nothing more, and no job is queued.
    await user.click(screen.getByRole("button", { name: "New move" }));
    expect(drag("b1", "c3")).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("There is no line here to compare your moves with.");
    expect(jobRuntime().snapshot() ?? []).toEqual([]);

    // 3. Nxe5's has none either: a pass goes on, no dialog.
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 3 of 4 · 3. White");
    await user.click(screen.getByRole("button", { name: "Pass" }));
    await atPosition("Position 4 of 4 · 4. White");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("turns the session's engine on from the offer — the position's search queued (CTA-245)", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White", PARTIAL_PGN);
    await user.click(screen.getByRole("button", { name: "Pass" }));
    await atPosition("Position 2 of 4 · 2. White");

    drag("g1", "f3");
    const dialog = await screen.findByRole("dialog", { name: "Use the engine?" });
    await user.click(within(dialog).getByRole("button", { name: "Use the engine" }));
    await waitFor(() => expect(jobRuntime().snapshot()?.filter((job) => job.kind === EVALUATE_POSITION_KIND)).toHaveLength(1));
    expect(jobRuntime().snapshot()![0].input).toMatchObject({ key: 3, search: { multiPv: 3 } });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await pgnHolds("engine:", '[FindBestMoveEngine "on"]');
  });

  it("lists the reader's moves on the left panel's Moves tab — moved up or down, deleted, on the board too — and checks them in that order", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // A session opens on the left panel's Your moves.
    expect(screen.getByRole("tab", { name: "Your moves" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId(`${ID}-details-moves-empty`)).toHaveTextContent("No move yet");

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
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. e4 2. d4");
    expect(screen.getByTestId("move-ply-1")).toHaveTextContent("e4");

    // Checked in that order: both of the top 3 found, each in its place — the tab now every line, the reader's marked.
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("You found 2 of the top 3 — 2 in their place.");
    expect(screen.queryByRole("button", { name: /^Move |^Delete / })).not.toBeInTheDocument();
    expect(screen.getByTestId(`${ID}-details-moves-headline`)).toHaveTextContent("You found 2 of the top 3 — 2 in their place.");
    expect(screen.getByTestId(`${ID}-details-line-1`)).toHaveTextContent("Yours #1In place");
    expect(screen.getByTestId(`${ID}-details-line-3`)).not.toHaveTextContent("Yours");
  });

  it("shows on Your moves the position the board stands at — stepping back to an earlier one, its moves graded among every line", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // 1. e4's position: e4 and Nf3 — the 1st and the 3rd of the top 3.
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("g1", "f3");
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    await screen.findByTestId(`${ID}-graded-headline`);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 2");

    // On 2. Qh5's position: its own moves, none yet.
    const label = () => screen.getByTestId(`${ID}-details-moves-label`);
    expect(label()).toHaveTextContent("Position 2 of 2 · 2. White");
    expect(screen.getByTestId(`${ID}-details-moves-empty`)).toHaveTextContent("No move yet");

    // Back to the start: the first position's moves, graded, every line shown with the reader's marked.
    await user.click(screen.getByTestId("board-control-first"));
    expect(label()).toHaveTextContent("Position 1 of 2 · 1. White");
    expect(screen.getByTestId(`${ID}-details-moves-headline`)).toHaveTextContent("You found 2 of the top 3 — 1 in their place.");
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
    expect(screen.getByTestId(`${ID}-details-moves-empty`)).toBeInTheDocument();
  });

  it("answers a passed position later: back to it, Answer it now, moves, Results — then on to the position left, its work kept", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // Put off for later — and on to the next at once.
    await user.click(screen.getByRole("button", { name: "Pass" }));

    // On 2. Qh5's position, a move of the reader's; then back to the start — the passed one.
    await atPosition("Position 2 of 2");
    drag("f1", "c4");
    await declineEngine(user);
    await user.click(screen.getByTestId("board-control-first"));
    expect(screen.getByTestId(`${ID}-details-moves-label`)).toHaveTextContent("Position 1 of 2");
    expect(screen.getByTestId(`${ID}-details-moves-passed`)).toBeInTheDocument();
    // Its lines stay hidden.
    expect(screen.queryByRole("list", { name: "The engine's lines, best first, your moves marked" })).not.toBeInTheDocument();
    await pgnHolds("{ Find Best Move: passed }");

    // Answer it now: the position on screen again, nothing of the game after it.
    await user.click(screen.getByRole("button", { name: "Answer it now" }));
    await atPosition("Position 1 of 2 · 1. White");
    expect(boardOptions().position).toBe(START);
    expect(screen.queryByTestId("move-ply-1")).not.toBeInTheDocument();
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Results (1)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("You found 1 of the top 3 — 1 in their place.");
    // The pass's comment gone, the new answer in its place.
    await waitFor(async () => {
      const pgn = (await sessionCase())?.pgn ?? "";
      expect(pgn).not.toContain("passed");
      expect(pgn).toContain("{ Find Best Move: 1. e4 (#1, Best) — 1 of the top 3, 1 in place }");
    });

    // Next: back to the position left, the reader's Bc4 there still.
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 2");
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. Bc4");
  });

  it("lists every position answered or passed on Results — a click back to its result, or to answer a passed one", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    // 1. e4's position: e4 — the 1st of the top 3. 2. Qh5's: passed — the last, so on to the summary.
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Results (1)" }));
    await screen.findByTestId(`${ID}-graded-headline`);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 2");
    await user.click(screen.getByRole("button", { name: "Pass" }));

    await user.click(screen.getByRole("tab", { name: "Results" }));
    const list = () => within(screen.getByRole("list", { name: "The positions answered or passed" }));
    await waitFor(() =>
      expect(list().getAllByRole("button").map((row) => row.getAttribute("aria-label"))).toEqual([
        "Open 1. White — 1/3 · 1 in place",
        "Answer 2. White now — passed",
      ]),
    );

    // The passed one: the board on it, to answer.
    await user.click(list().getByRole("button", { name: "Answer 2. White now — passed" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Results (0)" })).toBeInTheDocument());
    expect(screen.getByTestId(`${ID}-progress`)).toHaveTextContent("Position 2 of 2 · 2. White");
    expect(boardOptions().position).toBe(AFTER_E5);
    expect(drag("g1", "f3")).toBe(true);
    await declineEngine(user);
    expect(screen.getByRole("button", { name: "Results (1)" })).toBeEnabled();
    // Still listed, in its place: the one being answered now.
    expect(list().getAllByRole("button").map((row) => row.getAttribute("aria-label"))).toEqual([
      "Open 1. White — 1/3 · 1 in place",
      "Back to 2. White — answering now",
    ]);

    // The answered one: its result.
    await user.click(list().getByRole("button", { name: "Open 1. White — 1/3 · 1 in place" }));
    await atPosition("Position 1 of 2");
    expect(screen.getByRole("tab", { name: "Result" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId(`${ID}-graded-headline`)).toHaveTextContent("You found 1 of the top 3 — 1 in their place.");
    expect(list().getByRole("button", { name: "Open 1. White — 1/3 · 1 in place" })).toHaveAttribute("aria-current", "true");
    // The reopened one, left unanswered: passed again, still there to answer.
    expect(list().getByRole("button", { name: "Answer 2. White now — passed" })).toBeInTheDocument();
  });

  it("opens the New session form from the header's icon, before Download — the footer has none (CTA-240)", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    const newSession = screen.getByRole("button", { name: "New session" });
    const download = screen.getByRole("button", { name: "Download the session's PGN" });
    expect(screen.getAllByRole("button", { name: "New session" })).toHaveLength(1);
    expect(newSession.compareDocumentPosition(download) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(newSession).toHaveTextContent("");
    await user.click(newSession);
    expect(await screen.findByRole("heading", { level: 2, name: "New session" })).toBeInTheDocument();
  });

  it("reads New move · Pass · Results · Next while answering — New move back to the position, Next graded and on at once (CTA-240)", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    const newMove = screen.getByRole("button", { name: "New move" });
    const row = () => within(newMove.parentElement!).getAllByRole("button").map((button) => button.textContent);
    expect(row()).toEqual(["New move", "Pass", "Results (0)", "Next"]);
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toHaveClass("MuiButton-contained");
    expect(screen.getByRole("button", { name: "Results (0)" })).toHaveClass("MuiButton-outlined");
    // Nothing to grade yet, and the board on the position already.
    expect(next).toBeDisabled();
    expect(newMove).toBeDisabled();

    // A line, then New move: the board back at the position, the next move there a new line.
    drag("e2", "e4");
    drag("e7", "e5");
    expect(newMove).toBeEnabled();
    await user.click(newMove);
    expect(boardOptions().position).toBe(START);
    expect(newMove).toBeDisabled();
    drag("d2", "d4");
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. e4 2. d4");

    // Next: graded and on to 2. Qh5's position on Moves — no Result tab on the way.
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 2 · 2. White");
    expect(screen.getByRole("tab", { name: "Moves" })).toHaveAttribute("aria-selected", "true");
    expect(boardOptions().position).toBe(AFTER_E5);
    // The answer kept: on Results, and in the Case.
    await user.click(screen.getByRole("tab", { name: "Results" }));
    expect(within(screen.getByRole("list", { name: "The positions answered or passed" })).getByRole("button", { name: "Open 1. White — 2/3 · 2 in place" })).toBeInTheDocument();
    await pgnHolds("{ Find Best Move: 1. e4 (#1, Best), 2. d4 (#2, Good) — 2 of the top 3, 2 in place }");

    // The last position: Next goes to the summary, the answer there.
    drag("g1", "f3");
    await declineEngine(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(screen.getByTestId(`${ID}-report-measures-foundRate`)).toHaveTextContent("60% (3 of 5)"));
    // Once answered the row is Next / Summary alone.
    expect(screen.queryByRole("button", { name: "New move" })).not.toBeInTheDocument();
    expect(screen.getByTestId(`${ID}-next`)).toHaveTextContent("Summary");
  });

  it("keeps the whole session in its Case's tags — and a reload of its address resumes it exactly", async () => {
    const user = userEvent.setup();
    const { unmount } = mount();
    await startWith(user, "White");
    // 1. e4's position: e4, d4 — the 1st and 2nd of the top 3. Then on 2. Qh5's, Bc4 played, not checked.
    drag("e2", "e4");
    await user.click(screen.getByTestId("board-control-first"));
    drag("d2", "d4");
    await user.click(screen.getByRole("button", { name: "Results (2)" }));
    await screen.findByTestId(`${ID}-graded-headline`);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await atPosition("Position 2 of 2");
    drag("f1", "c4");
    await declineEngine(user);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(screen.getByRole("switch", { name: "Show next-move arrows" }));
    await pgnHolds('[FindBestMove "2"]', '[FindBestMoveCurrent "3"]', '[FindBestMoveArrows "off"]', "state:answered answer:e4,d4", '[FindBestMoveWork_3 "2. Bc4"]');
    const caseId = (await sessionCase())!.id;
    unmount();

    // The session's address, read afresh: the position on screen, the reader's move there, the settings.
    mount(0, `${LOBBY}/${caseId}`);
    expect(await screen.findByTestId(`${ID}-progress`)).toHaveTextContent("Position 2 of 2 · 2. White");
    expect(boardOptions().position).toBe(AFTER_E5);
    expect(screen.getByTestId(`${ID}-candidates`)).toHaveTextContent("Your moves: 1. Bc4");
    expect(screen.getByRole("button", { name: "Results (1)" })).toBeEnabled();
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("switch", { name: "Show next-move arrows" })).not.toBeChecked();
    expect(screen.getByRole("slider", { name: "Moves to find" })).toBeDisabled();
    // The first position's answer, graded as it was.
    await user.click(screen.getByRole("tab", { name: "Results" }));
    const results = within(screen.getByRole("list", { name: "The positions answered or passed" }));
    await user.click(results.getByRole("button", { name: "Open 1. White — 2/3 · 2 in place" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("You found 2 of the top 3 — 2 in their place.");
    // Its lines are the Case's variations, each with its eval.
    expect((await sessionCase())?.pgn).toContain("(1. Nf3 { [%eval 0.20] })");
    await expectNoAxeViolations();
  });

  it("says once what of a session could not be read — kept, open", async () => {
    const record = sessionOfPgn(ANALYSED);
    const made = await createSessionCase({ record, headers: readPgnTags(ANALYSED), projectName: "Find Best Move", caseName: "Lost one", words: PLAIN_WORDS });
    const stored = (await loadAnalysisCases()).find((each) => each.id === made!.caseId)!;
    await addAnalysisCases([{ ...stored, id: "lost", pgn: stored.pgn.split("\n").filter((line) => !line.startsWith("[FindBestMove_2 ")).join("\n") }]);
    mount(0, `${LOBBY}/lost`);
    expect(await screen.findByTestId(`${ID}-read-issue`)).toHaveTextContent("1 position of this session could not be read in full");
    expect(screen.getByTestId(`${ID}-progress`)).toHaveTextContent("Position 1 of 3");
  });

  it("downloads the session's PGN — the record projected now, the board's work in", async () => {
    const user = userEvent.setup();
    mount();
    await startWith(user, "White");
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Download the session's PGN" }));
    expect(downloaded.pgns).toHaveLength(1);
    expect(downloaded.pgns[0]).toContain('[FindBestMove "2"]');
    expect(downloaded.pgns[0]).toContain('[FindBestMoveWork_1 "1. e4"]');
    // The way back to the sessions.
    expect(screen.getByRole("link", { name: "Back to the sessions" })).toHaveAttribute("href", LOBBY);
  });

  it("resumes a session's PGN loaded in the setup — a new session, where it was left", async () => {
    const user = userEvent.setup();
    const { unmount } = mount();
    await startWith(user, "White");
    drag("e2", "e4");
    await user.click(screen.getByRole("button", { name: "Results (1)" }));
    await screen.findByTestId(`${ID}-graded-headline`);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await pgnHolds('[FindBestMoveCurrent "3"]');
    const pgn = (await sessionCase())!.pgn;
    unmount();

    mount();
    await load(user, pgn);
    expect(screen.getByTestId("accuracy-setup-loaded")).toHaveTextContent("Alice – Bob — a Find Best Move session: 1 of 2 positions answered or passed.");
    expect(screen.getByRole("button", { name: "Both" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(await screen.findByTestId(`${ID}-progress`)).toHaveTextContent("Position 2 of 2 · 2. White");
    const project = (await loadAnalysisProjects()).find((each) => each.name === "Find Best Move");
    expect((await loadAnalysisCases()).filter((each) => each.projectId === project?.id)).toHaveLength(2);
  });

  it("says a Case that holds no session cannot be resumed, and opens it in Analysis instead", async () => {
    const project = (await createAnalysisProject("Find Best Move", null))!;
    const record = gameCaseOf({ id: "plain", projectId: project.id, name: "By hand" }, parsePgnTree(ANALYSED));
    await addAnalysisCases([record]);
    mount(0, `${LOBBY}/plain`);
    expect(await screen.findByTestId(`${ID}-not-resumable`)).toHaveTextContent("holds no Find Best Move session this version can resume");
    expect(screen.getByRole("link", { name: "Open the case in Analysis" })).toHaveAttribute("href", `/analysis/projects/${project.id}/cases/plain`);
    await expectNoAxeViolations();
  });

  it("says an older session (v3's) is one, never converted — open it in Analysis", async () => {
    const project = (await createAnalysisProject("Find Best Move", null))!;
    const v3 = parsePgnTree(`[FindBestMove "1"]\n[White "Alice"]\n[Black "Bob"]\n\n1. e4 { [%fbm game:e4 state:open] } *`);
    await addAnalysisCases([gameCaseOf({ id: "older", projectId: project.id, name: "Old" }, v3)]);
    mount(0, `${LOBBY}/older`);
    expect(await screen.findByTestId(`${ID}-not-resumable`)).toHaveTextContent("an older Find Best Move session (v3)");
    expect((await loadAnalysisCases()).find((each) => each.id === "older")?.pgn).toContain("[%fbm");
  });

  it("keeps an engine search's lines in the session — a reload grades the same and asks the engine nothing more", async () => {
    const user = userEvent.setup();
    const { unmount } = mount();
    await startWith(user, "White", '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *');
    const best = legalMove(START);
    drag(best.slice(0, 2), best.slice(2, 4));
    await acceptEngine(user);
    await user.click(screen.getByRole("button", { name: "Results (1)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`, {}, { timeout: 10_000 })).toHaveTextContent("Every best move found, each in its place — 1 of 1.");
    const jobId = jobRuntime().snapshot()![0].id;
    await pgnHolds(`engine:searched/${jobId}`);
    const caseId = (await sessionCase())!.id;
    unmount();

    mount(0, `${LOBBY}/${caseId}`);
    expect(await screen.findByTestId(`${ID}-graded-headline`)).toHaveTextContent("Every best move found, each in its place — 1 of 1.");
    expect(jobRuntime().snapshot()?.filter((each) => each.kind === EVALUATE_POSITION_KIND)).toHaveLength(1);
  });

  it("grades with the lines there are, and says so, when the engine's job is gone", async () => {
    // A session whose position waits for a job the runtime never had.
    const record = applied(sessionOfPgn('[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *', { side: "w", settings: { engine: true, moves: 1 } }), [
      e.firstMove(1),
      e.engineQueued(1, "nojob"),
      e.answer(1, ["e4"]),
    ]);
    const made = await createSessionCase({ record, headers: {}, projectName: "Find Best Move", caseName: "Gone job", words: PLAIN_WORDS });
    mount(0, `${LOBBY}/${made!.caseId}`);
    expect(await screen.findByTestId(`${ID}-engine-unavailable`, {}, { timeout: 10_000 })).toHaveTextContent("The engine could not search this position");
    await waitFor(async () => expect((await loadAnalysisCases()).find((each) => each.id === made!.caseId)?.pgn).toContain("engine:failed/nojob"));
  });

  it("starts a session from a position set in the Board editor — one position, the engine finding its lines", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("tab", { name: "Board editor" }));
    editorDrag("wP", "e2", "e4");
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1";
    // The Game tab says the position is the session's.
    await user.click(screen.getByRole("tab", { name: "Game" }));
    expect(screen.getByTestId("new-session-custom-position")).toHaveTextContent(fen);
    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(await screen.findByTestId(`${ID}-progress`)).toHaveTextContent("Position 1 of 1 · 1. White");
    expect(boardOptions().position).toBe(fen);
    expect(screen.getByRole("heading", { level: 2, name: "Position — White to move" })).toBeInTheDocument();
    // No line of its own: the engine is asked, and the moves graded against its.
    const best = legalMove(fen);
    drag(best.slice(0, 2), best.slice(2, 4));
    await user.click(screen.getByRole("button", { name: "Results (1)" }));
    expect(await screen.findByTestId(`${ID}-graded-headline`, {}, { timeout: 10_000 })).toHaveTextContent("Every best move found, each in its place — 1 of 1.");
    await pgnHolds('[FindBestMoveEngine "on"]', '[FindBestMoveGame ""]', '[FindBestMoveKeys "1"]');
  });

  it("keeps Start off, and says why, while the Board editor's position cannot be answered", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("tab", { name: "Board editor" }));
    editorDrag("wK", "e1", null);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByTestId("new-session-illegal")).toHaveTextContent("White has no king.");
    // Use a game instead: the position set aside.
    await user.click(screen.getByRole("tab", { name: "Game" }));
    await user.click(screen.getByRole("button", { name: "Use a game instead" }));
    expect(screen.queryByTestId("new-session-custom-position")).not.toBeInTheDocument();
    expect(screen.queryByTestId("new-session-illegal")).not.toBeInTheDocument();
  });

  it("says a session that is not there", async () => {
    mount(0, `${LOBBY}/gone`);
    expect(await screen.findByTestId(`${ID}-missing`)).toHaveTextContent("There is no such session");
    expect(screen.getByRole("link", { name: "Back to the sessions" })).toHaveAttribute("href", LOBBY);
  });
});
