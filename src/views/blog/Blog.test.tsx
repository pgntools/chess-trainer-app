import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { createPageTitleStore, PageTitleContext, type PageTitleStore } from "../main/pageTitle";
import { BLOG_ARTICLES } from "./articles";
import BlogArticle from "./BlogArticle";
import BlogIndex from "./BlogIndex";

// The articles draw boards: stubbed, as every board screen's are (chessboard.md §8).
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

const renderAt = (path: string, screenOf: "index" | "article", store?: PageTitleStore) =>
  render(
    <PageTitleContext.Provider value={store ?? null}>
      <AppThemeWithLang>
        <MemoryRouter initialEntries={[path]}>{screenOf === "index" ? <BlogIndex /> : <BlogArticle />}</MemoryRouter>
      </AppThemeWithLang>
    </PageTitleContext.Provider>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the Blog's index (CTA-126)", () => {
  it("is the Blog's folders, each with how many articles it holds", async () => {
    const store = createPageTitleStore();
    renderAt("/blog", "index", store);
    expect(screen.getByRole("heading", { level: 1, name: "Blog" })).toBeInTheDocument();
    expect(store.getOwnHeadings()).toBe(1);
    const components = screen.getByRole("link", { name: "Open Components" });
    expect(components).toHaveAttribute("href", "/blog/components");
    expect(screen.getByText("7 articles")).toBeInTheDocument();
    expect(screen.getByText("1 article")).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("opens a folder: the trail back, and its articles with their summaries", async () => {
    const store = createPageTitleStore();
    renderAt("/blog/components", "index", store);
    expect(screen.getByRole("heading", { level: 1, name: "Components" })).toBeInTheDocument();
    expect(store.getDetail()).toBe("Components");
    const trail = screen.getByRole("navigation", { name: "Where this is in the Blog" });
    expect(within(trail).getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    const cards = within(screen.getByTestId("blog-articles")).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(
      BLOG_ARTICLES.filter((article) => article.path.startsWith("components/")).map((article) => `/blog/${article.path}`),
    );
    expect(screen.getByText(/the landing page as it first was/)).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("says so for an address that names no folder", () => {
    renderAt("/blog/nowhere", "index");
    expect(screen.getByText("There is no Blog folder at this address.")).toBeInTheDocument();
  });

  it("is in Hebrew under Hebrew — the folders' own Hebrew names", async () => {
    await i18n.changeLanguage("he");
    renderAt("/blog", "index");
    expect(screen.getByRole("heading", { level: 1, name: "בלוג" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "פתיחת רכיבים" })).toBeInTheDocument();
  });
});

describe("a Blog article (CTA-126)", () => {
  it("is its title as the page's h1 and title, a trail back through its folder, then its document", async () => {
    const store = createPageTitleStore();
    renderAt("/blog/components/nav-cards", "article", store);
    expect(screen.getByRole("heading", { level: 1, name: "Every screen as cards" })).toBeInTheDocument();
    expect(store.getOwnHeadings()).toBe(1);
    expect(store.getDetail()).toBe("Every screen as cards");
    const trail = screen.getByRole("navigation", { name: "Where this is in the Blog" });
    expect(within(trail).getByRole("link", { name: "Components" })).toHaveAttribute("href", "/blog/components");

    expect(await screen.findByRole("heading", { level: 2, name: "The markup" })).toBeInTheDocument();
    // The markup it shows reads left to right.
    expect(screen.getByText("<NavCards headingLevel={3} />").closest("pre")).toHaveAttribute("dir", "ltr");
    await expectNoAxeViolations();
  });

  it("shows its English document left to right, as English, under Hebrew", async () => {
    await i18n.changeLanguage("he");
    renderAt("/blog/guides/writing-an-article", "article");
    expect(screen.getByRole("heading", { level: 1, name: "כתיבת מאמר" })).toBeInTheDocument();
    const section = await screen.findByRole("heading", { level: 2, name: "1. The file" });
    expect(section.closest("[lang]")).toHaveAttribute("lang", "en");
    expect(section.closest("[dir]")).toHaveAttribute("dir", "ltr");
  });

  it("says so for an address that names no article", () => {
    renderAt("/blog/components/nowhere", "article");
    expect(screen.getByText("There is no article at this address.")).toBeInTheDocument();
  });

  it.each(BLOG_ARTICLES.map((article) => article.path))(
    "%s renders — one h1, its sections, every component it names",
    async (path) => {
      renderAt(`/blog/${path}`, "article");
      expect((await screen.findAllByRole("heading", { level: 2 })).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      // Every game it writes in reads, and every tournament table its PGN (CTA-128).
      expect(screen.queryByText("This game's PGN does not read.")).not.toBeInTheDocument();
      expect(document.querySelector('[data-testid^="tournament-"][data-testid$="-unreadable"]')).toBeNull();
    },
  );
});
