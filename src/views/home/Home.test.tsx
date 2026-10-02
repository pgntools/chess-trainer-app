import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { createPageTitleStore, PageTitleContext, type PageTitleStore } from "../main/pageTitle";
import Home from "./Home";

// The demo boards and the embed draw real boards: stubbed, as every board screen's are (chessboard.md §8).
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

const renderHome = (store?: PageTitleStore) =>
  render(
    <PageTitleContext.Provider value={store ?? null}>
      <AppThemeWithLang>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AppThemeWithLang>
    </PageTitleContext.Provider>,
  );

/** The nav cards' links — the landing page as it was before CTA-126. */
const cardLinks = () => within(screen.getByTestId("home-nav-cards")).getAllByRole("link");

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** Every embed on the English page has read what it shows. */
const settled = async () => {
  for (const id of [
    "home-game-library-fischer-50",
    "home-game-library-fischer-908",
    "home-game-library-capablanca-442",
    "home-repertoire-sample-e4-white",
    "home-repertoire-sample-caro-kann-black",
    "home-game-library-fischer-52",
  ]) {
    await screen.findByTestId(id);
  }
};

describe("the front page — an MDX document (CTA-126)", () => {
  it("renders the English document: its one h1, its sections, and declares the h1 its own", async () => {
    const store = createPageTitleStore();
    renderHome(store);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Get started" })).toBeInTheDocument();
    for (const name of ["Try a board", "Repertoires", "A collection", "Every screen"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    // The shell's hidden h1 steps aside (CTA-112).
    expect(store.getOwnHeadings()).toBe(1);
    // A Markdown link to a path of the app is a router link.
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
    await settled();
  });

  it("renders the Hebrew document under Hebrew", async () => {
    await i18n.changeLanguage("he");
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "בואו נתחיל" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "כל המסכים" })).toBeInTheDocument();
    await settled();
  });

  it("lays its embeds out in rows — three games, two repertoires, one collection — each board with its own id", async () => {
    renderHome();
    await settled();
    const rows = screen.getAllByTestId("home-board-row");
    expect(rows.map((row) => within(row).getAllByTestId("board").length)).toEqual([3, 2, 1]);

    const ids = screen.getAllByTestId("board").map((board) => board.getAttribute("data-board-id"));
    expect(ids).toEqual([
      "front-page-game-library-fischer-50",
      "front-page-game-library-fischer-908",
      "front-page-game-library-capablanca-442",
      "front-page-repertoire-sample-e4-white",
      "front-page-repertoire-sample-caro-kann-black",
      "front-page-game-library-fischer-52",
    ]);
    // The Game of the Century, just before 17... Be6.
    expect(screen.getByTestId("home-game-library-fischer-50-players")).toHaveTextContent("Fischer, R.");
    expect(within(screen.getByTestId("home-game-library-fischer-50")).getByRole("button", { name: "Be6" })).toBeInTheDocument();
    // The placeholder repertoires are on no device: their samples stand in.
    expect(screen.getAllByText("A sample repertoire that comes with the app")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Fischer" })).toBeInTheDocument();
  });
});

describe("the front page's nav cards — the landing page as it was", () => {
  it("shows one Openings card, linking to the explorer itself", () => {
    renderHome();

    // The single entry — the same one the sidebar shows, under the same name.
    // Nothing on the explorer is saved, so the folder's destination is the
    // board, not a saved list (CTA-78).
    const openings = within(screen.getByTestId("home-nav-cards")).getAllByRole("link", { name: "Openings" });
    expect(openings).toHaveLength(1);
    expect(openings[0]).toHaveAttribute("href", "/openings");
    expect(cardLinks().map((link) => link.getAttribute("href"))).not.toContain("/openings/saved");
  });

  it("shows one Analysis Board card linking to the saved list, and none to the board", () => {
    renderHome();

    // The single entry — the same one the sidebar shows, under the same name
    // (CTA-58, mirroring CTA-42's Openings folder).
    const analysis = within(screen.getByTestId("home-nav-cards")).getAllByRole("link", { name: "Analysis Board" });
    expect(analysis).toHaveLength(1);
    expect(analysis[0]).toHaveAttribute("href", "/tools/analysis/saved");

    // The board view has no card: it is the saved list's New button.
    expect(cardLinks().map((link) => link.getAttribute("href"))).not.toContain("/tools/analysis");
  });

  it("still shows a card per screen of every other section, each under a section heading", () => {
    renderHome();

    // One card per screen node in the tree — the Library's among them.
    const cards = cardLinks().map((link) => link.getAttribute("href"));
    // The engine's Lobby, not Play with Engine: that screen is the Lobby's
    // Start button (CTA-82), and has no card.
    expect(cards).toContain("/engine/games");
    expect(cards).not.toContain("/engine/play");
    expect(cards).toContain("/library");
    // Under the document's "Every screen", the sections are h3s.
    expect(within(screen.getByTestId("home-nav-cards")).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(1);
  });
});

describe("the front page — accessible (CTA-113, CTA-126)", () => {
  it("passes axe, and its cards are reached in order from the keyboard", async () => {
    const user = userEvent.setup();
    renderHome();
    await settled();
    await expectNoAxeViolations(document.body);
    const cards = cardLinks();
    cards[0].focus();
    await user.tab();
    expect(document.activeElement).toBe(cards[1]);
  });
});
