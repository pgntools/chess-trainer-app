import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { boardOptions } from "../../board/boardTestHarness";
import { CollectionGameBoard } from "./CollectionGameBoard";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const renderBoard = (game: string, startMove?: string) =>
  render(
    <MemoryRouter>
      <CollectionGameBoard game={game} startMove={startMove} />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("<CollectionGameBoard> (CTA-126)", () => {
  it("shows the Library game at its address, opened at startMove", async () => {
    renderBoard("/library/capablanca/442", "8");
    expect(await screen.findByTestId("home-game-library-capablanca-442-players")).toHaveTextContent(
      "Capablanca, Jose – Marshall, Frank 1-0",
    );
    expect(screen.getByTestId("home-game-library-capablanca-442-board-line")).toHaveTextContent(
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3",
    );
    // The board's arrow is Marshall's gambit, 8... d5.
    expect(screen.getByRole("button", { name: "d5" })).toBeInTheDocument();
    expect(boardOptions().id).toBe("front-page-game-library-capablanca-442");
  });

  it("passes showNextMoveArrow={false} on to its board", async () => {
    render(
      <MemoryRouter>
        <CollectionGameBoard game="/library/capablanca/442" startMove="8" showNextMoveArrow={false} />
      </MemoryRouter>,
    );
    await screen.findByTestId("home-game-library-capablanca-442-players");
    expect(screen.queryByTestId("home-game-library-capablanca-442-board-arrows")).not.toBeInTheDocument();
    // The move is still there to play.
    expect(screen.getByRole("button", { name: "d5" })).toBeInTheDocument();
  });

  it.each(["/library/capablanca", "/repertoires/x/1", "/library/capablanca/0"])(
    "says an address that is no game's, %s, names nothing",
    async (game) => {
      renderBoard(game);
      expect(await screen.findByText("The game this page embeds is not here.")).toBeInTheDocument();
      expect(screen.getByText(game)).toBeInTheDocument();
    },
  );
});
