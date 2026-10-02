import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { demoTreeOfGameTree, type DemoNode } from "../../lib/demoTree";
import { parsePgnTree } from "../../lib/pgn";
import { expectNoAxeViolations } from "../../test/axe";
import { stubReducedMotion } from "../../test/reducedMotion";
import { boardOptions } from "../board/boardTestHarness";
import DemoBoard from "./DemoBoard";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** A repertoire-like tree: 1. e4 answered by e5 (50%), c5 (30%) or e6 (20%). */
const repertoire = () =>
  demoTreeOfGameTree(parsePgnTree("1. e4 e5 (1... c5 { prc:30 } 2. Nf3) (1... e6 { prc:20 } 2. d4) 2. Nf3 *"));

const renderBoard = (root: DemoNode, extra: { startFen?: string } = {}) =>
  render(<DemoBoard boardId="demo-test-board" testId="demo" label="Sample board" root={root} {...extra} />);

const drop = (sourceSquare: string, targetSquare: string | null) => {
  let kept = false;
  act(() => {
    kept = boardOptions().onPieceDrop!({ sourceSquare, targetSquare });
  });
  return kept;
};

const arrowCount = () => screen.getByTestId("demo-arrows").querySelectorAll("path").length;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the demo board (CTA-126)", () => {
  it("is a named group whose board has its own id, starts at the start, and runs left to right", () => {
    renderBoard(repertoire());
    expect(screen.getByRole("group", { name: "Sample board" })).toBeInTheDocument();
    expect(boardOptions().id).toBe("demo-test-board");
    expect(boardOptions().position).toBe(START);
    expect(boardOptions().boardOrientation).toBe("white");
    // Pinned LTR: the board sits in `ForceLTR`'s own `dir="ltr"` box.
    expect(screen.getByTestId("board").closest("[dir]")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("demo-line")).toHaveTextContent("Play a move");
  });

  it("takes a dropped continuation, draws the next position's arrows, and refuses any other move", () => {
    renderBoard(repertoire());
    expect(arrowCount()).toBe(1);
    // A lone continuation carries no share.
    expect(screen.getByRole("list", { name: "Moves from here" }).textContent).toBe("e4");

    expect(drop("d2", "d4")).toBe(false);
    expect(drop("e2", null)).toBe(false);
    expect(boardOptions().position).toBe(START);

    expect(drop("e2", "e4")).toBe(true);
    expect(screen.getByTestId("demo-line")).toHaveTextContent("1. e4");
    // Three replies, three arrows, each with its play chance.
    expect(arrowCount()).toBe(3);
    const moves = screen.getByRole("list", { name: "Moves from here" });
    expect(moves).toHaveTextContent("e550%c530%e620%");
  });

  it("plays a move from the list, steps back, forward along the mainline, and back to the start", async () => {
    const user = userEvent.setup();
    renderBoard(repertoire());

    await user.click(screen.getByRole("button", { name: "Next move" }));
    await user.click(screen.getByRole("button", { name: "c5" }));
    expect(screen.getByTestId("demo-line")).toHaveTextContent("1. e4 c5");

    await user.click(screen.getByRole("button", { name: "Take back a move" }));
    expect(screen.getByTestId("demo-line")).toHaveTextContent("1. e4");
    await user.click(screen.getByRole("button", { name: "Next move" }));
    await user.click(screen.getByRole("button", { name: "Next move" }));
    expect(screen.getByTestId("demo-line")).toHaveTextContent("1. e4 e5 2. Nf3");
    expect(screen.getByTestId("demo-end")).toHaveTextContent("The line ends here");
    expect(screen.getByRole("button", { name: "Next move" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Back to the start" }));
    expect(boardOptions().position).toBe(START);
    expect(screen.getByRole("button", { name: "Back to the start" })).toBeDisabled();
  });

  it("flips the board", async () => {
    const user = userEvent.setup();
    renderBoard(repertoire());
    await user.click(screen.getByRole("button", { name: "Flip the board" }));
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("lets only the side to move drag", () => {
    renderBoard(repertoire());
    const canDrag = (boardOptions() as { canDragPiece: (args: { piece: { pieceType: string } }) => boolean })
      .canDragPiece;
    expect(canDrag({ piece: { pieceType: "wP" } })).toBe(true);
    expect(canDrag({ piece: { pieceType: "bP" } })).toBe(false);
  });

  it("asks which piece when the tree promotes more than one way, and plays the one picked", async () => {
    const user = userEvent.setup();
    const fen = "8/4P3/8/8/8/8/k7/4K3 w - - 0 50";
    const root = demoTreeOfGameTree(parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n50. e8=Q (50. e8=N) *`));
    renderBoard(root, { startFen: fen });

    expect(drop("e7", "e8")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Knight" }));
    expect(screen.queryByTestId("promotion-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("demo-line")).toHaveTextContent("50. e8=N");
  });

  it("opens where it is told — after a line, facing a side — and goes back to the tree's own start", async () => {
    const user = userEvent.setup();
    render(
      <DemoBoard
        boardId="demo-test-board"
        testId="demo"
        label="Sample board"
        root={repertoire()}
        initialLine={["e4", "c5"]}
        initialOrientation="black"
      />,
    );
    expect(screen.getByTestId("demo-line")).toHaveTextContent("1. e4 c5");
    expect(boardOptions().boardOrientation).toBe("black");
    expect(screen.getByRole("button", { name: "Nf3" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to the start" }));
    expect(boardOptions().position).toBe(START);
  });

  it("turns the pieces' animation off for a reader who asks for reduced motion", () => {
    stubReducedMotion();
    renderBoard(repertoire());
    expect(boardOptions().showAnimations).toBe(false);
  });

  it("passes axe", async () => {
    renderBoard(repertoire());
    drop("e2", "e4");
    await expectNoAxeViolations();
  });
});
