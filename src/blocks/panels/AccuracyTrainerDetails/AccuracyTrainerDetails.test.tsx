import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EngineStart } from "../../../lib/findBestMove/model";
import { expectNoAxeViolations } from "../../../test/axe";
import AccuracyTrainerDetails, { type AccuracyTrainerDetailsTab } from "./AccuracyTrainerDetails";
import type { AchievementPieces } from "../../../lib/achievements/material";
import { ACHIEVEMENTS, CASE_LINK, GAME_TITLE, GRADED, GRADED_POSITION, HEBREW_TITLE, LABEL, MOVES, NO_PIECES, RESULTS } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The panel with its switch live, as a screen holds it. */
function Live({
  title = GAME_TITLE,
  initial = true,
  withCase = false,
  shown = "answering",
  startTab = "settings",
  onAnswerAgain = () => {},
  onOpen = () => {},
  withEngineStart = true,
  pieces = ACHIEVEMENTS,
}: {
  title?: string;
  initial?: boolean;
  withCase?: boolean;
  shown?: "answering" | "waiting" | "graded" | "passed";
  startTab?: AccuracyTrainerDetailsTab;
  onAnswerAgain?: () => void;
  onOpen?: (index: number) => void;
  withEngineStart?: boolean;
  pieces?: AchievementPieces | null;
}) {
  const [tab, setTab] = useState<AccuracyTrainerDetailsTab>(startTab);
  const [list, setList] = useState<readonly string[]>(MOVES);
  const answerAgain = onAnswerAgain;
  const [showArrows, setShowArrows] = useState(initial);
  const [moves, setMoves] = useState(3);
  const [engineStart, setEngineStart] = useState<EngineStart>("move");
  return (
    <AccuracyTrainerDetails
      title={title}
      tab={tab}
      onTabChange={setTab}
      showArrows={showArrows}
      onShowArrowsChange={setShowArrows}
      movesToFind={moves}
      onMovesToFindChange={setMoves}
      {...(withEngineStart ? { engineStart, onEngineStartChange: setEngineStart } : {})}
      {...(withCase
        ? {
            caseLink: CASE_LINK,
            results: { rows: RESULTS, onOpen },
            achievements: { label: LABEL, pieces },
            moves:
              shown === "passed"
                ? { kind: "passed" as const, label: LABEL, onAnswerAgain: answerAgain }
                : shown === "graded"
                ? { kind: "graded" as const, label: LABEL, position: GRADED_POSITION, grade: GRADED }
                : shown === "waiting"
                  ? { kind: "waiting" as const, label: LABEL, list }
                  : {
                      kind: "answering" as const,
                      label: LABEL,
                      list,
                      onMove: (index: number, move: "up" | "down") =>
                        setList((current) => {
                          const next = [...current];
                          const to = move === "up" ? index - 1 : index + 1;
                          [next[index], next[to]] = [next[to], next[index]];
                          return next;
                        }),
                      onRemove: (index: number) => setList((current) => current.filter((_, at) => at !== index)),
                    },
          }
        : {})}
      testId="details"
    />
  );
}

describe("AccuracyTrainerDetails (CTA-238)", () => {
  it("is a section named for the game, its heading the game, then a Settings tab", () => {
    render(<Live />);
    expect(screen.getByRole("region", { name: "Alice – Bob — the exercise's own view" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: GAME_TITLE })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Your moves" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Settings" })).toBeInTheDocument();
  });

  it("switches the next-move arrows on Settings", async () => {
    const user = userEvent.setup();
    render(<Live />);
    const arrows = screen.getByRole("switch", { name: "Show next-move arrows" });
    expect(arrows).toBeChecked();
    await user.click(arrows);
    expect(arrows).not.toBeChecked();
  });

  it("sets the moves to find, and has no engine switch (CTA-246)", async () => {
    const user = userEvent.setup();
    render(<Live />);
    const moves = screen.getByRole("slider", { name: "Moves to find" });
    expect(moves).toHaveValue("3");
    moves.focus();
    await user.keyboard("{ArrowRight}");
    expect(moves).toHaveValue("4");
    expect(screen.getByRole("switch", { name: "Show next-move arrows" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Use the engine" })).not.toBeInTheDocument();
  });

  it("chooses when the engine starts thinking — the first move played, or after Next (CTA-247)", async () => {
    const user = userEvent.setup();
    const { container } = render(<Live withCase />);
    const group = screen.getByRole("radiogroup", { name: "Engine starts thinking" });
    const onMove = within(group).getByRole("radio", { name: "On the first move played" });
    const afterNext = within(group).getByRole("radio", { name: "After Next is clicked" });
    expect(onMove).toBeChecked();
    expect(group).toHaveAccessibleDescription(/starts on your first move/);
    await user.click(afterNext);
    expect(afterNext).toBeChecked();
    expect(onMove).not.toBeChecked();
    expect(group).toHaveAccessibleDescription(/only once the position is graded/);
    await expectNoAxeViolations(container);
  });

  it("has no engine-start choice where none is given", () => {
    render(<Live withEngineStart={false} />);
    expect(screen.queryByRole("radiogroup", { name: "Engine starts thinking" })).not.toBeInTheDocument();
  });

  it("links the session's case once there is one", () => {
    const { unmount } = render(<Live />);
    expect(screen.queryByRole("link", { name: "Open the session's case" })).not.toBeInTheDocument();
    unmount();
    render(<Live withCase />);
    expect(screen.getByRole("link", { name: "Open the session's case" })).toHaveAttribute("href", CASE_LINK.href);
  });

  it("lists the reader's moves on Moves, in their order — each moved up or down, or deleted", async () => {
    const user = userEvent.setup();
    render(<Live withCase startTab="moves" />);
    const items = () => within(screen.getByRole("list", { name: "Your moves, best first" })).getAllByRole("listitem").map((item) => item.textContent);
    expect(items()).toEqual(["1.Nf3", "2.d4", "3.c4"]);
    // The first cannot go up, the last cannot go down.
    expect(screen.getByRole("button", { name: "Move Nf3 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move c4 down" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move d4 up" }));
    expect(items()).toEqual(["1.d4", "2.Nf3", "3.c4"]);
    await user.click(screen.getByRole("button", { name: "Move Nf3 down" }));
    expect(items()).toEqual(["1.d4", "2.c4", "3.Nf3"]);
    await user.click(screen.getByRole("button", { name: "Delete c4" }));
    expect(items()).toEqual(["1.d4", "2.Nf3"]);
    await expectNoAxeViolations();
  });

  it("shows a graded position: every line best first, the reader's moves marked — their rank, In place, the verdict — and theirs outside the lines", () => {
    render(<Live withCase shown="graded" startTab="moves" />);
    expect(screen.getByTestId("details-moves-label")).toHaveTextContent(LABEL);
    expect(screen.getByTestId("details-moves-headline")).toHaveTextContent("You found 2 of the top 2 — 0 in their place.");
    const lines = within(screen.getByRole("list", { name: "The engine's lines, best first, your moves marked" })).getAllByRole("listitem");
    expect(lines.map((line) => line.textContent)).toEqual([
      "1.Nf3+0.30 · −0Yours #2Best",
      "2.Bc4+0.20 · −10Yours #1Good",
      // The game's move, below the engine's lines, not the reader's.
      "3.Qh5GameThe move played in the game−1.50 · −180",
    ]);
    expect(within(screen.getByRole("list", { name: "Your moves not among the lines" })).getByRole("listitem")).toHaveTextContent("a3Yours #3Not among the lines");
    expect(screen.queryByRole("button", { name: /^Move |^Delete / })).not.toBeInTheDocument();
  });

  it("shows a checked position waiting for the engine, and says when there is no session", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Live withCase shown="waiting" startTab="moves" />);
    expect(screen.getByRole("list", { name: "Your moves, best first" })).toBeInTheDocument();
    expect(screen.getByTestId("details-moves-waiting")).toHaveTextContent("waiting for the engine's lines");
    expect(screen.queryByRole("button", { name: /^Move |^Delete / })).not.toBeInTheDocument();
    unmount();
    render(<Live startTab="settings" />);
    await user.click(screen.getByRole("tab", { name: "Your moves" }));
    expect(screen.getByTestId("details-moves-empty")).toHaveTextContent("Start a session to find its moves.");
  });

  it("shows a pass as put off for later — no line shown — and answers it now", async () => {
    const user = userEvent.setup();
    const onAnswerAgain = vi.fn();
    render(<Live withCase shown="passed" startTab="moves" onAnswerAgain={onAnswerAgain} />);
    expect(screen.getByTestId("details-moves-passed")).toHaveTextContent("Its lines stay hidden until you answer it.");
    expect(screen.queryByRole("list", { name: "The engine's lines, best first, your moves marked" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Answer it now" }));
    expect(onAnswerAgain).toHaveBeenCalled();
  });

  it("lists on Results every position answered or passed, and the one being answered — its score, passed, or answering — each a button back to it, the one on screen current", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<Live withCase startTab="results" onOpen={onOpen} />);
    const rows = within(screen.getByRole("list", { name: "The positions answered or passed" })).getAllByRole("button");
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Open 1. White — 2/2 · 2 in place — won Place in order: Queen, Best move: Rook, Clean candidates: Queen, Better than the game: Queen, See the line: Pawn",
      "Answer 1. Black now — passed",
      "Open 2. White — 2/2 · 0 in place — won Place in order: Rook, Best move: Bishop, Clean candidates: Queen, Better than the game: Rook, See the line: Pawn",
      "Open 3. White — Waiting for the engine",
      "Back to 4. White — answering now",
    ]);
    expect(rows[0]).toHaveTextContent("Perfect");
    // Five slots in the row's middle, a category each (CTA-249): the piece won, or a disabled pawn — none while waiting.
    const slots = (index: number) => [...screen.getByTestId(`details-result-${index}-pieces`).querySelectorAll("[data-piece]")].map((piece) => piece.getAttribute("data-piece"));
    expect(slots(0)).toEqual(["queen", "rook", "queen", "queen", "pawn"]);
    expect(slots(1)).toEqual(["none", "none", "none", "none", "none"]);
    expect(screen.queryByTestId("details-result-3-pieces")).not.toBeInTheDocument();
    expect(rows[2]).toHaveAttribute("aria-current", "true");
    await user.click(screen.getByRole("button", { name: "Answer 1. Black now — passed" }));
    expect(onOpen).toHaveBeenLastCalledWith(1);
    await user.click(rows[0]);
    expect(onOpen).toHaveBeenLastCalledWith(0);
    await expectNoAxeViolations();
  });

  it("says when no position is answered or passed yet", async () => {
    const user = userEvent.setup();
    render(<Live />);
    await user.click(screen.getByRole("tab", { name: "Results" }));
    expect(screen.getByTestId("details-results-empty")).toHaveTextContent("Start a session");
  });

  it("shows on Achievements the pieces the position won, one per category, each named for a screen reader (CTA-249)", async () => {
    const user = userEvent.setup();
    render(<Live withCase startTab="moves" />);
    await user.click(screen.getByRole("tab", { name: "Achievements" }));
    expect(screen.getByTestId("details-achievements-label")).toHaveTextContent(LABEL);
    const table = screen.getByRole("table", { name: "Achievements" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Category", "Pawn", "Knight", "Bishop", "Rook", "Queen"]);
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      expect.stringContaining("Place in order: Rook"),
      expect.stringContaining("Best move: Bishop"),
      expect.stringContaining("Clean candidates: Queen"),
      expect.stringContaining("Better than the game: Rook"),
      expect.stringContaining("See the line: Pawn"),
    ]);
    // A row: its category, then the five pieces — the one won marked, the others not.
    expect(screen.getByTestId("details-achievements-game")).toHaveAttribute("data-piece", "rook");
    expect(screen.getByTestId("details-achievements-game-rook")).toHaveAttribute("data-won", "true");
    expect(screen.getByTestId("details-achievements-game-rook")).toHaveTextContent("Won");
    expect(screen.getByTestId("details-achievements-game-queen")).toHaveAttribute("data-won", "false");
    expect(screen.getByTestId("details-achievements-game-queen")).toHaveTextContent("Not won");
    await expectNoAxeViolations();
  });

  it("says a category won no piece, and that a position not graded yet has none", () => {
    const { unmount } = render(<Live withCase startTab="achievements" pieces={NO_PIECES} />);
    expect(screen.getByTestId("details-achievements-order")).toHaveTextContent("Place in order: no piece");
    expect(screen.getByTestId("details-achievements-order").querySelectorAll('[data-won="true"]')).toHaveLength(0);
    unmount();
    render(<Live withCase startTab="achievements" pieces={null} />);
    expect(screen.getByTestId("details-achievements-none")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Achievements" })).not.toBeInTheDocument();
  });

  it("says there are no achievements before a session", () => {
    render(<Live startTab="achievements" />);
    expect(screen.getByTestId("details-achievements-empty")).toHaveTextContent("Start a session");
  });

  it("passes axe on a graded position", async () => {
    render(<Live withCase shown="graded" startTab="moves" />);
    await expectNoAxeViolations();
  });

  it("reads a name in another script in its own direction", () => {
    render(<Live title={HEBREW_TITLE} />);
    expect(screen.getByTestId("details-title")).toHaveAttribute("dir", "auto");
  });

  it("passes axe", async () => {
    render(<Live initial={false} withCase />);
    await expectNoAxeViolations();
  });
});
