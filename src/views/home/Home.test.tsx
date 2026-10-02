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

describe("the front page — an MDX document (CTA-126)", () => {
  it("renders the English document: its one h1, its sections, and declares the h1 its own", async () => {
    const store = createPageTitleStore();
    renderHome(store);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Get started" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Try a board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Every screen" })).toBeInTheDocument();
    // The shell's hidden h1 steps aside (CTA-112).
    expect(store.getOwnHeadings()).toBe(1);
    // A Markdown link to a path of the app is a router link.
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
    await screen.findByTestId("home-stored-game");
  });

  it("renders the Hebrew document under Hebrew", async () => {
    await i18n.changeLanguage("he");
    renderHome();
    expect(screen.getByRole("heading", { level: 1, name: "בואו נתחיל" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "כל המסכים" })).toBeInTheDocument();
    await screen.findByTestId("home-stored-game");
  });

  it("embeds the three demo boards and the stored game, each board with its own id", async () => {
    renderHome();
    expect(screen.getByRole("group", { name: "Sample game board" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sample repertoire board" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sample collection board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "A repertoire" })).toBeInTheDocument();

    await screen.findByTestId("home-stored-game");
    const ids = screen.getAllByTestId("board").map((board) => board.getAttribute("data-board-id"));
    expect(ids).toEqual([
      "front-page-sample-game",
      "front-page-sample-repertoire",
      "front-page-sample-collection",
      "front-page-embed-library-capablanca-1",
    ]);
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
    await screen.findByTestId("home-stored-game");
    await expectNoAxeViolations(document.body);
    const cards = cardLinks();
    cards[0].focus();
    await user.tab();
    expect(document.activeElement).toBe(cards[1]);
  });
});
