import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CollectionCard } from "./CollectionCard";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const renderCard = (props: Parameters<typeof CollectionCard>[0]) =>
  render(
    <MemoryRouter>
      <CollectionCard {...props} />
    </MemoryRouter>,
  );

const tableRows = () =>
  within(screen.getByRole("table", { name: "Games of Capablanca" }))
    .getAllByRole("row")
    .slice(1);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("<CollectionCard> (CTA-126)", () => {
  it("shows the collection, its shown game on a board, and the page of its games that holds it", async () => {
    renderCard({ _id: "/library/capablanca", showGame: "442", rows: "5" });

    const card = await screen.findByRole("region", { name: "Capablanca" });
    expect(within(card).getByText("1,035 games")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Open the collection" })).toHaveAttribute("href", "/library/capablanca");

    // Games 441–445: the page that holds 442, marked as the one shown.
    expect(tableRows().map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
      "441",
      "442",
      "443",
      "444",
      "445",
    ]);
    expect(within(tableRows()[1]).getByText("442")).toHaveAttribute("aria-current", "true");
    expect(await screen.findByTestId("home-game-library-capablanca-442-players")).toHaveTextContent(
      "Capablanca, Jose – Marshall, Frank",
    );
  });

  it("puts a clicked game on the board, and pages through the games", async () => {
    const user = userEvent.setup();
    renderCard({ _id: "/library/capablanca", rows: "4" });
    await screen.findByTestId("home-game-library-capablanca-1-players");
    expect(screen.getByRole("button", { name: "Earlier games" })).toBeDisabled();
    expect(screen.getByText("1–4 / 1,035")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Later games" }));
    expect(screen.getByText("5–8 / 1,035")).toBeInTheDocument();
    await user.click(tableRows()[1]);
    expect(await screen.findByTestId("home-game-library-capablanca-6-players")).toBeInTheDocument();
    expect(within(tableRows()[1]).getByText("6")).toHaveAttribute("aria-current", "true");
  });

  it("passes axe", async () => {
    renderCard({ _id: "/library/capablanca", showGame: 3 });
    await screen.findByTestId("home-game-library-capablanca-3-players");
    await expectNoAxeViolations();
  });

  it.each(["/library/not-a-collection", "/library", "/repertoires/x"])(
    "says an address that names no collection, %s, names nothing",
    async (address) => {
      renderCard({ _id: address });
      expect(await screen.findByText("The collection this page embeds is not here.")).toBeInTheDocument();
    },
  );
});
