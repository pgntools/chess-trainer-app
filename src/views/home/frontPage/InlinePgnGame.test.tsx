import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { boardOptions } from "../../board/boardTestHarness";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { InlinePgnGame, InlinePgnGame2colH, InlinePgnGame2colV } from "./InlinePgnGame";
import { mdxComponents } from ".";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const PGN = [
  '[White "Anderssen"]',
  "",
  "1. e4 { The king's pawn. } e5 2. Nf3 Nc6 (2... d6 { Philidor. } 3. d4) 3. Bb5! a6 4. Ba4 Nf6 *",
].join("\n");

const AFTER_NF3 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

const drop = (sourceSquare: string, targetSquare: string) => {
  let kept = false;
  act(() => {
    kept = boardOptions().onPieceDrop!({ sourceSquare, targetSquare });
  });
  return kept;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("<InlinePgnGame> (CTA-126)", () => {
  it("shows its window — opened at start — named by it, its side lines nested and its marks kept", () => {
    render(<InlinePgnGame pgn={PGN} from="1..." to="3" start="2" />);
    const group = screen.getByRole("group", { name: "The game, from 1... e5 to 3. Bb5" });
    expect(boardOptions().position).toBe(AFTER_NF3);
    expect(within(group).getByTestId(/-on-screen$/)).toHaveTextContent("2. Nf3");

    const moves = within(group).getByRole("group", { name: "The moves" });
    // 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5! — the window's moves, not 1. e4 e5 nor 3... a6.
    expect(within(moves).getAllByRole("button").map((move) => move.getAttribute("aria-label"))).toEqual([
      "2. Nf3",
      "2... Nc6",
      "2... d6",
      "3. d4",
      "3. Bb5",
    ]);
    expect(within(moves).getByRole("button", { name: "2. Nf3" })).toHaveAttribute("aria-current", "true");
    expect(within(moves).getByRole("button", { name: "3. Bb5" })).toHaveTextContent("Bb5!");
    expect(within(moves).getByTestId(/-variation$/)).toHaveTextContent("2...d63.d4");
    // The moves on: the game's (green) and the side line's.
    expect(boardOptions().arrows?.map((arrow) => arrow.endSquare)).toEqual(["c6", "d6"]);
  });

  it("steps only within the window — first, back, on, last — and into a side line by its move", async () => {
    const user = userEvent.setup();
    render(<InlinePgnGame pgn={PGN} from="1..." to="3" />);
    expect(screen.getByRole("button", { name: "One move back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "To the first move shown" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "One move on" }));
    await user.click(screen.getByRole("button", { name: "2... d6" }));
    expect(screen.getByRole("button", { name: "2... d6" })).toHaveAttribute("aria-current", "true");
    await user.click(screen.getByRole("button", { name: "One move on" }));
    expect(screen.getByRole("button", { name: "3. d4" })).toHaveAttribute("aria-current", "true");
    // The side line's end.
    expect(screen.getByRole("button", { name: "One move on" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "To the last move shown" }));
    expect(screen.getByRole("button", { name: "3. Bb5" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "One move on" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "To the first move shown" }));
    expect(screen.getByTestId(/-on-screen$/)).toHaveTextContent("1... e5");
  });

  it("takes a dropped move the window holds — the game's or a side line's — and refuses any other", () => {
    render(<InlinePgnGame pgn={PGN} from="2" to="3" />);
    expect(drop("g8", "f6")).toBe(false);
    expect(drop("d7", "d6")).toBe(true);
    expect(screen.getByRole("button", { name: "2... d6" })).toHaveAttribute("aria-current", "true");
  });

  it("opens inside a side line on a line of moves, and shows the move's comment when asked", () => {
    render(<InlinePgnGame pgn={PGN} start="2... d6" comments />);
    expect(screen.getByRole("button", { name: "2... d6" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId(/-comment$/)).toHaveTextContent("Philidor.");
  });

  it("leaves the side lines out with variations={false}, and faces Black when asked", () => {
    render(<InlinePgnGame pgn={PGN} variations={false} orientation="black" caption="The Ruy Lopez" />);
    expect(screen.getByRole("group", { name: "The Ruy Lopez" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2... d6" })).not.toBeInTheDocument();
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("gives each board on the page its own id, so one game can be shown many times", () => {
    render(
      <>
        <InlinePgnGame pgn={PGN} to="2" />
        <InlinePgnGame pgn={PGN} from="2" />
      </>,
    );
    const ids = screen.getAllByTestId("board").map((board) => board.getAttribute("data-board-id"));
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("says a PGN that will not read does not read", () => {
    render(<InlinePgnGame pgn="1. e4 e5 2. Ke4 *" />);
    expect(screen.getByText("This game's PGN does not read.")).toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });

  describe("a PGN's drawn shapes — [%cal] arrows, [%csl] circles", () => {
    const DRAWN = [
      '[Event "First"]',
      "",
      "{ The start. } { [%csl Gd4][%cal Ge2e4,Rd2d4] } 1. e4 { Now Black. [%cal Ge7e5,Bc7c5] [%csl Rf7] } e5 2. Nf3 *",
      "",
      '[Event "Second"]',
      "",
      "1. d4 { [%csl Yd4] } d5 *",
    ].join("\n");

    it("draws a position's arrows in their brushes in place of the next-move arrows, and its circles on their squares", () => {
      render(<InlinePgnGame pgn={DRAWN} comments />);
      // At the start: the opening comment's drawing — lichess's green and red brushes.
      expect(boardOptions().arrows).toEqual([
        { startSquare: "e2", endSquare: "e4", color: "#15781B" },
        { startSquare: "d2", endSquare: "d4", color: "#882020" },
      ]);
      const circles = screen.getByTestId(/-circles$/).querySelectorAll("circle");
      expect([...circles].map((circle) => circle.getAttribute("data-square"))).toEqual(["d4"]);
      // d4, for White: file 3, rank 3 from the bottom — x 3.5, y 4.5.
      expect([circles[0].getAttribute("cx"), circles[0].getAttribute("cy")]).toEqual(["3.5", "4.5"]);
      // The words, without the commands.
      expect(screen.getByTestId(/-comment$/)).toHaveTextContent(/^The start\.$/);
    });

    it("draws each position's own, and turns its circles with the board", async () => {
      const user = userEvent.setup();
      render(<InlinePgnGame pgn={DRAWN} orientation="black" />);
      await user.click(screen.getByRole("button", { name: "1. e4" }));
      expect(boardOptions().arrows?.map((arrow) => `${arrow.startSquare}${arrow.endSquare}`)).toEqual(["e7e5", "c7c5"]);
      const circle = screen.getByTestId(/-circles$/).querySelector("circle")!;
      // f7, from Black's side: x 7 - 5 + .5, y 6 + .5.
      expect([circle.getAttribute("cx"), circle.getAttribute("cy")]).toEqual(["2.5", "6.5"]);
      // A position with no drawing has its next-move arrows back.
      await user.click(screen.getByRole("button", { name: "1... e5" }));
      expect(boardOptions().arrows?.map((arrow) => arrow.endSquare)).toEqual(["f3"]);
      expect(screen.queryByTestId(/-circles$/)).not.toBeInTheDocument();
    });

    it("leaves the drawings off with shapes={false}", () => {
      render(<InlinePgnGame pgn={DRAWN} shapes={false} />);
      expect(boardOptions().arrows?.map((arrow) => arrow.endSquare)).toEqual(["e4"]);
      expect(screen.queryByTestId(/-circles$/)).not.toBeInTheDocument();
    });

    it("shows the game of a PGN that game picks", () => {
      render(<InlinePgnGame pgn={DRAWN} game={2} />);
      expect(screen.getByRole("button", { name: "1. d4" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "1. e4" })).not.toBeInTheDocument();
    });

    it("reads only the game it shows, and says when there is no such game", () => {
      render(<InlinePgnGame pgn={`${DRAWN}\n\n[Event "Broken"]\n\n1. e4 e5 2. Ke4 *`} game="2" />);
      expect(screen.getByRole("button", { name: "1. d4" })).toBeInTheDocument();
    });

    it("says there is no such game when game is past the file's last", () => {
      render(<InlinePgnGame pgn={DRAWN} game={9} />);
      expect(screen.getByText("This game's PGN does not read.")).toBeInTheDocument();
    });
  });

  it("draws no next-move arrows with showNextMoveArrow={false}, but still a PGN's own drawing", async () => {
    const user = userEvent.setup();
    render(<InlinePgnGame pgn={"1. e4 { [%cal Ge7e5] } e5 2. Nf3 *"} showNextMoveArrow={false} />);
    expect(boardOptions().arrows).toEqual([]);
    expect(screen.getByRole("button", { name: "1. e4" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "1. e4" }));
    expect(boardOptions().arrows?.map((arrow) => arrow.endSquare)).toEqual(["e5"]);
  });

  it("passes axe", async () => {
    render(<InlinePgnGame pgn={PGN} start="2" comments />);
    await expectNoAxeViolations();
  });
});

describe("<InlinePgnGame2colH> (CTA-146)", () => {
  const movesOf = () => screen.getByRole("group", { name: "The moves" });
  /** The grid's cells in reading order: a pair's number, White, Black — `·` where a cell is empty — and a side line's run as `(…)`. */
  const cellsOf = (region: HTMLElement) =>
    [...region.children].map((child) => {
      if (child.getAttribute("data-testid")?.endsWith("-variation")) return `(${child.textContent})`;
      return child.tagName === "BUTTON" ? (child.getAttribute("aria-label") ?? "") : child.textContent || "·";
    });

  it("lays the window's moves out as numbered pairs — number, White, Black — each side line a run under its pair", () => {
    render(<InlinePgnGame2colH pgn={PGN} from="1..." to="3" />);
    expect(movesOf()).toHaveAttribute("data-layout", "columns");
    expect(movesOf()).toHaveStyle({ display: "grid" });
    // 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 — the window's, with the Black cell of 3 empty.
    expect(cellsOf(movesOf())).toEqual(["2.", "2. Nf3", "2... Nc6", "(2...d63.d4)", "3.", "3. Bb5", "·"]);
    // jsdom does not read `grid-column`: it is in the stylesheet the run's class carries.
    expect(within(movesOf()).getByTestId(/-variation$/).getAttribute("class")).toBeTruthy();
    expect(document.head.textContent).toContain("grid-column:1/-1");
  });

  it("opens a window on Black's move with an empty White cell", () => {
    render(<InlinePgnGame2colH pgn={PGN} from="2" to="3..." />);
    expect(cellsOf(movesOf()).slice(0, 4)).toEqual(["2.", "·", "2... Nc6", "(2...d63.d4)"]);
  });

  it("steps, drops and shows comments as <InlinePgnGame> does, the current move marked", async () => {
    const user = userEvent.setup();
    render(<InlinePgnGame2colH pgn={PGN} comments />);
    await user.click(screen.getByRole("button", { name: "1. e4" }));
    expect(screen.getByRole("button", { name: "1. e4" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId(/-comment$/)).toHaveTextContent("The king's pawn.");
    await user.click(screen.getByRole("button", { name: "2... d6" }));
    expect(screen.getByTestId(/-comment$/)).toHaveTextContent("Philidor.");
    expect(drop("d4", "d5")).toBe(false);
    await user.click(screen.getByRole("button", { name: "One move on" }));
    expect(screen.getByRole("button", { name: "3. d4" })).toHaveAttribute("aria-current", "true");
  });

  it("leaves the side lines out with variations={false}", () => {
    render(<InlinePgnGame2colH pgn={PGN} variations={false} />);
    expect(screen.queryByTestId(/-variation$/)).not.toBeInTheDocument();
    expect(cellsOf(movesOf()).slice(-3)).toEqual(["4.", "4. Ba4", "4... Nf6"]);
  });

  it("caps the list at the board's height — the board's column, or the container where narrower — and scrolls it", () => {
    render(<InlinePgnGame2colH pgn={PGN} />);
    expect(movesOf().getAttribute("class")).toBeTruthy();
    const style = getComputedStyle(movesOf());
    expect(style.overflowY).toBe("auto");
    // jsdom drops a `min()` it cannot parse, so the cap is read off the stylesheet the list's class carries.
    const rules = document.head.textContent ?? "";
    // Stacked, the board is the container's width; from `sm` up, its 320 px column at most.
    expect(rules).toContain("max-height:100cqw");
    expect(rules).toContain("max-height:min(320px, 100cqw)");
    expect(rules).toContain("container-type:inline-size");
  });

  it("stands its list beside the board from `sm` up", () => {
    render(<InlinePgnGame2colH pgn={PGN} />);
    expect(movesOf()).toHaveAttribute("data-placement", "beside");
    expect(document.head.textContent).toContain("grid-template-columns:minmax(0, 320px) minmax(0, 1fr)");
  });

  it("is what an article's older <InlinePgnGameColumns> renders", () => {
    expect(mdxComponents.InlinePgnGameColumns).toBe(InlinePgnGame2colH);
  });

  it("keeps the move on screen in view inside the list's own box", async () => {
    const user = userEvent.setup();
    render(<InlinePgnGame2colH pgn={PGN} />);
    const region = movesOf();
    // jsdom has no layout: the box is 100 px, the move below it.
    region.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;
    const target = screen.getByRole("button", { name: "4... Nf6" });
    target.getBoundingClientRect = () => ({ top: 160, bottom: 184 }) as DOMRect;
    await user.click(target);
    expect(region.scrollTop).toBe(84);
    // Back at the game's start, no move is current: the list is back at its top.
    await user.click(screen.getByRole("button", { name: "To the first move shown" }));
    expect(region.scrollTop).toBe(0);
  });

  it("leaves <InlinePgnGame>'s moves as ever — a wrapping run, no scroll box", () => {
    render(<InlinePgnGame pgn={PGN} />);
    expect(movesOf()).not.toHaveAttribute("data-layout");
    expect(movesOf()).toHaveStyle({ display: "flex" });
    expect(getComputedStyle(movesOf()).overflowY).not.toBe("auto");
  });

  it("pins every SAN cell to LTR under Hebrew, as the board stays", async () => {
    await act(() => i18n.changeLanguage("he"));
    try {
      render(
        <AppThemeWithLang>
          <InlinePgnGame2colH pgn={PGN} from="1..." to="3" />
        </AppThemeWithLang>,
      );
      const region = screen.getByRole("group", { name: "המהלכים" });
      const cells = within(region).getAllByRole("button");
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) expect(cell).toHaveAttribute("dir", "ltr");
      expect(screen.getByTestId("board").closest('[dir="ltr"]')).not.toBeNull();
    } finally {
      await act(() => i18n.changeLanguage("en"));
    }
  });

  it("passes axe", async () => {
    render(<InlinePgnGame2colH pgn={PGN} start="2" comments />);
    await expectNoAxeViolations();
  });
});

describe("<InlinePgnGame2colV>", () => {
  const movesOf = () => screen.getByRole("group", { name: "The moves" });

  it("lays the moves out in the same numbered pairs, under the board", () => {
    render(<InlinePgnGame2colV pgn={PGN} from="1..." to="3" />);
    expect(movesOf()).toHaveAttribute("data-layout", "columns");
    expect(movesOf()).toHaveAttribute("data-placement", "below");
    expect(within(movesOf()).getByRole("button", { name: "2. Nf3" })).toBeInTheDocument();
    // The board first, the moves after it — one column at every width, as wide as the board's
    // (the stylesheet keeps every test's rules, so the one column is read by its own declaration).
    const board = screen.getByTestId("board");
    expect(board.compareDocumentPosition(movesOf()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const rules = document.head.textContent ?? "";
    expect(rules).toContain("grid-template-columns:minmax(0, 320px);");
  });

  it("caps the list at half the board's side, and scrolls it", () => {
    render(<InlinePgnGame2colV pgn={PGN} />);
    expect(getComputedStyle(movesOf()).overflowY).toBe("auto");
    const rules = document.head.textContent ?? "";
    expect(rules).toContain("max-height:min(160px, 50cqw)");
    expect(rules).toContain("container-type:inline-size");
  });

  it("steps as the others do, the current move marked", async () => {
    const user = userEvent.setup();
    render(<InlinePgnGame2colV pgn={PGN} />);
    await user.click(screen.getByRole("button", { name: "One move on" }));
    expect(screen.getByRole("button", { name: "1. e4" })).toHaveAttribute("aria-current", "true");
  });

  it("passes axe", async () => {
    render(<InlinePgnGame2colV pgn={PGN} start="2" comments />);
    await expectNoAxeViolations();
  });
});
