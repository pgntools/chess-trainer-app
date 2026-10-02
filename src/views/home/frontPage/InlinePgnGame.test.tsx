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

  it("passes axe", async () => {
    render(<InlinePgnGame pgn={PGN} start="2" comments />);
    await expectNoAxeViolations();
  });
});
