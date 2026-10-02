import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { libraryGameReference } from "../../../lib/gameReference";
import { boardOptions } from "../../board/boardTestHarness";
import { EXAMPLE_GAME_REFERENCE } from "../content/placeholders";
import { StoredGameEmbed } from "./StoredGameEmbed";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const renderEmbed = (reference: string) =>
  render(
    <MemoryRouter>
      <StoredGameEmbed reference={reference} />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the front page's stored-game embed (CTA-126)", () => {
  it("the placeholder names a shipped Library game", () => {
    expect(EXAMPLE_GAME_REFERENCE).toBe(libraryGameReference("capablanca", 1));
  });

  it("reads a Library game as the Analysis Board does, and shows it to step through", async () => {
    const user = userEvent.setup();
    renderEmbed("library/capablanca/1");

    expect(await screen.findByTestId("home-stored-game-players")).toHaveTextContent(
      "Capablanca, Jose – Eschevarria, C. 1-0",
    );
    expect(screen.getByText("Havana, 1901")).toBeInTheDocument();
    const board = screen.getByRole("group", { name: "Capablanca, Jose – Eschevarria, C. — game board" });
    expect(board).toBeInTheDocument();
    expect(boardOptions().id).toBe("front-page-embed-library-capablanca-1");

    await user.click(screen.getByRole("button", { name: "Next move" }));
    await user.click(screen.getByRole("button", { name: "e5" }));
    expect(screen.getByTestId("home-stored-game-board-line")).toHaveTextContent("1. e4 e5");
  });

  it("opens the same reference on the Analysis Board", async () => {
    renderEmbed("library/capablanca/1");
    expect(await screen.findByRole("link", { name: "Open on the Analysis Board" })).toHaveAttribute(
      "href",
      "/tools/analysis?game=library%2Fcapablanca%2F1",
    );
  });

  it.each([
    ["a Library game that is not there", "library/capablanca/99999"],
    ["a saved analysis the reader does not have", "analysis/saved/nope"],
    ["an unknown store", "nowhere/at/all"],
  ])("says so, in place of a board, for %s", async (_, reference) => {
    renderEmbed(reference);
    expect(await screen.findByTestId("home-stored-game-missing")).toHaveTextContent(
      "The game this page embeds is not here.",
    );
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });
});
