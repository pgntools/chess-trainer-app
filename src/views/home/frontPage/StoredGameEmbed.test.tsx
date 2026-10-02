import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { boardOptions } from "../../board/boardTestHarness";
import { StoredGameEmbed } from "./StoredGameEmbed";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const renderEmbed = (reference: string, startMove?: string) =>
  render(
    <MemoryRouter>
      <StoredGameEmbed reference={reference} startMove={startMove} />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the front page's stored-game embed (CTA-126)", () => {
  it("reads a Library game as the Analysis Board does, and shows it to step through", async () => {
    const user = userEvent.setup();
    renderEmbed("library/capablanca/1");

    expect(await screen.findByTestId("home-game-library-capablanca-1-players")).toHaveTextContent(
      "Capablanca, Jose – Eschevarria, C. 1-0",
    );
    expect(screen.getByText("Havana, 1901")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Capablanca, Jose – Eschevarria, C. — game board" })).toBeInTheDocument();
    expect(boardOptions().id).toBe("front-page-game-library-capablanca-1");

    await user.click(screen.getByRole("button", { name: "Next move" }));
    await user.click(screen.getByRole("button", { name: "e5" }));
    expect(screen.getByTestId("home-game-library-capablanca-1-board-line")).toHaveTextContent("1. e4 e5");
  });

  it("opens at its startMove", async () => {
    renderEmbed("library/capablanca/1", "2...");
    expect(await screen.findByTestId("home-game-library-capablanca-1-board-line")).toHaveTextContent(
      "1. e4 e5 2. Nf3 Nc6",
    );
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
    expect(await screen.findByText("The game this page embeds is not here.")).toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });
});
