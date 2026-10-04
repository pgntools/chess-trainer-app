import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";

import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { InlinePgnGame } from "../home/frontPage/InlinePgnGame";
import { RepertoireBoardEmbed } from "../home/frontPage/RepertoireBoardEmbed";
import { DefaultLayout } from "../main/Layout";
import { createPageTitleStore, PageTitleContext, type PageTitleStore } from "../main/pageTitle";
import { ARTICLE_ROUTE } from "../main/routeHandle";
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
    const writing = screen.getByRole("link", { name: "Open Writing an article" });
    expect(writing).toHaveAttribute("href", "/blog/writing-an-article");
    // Every article under it, its sub-folders' too: the guide, and the components', games' and tables' demos.
    expect(screen.getByText("24 articles")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Tournaments" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("opens a folder: the trail back, and its articles with their summaries", async () => {
    const store = createPageTitleStore();
    renderAt("/blog/writing-an-article/components", "index", store);
    expect(screen.getByRole("heading", { level: 1, name: "Components" })).toBeInTheDocument();
    expect(store.getDetail()).toBe("Components");
    const trail = screen.getByRole("navigation", { name: "Where this is in the Blog" });
    expect(within(trail).getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(within(trail).getByRole("link", { name: "Writing an article" })).toHaveAttribute("href", "/blog/writing-an-article");
    const cards = within(screen.getByTestId("blog-articles")).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(
      BLOG_ARTICLES.filter((article) => article.path.startsWith("writing-an-article/components/")).map((article) => `/blog/${article.path}`),
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
    expect(screen.getByRole("link", { name: "פתיחת כתיבת מאמר" })).toBeInTheDocument();
  });
});

describe("a Blog article (CTA-126)", () => {
  it("is its title as the page's h1 and title, a trail back through its folder, then its document", async () => {
    const store = createPageTitleStore();
    renderAt("/blog/writing-an-article/components/nav-cards", "article", store);
    expect(screen.getByRole("heading", { level: 1, name: "Every screen as cards" })).toBeInTheDocument();
    expect(store.getOwnHeadings()).toBe(1);
    expect(store.getDetail()).toBe("Every screen as cards");
    const trail = screen.getByRole("navigation", { name: "Where this is in the Blog" });
    expect(within(trail).getByRole("link", { name: "Components" })).toHaveAttribute("href", "/blog/writing-an-article/components");

    expect(await screen.findByRole("heading", { level: 2, name: "The markup" })).toBeInTheDocument();
    // The markup it shows reads left to right.
    expect(screen.getByText("<NavCards headingLevel={3} />").closest("pre")).toHaveAttribute("dir", "ltr");
    await expectNoAxeViolations();
  });

  it("shows its English document left to right, as English, under Hebrew", async () => {
    await i18n.changeLanguage("he");
    renderAt("/blog/writing-an-article/guide", "article");
    expect(screen.getByRole("heading", { level: 1, name: "כתיבת מאמר" })).toBeInTheDocument();
    const section = await screen.findByRole("heading", { level: 2, name: "1. The file" });
    expect(section.closest("[lang]")).toHaveAttribute("lang", "en");
    expect(section.closest("[dir]")).toHaveAttribute("dir", "ltr");
  });

  it("says so for an address that names no article", () => {
    renderAt("/blog/writing-an-article/components/nowhere", "article");
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

describe("an article's boards under Hebrew, with no shell ForceLTR (CTA-130)", () => {
  /*
    An article is the shell's full body, which mirrors with the app: nothing
    above a board pins it left to right any more. Every board an article
    embeds is one of two — `DemoBoard` (`<CollectionGameBoard>`,
    `<RepertoireBoard>`, `<CollectionCard>`, `<StoredGameEmbed>`) or
    `ExcerptBoard` (`<InlinePgnGame>`) — and each pins itself. Rendered here
    straight into the article column, as a translated article's document
    would be (an untranslated one sits in `ArticleBody`'s own `ForceLTR`).
  */
  it("keeps every board's files a to h left to right while the prose mirrors", async () => {
    await i18n.changeLanguage("he");
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <DefaultLayout />,
          children: [
            {
              path: "blog/translated",
              handle: ARTICLE_ROUTE,
              element: (
                <>
                  <p data-testid="prose">מאמר</p>
                  <InlinePgnGame pgn="1. e4 e5 2. Nf3 *" />
                  <RepertoireBoardEmbed _id="/repertoires/none" fallback="e4-white" />
                </>
              ),
            },
          ],
        },
      ],
      { initialEntries: ["/blog/translated"] },
    );
    render(
      <AppThemeWithLang>
        <RouterProvider router={router} />
      </AppThemeWithLang>,
    );

    await screen.findByTestId("home-repertoire-sample-e4-white-name");
    const column = screen.getByTestId("layout-article-column");
    expect(screen.queryByTestId("layout-board-square-sidebar")).toBeNull();
    expect(screen.getByTestId("prose").closest("[dir]")).toBe(document.body);
    const boards = within(column).getAllByTestId("board");
    expect(boards).toHaveLength(2);
    for (const board of boards) {
      expect(board.closest("[dir]")).toHaveAttribute("dir", "ltr");
      // Inside the column, not above it: the board's own ForceLTR.
      expect(column).toContainElement(board.closest("[dir]") as HTMLElement);
    }
  });
});
