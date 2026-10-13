import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";

import i18n from "../../../i18n";
import { addAnalysisCases, analysisCasesSnapshot } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { parsePgnTree } from "../../../lib/pgn";
import { boardOptions } from "../../board/boardTestHarness";
import { StoredGameEmbed } from "./StoredGameEmbed";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

const renderEmbed = (reference: string, startMove?: string) =>
  render(
    <MemoryRouter>
      <StoredGameEmbed reference={reference} startMove={startMove} />
      <Where />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the front page's stored-game embed (CTA-126)", () => {
  it("reads a Library game, and shows it to step through", async () => {
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

  it("hands a Library game to Analysis as a new Case (CTA-192)", async () => {
    const user = userEvent.setup();
    renderEmbed("library/capablanca/1");
    await user.click(await screen.findByRole("button", { name: "Open in Analysis" }));
    const picker = await screen.findByRole("dialog", { name: "Open in Analysis" });
    expect(within(picker).getByRole("textbox", { name: "The new project's name" })).toHaveValue("Games from articles");
    await user.click(within(picker).getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/analysis\/projects\/[^/]+\/cases\/[^/]+$/));
    expect(analysisCasesSnapshot()?.[0].pgn).toContain("Capablanca, Jose");
  });

  it("reads an Analysis case by its reference, and opens the Case itself (CTA-192)", async () => {
    await addAnalysisCases([gameCaseOf({ id: "c1", projectId: "p1", name: "" }, parsePgnTree('[White "Kim"]\n[Black "Lee"]\n\n1. e4 e5 *'))]);
    renderEmbed("case/p1/c1");
    expect(await screen.findByTestId("home-game-case-p1-c1-players")).toHaveTextContent("Kim – Lee");
    expect(screen.getByRole("link", { name: "Open in Analysis" })).toHaveAttribute("href", "/analysis/projects/p1/cases/c1");
  });

  it.each([
    ["a Library game that is not there", "library/capablanca/99999"],
    ["a Case the reader does not have", "case/p1/nope"],
    ["an unknown store", "nowhere/at/all"],
  ])("says so, in place of a board, for %s", async (_, reference) => {
    renderEmbed(reference);
    expect(await screen.findByText("The game this page embeds is not here.")).toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });
});
