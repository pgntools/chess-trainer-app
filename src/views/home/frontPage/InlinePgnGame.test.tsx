import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { boardOptions } from "../../board/boardTestHarness";
import { InlinePgnGame } from "./InlinePgnGame";

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

  it("passes axe", async () => {
    render(<InlinePgnGame pgn={PGN} start="2" comments />);
    await expectNoAxeViolations();
  });
});
