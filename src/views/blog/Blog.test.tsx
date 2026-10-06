import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from "react-router";

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
import BlogMain from "./BlogMain";
import { blogPageMeta } from "./blogPageMeta";

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

/** Where the router is — for a redirect. */
function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

/** The Blog as the app serves it (CTA-135): its one route, in the shell, which titles the page from the route's `meta`. */
const renderInShell = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <DefaultLayout />,
        children: [
          {
            path: "/blog/*",
            element: (
              <>
                <BlogMain />
                <Where />
              </>
            ),
            handle: { ...ARTICLE_ROUTE, title: "pages.blog", meta: blogPageMeta },
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <AppThemeWithLang>
      <RouterProvider router={router} />
    </AppThemeWithLang>,
  );
};

const description = () => document.head.querySelector('meta[name="description"]')?.getAttribute("content");

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
    // Every article under it, its sub-folders' too: the guide, the fixture draft (listed as in yarn dev), and the components', games' and tables' demos.
    expect(screen.getByText("25 articles")).toBeInTheDocument();
    // A folder's summary, from its index.mdx (CTA-135).
    expect(screen.getByText("How an article is written, and every component it may embed shown at work.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Tournaments" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("opens a folder: the trail back, and its articles with their summaries", async () => {
    renderAt("/blog/writing-an-article/components", "index");
    expect(screen.getByRole("heading", { level: 1, name: "Components" })).toBeInTheDocument();
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
  it("is its title as the page's h1, a trail back through its folder, then its document", async () => {
    const store = createPageTitleStore();
    renderAt("/blog/writing-an-article/components/nav-cards", "article", store);
    expect(screen.getByRole("heading", { level: 1, name: "Every screen as cards" })).toBeInTheDocument();
    expect(store.getOwnHeadings()).toBe(1);
    // The page title is the route's `meta`, not the screen's (CTA-135).
    expect(store.getDetail()).toBeUndefined();
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
    expect(screen.queryByRole("link", { name: "Edit in the MDX editor" })).not.toBeInTheDocument();
  });

  it("carries no edit link — the MDX editor's lobby lists every article with its Edit (CTA-137)", () => {
    renderAt("/blog/tournaments/olympiad-2026", "article");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit in the MDX editor" })).not.toBeInTheDocument();
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

describe("the Blog's one route (CTA-135)", () => {
  it("titles each page from the address — an article, a folder, the index — and describes an article", async () => {
    const { unmount } = renderInShell("/blog/writing-an-article/components/nav-cards");
    expect(await screen.findByRole("heading", { level: 1, name: "Every screen as cards" })).toBeInTheDocument();
    expect(document.title).toBe("Every screen as cards — Blog — Chess Trainer App");
    expect(description()).toBe("<NavCards>: the app's screens, by section — the landing page as it first was.");
    unmount();

    const folder = renderInShell("/blog/writing-an-article/components");
    expect(await screen.findByRole("heading", { level: 1, name: "Components" })).toBeInTheDocument();
    expect(document.title).toBe("Components — Blog — Chess Trainer App");
    // A folder is described by its index's summary (CTA-136).
    expect(description()).toMatch(/^The embeds that read the Library/);
    folder.unmount();

    renderInShell("/blog");
    expect(await screen.findByRole("heading", { level: 1, name: "Blog" })).toBeInTheDocument();
    expect(document.title).toBe("Blog — Chess Trainer App");
    // The Blog's own index, by the Blog's screen description.
    expect(description()).toBe(i18n.t("pageDescriptions.blog"));
  });

  it("titles the page in the reader's language", async () => {
    await i18n.changeLanguage("he");
    renderInShell("/blog/tournaments/olympiad-2026");
    expect(await screen.findByRole("heading", { level: 1, name: "האולימפיאדה ה-46 בשחמט 2026" })).toBeInTheDocument();
    expect(document.title).toBe("האולימפיאדה ה-46 בשחמט 2026 — בלוג — אפליקציית אימון שחמט");
  });

  it("moves an old address an article lists in redirectFrom on to the article", async () => {
    renderInShell("/blog/writing-an-article/draft");
    expect(await screen.findByRole("heading", { level: 1, name: /A draft/ })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/blog/writing-an-article/a-draft");
  });

  it("says so for an address that names nothing", async () => {
    renderInShell("/blog/writing-an-article/nowhere");
    expect(await screen.findByText("There is no article at this address.")).toBeInTheDocument();
    expect(document.title).toBe("Blog — Chess Trainer App");
  });
});

describe("what an article's frontmatter shows (CTA-135)", () => {
  it("marks a draft — in yarn dev, where drafts are listed — on its page and its card", () => {
    renderAt("/blog/writing-an-article/a-draft", "article");
    expect(screen.getByTestId("article-draft")).toHaveTextContent("Draft");
    renderAt("/blog/writing-an-article", "index");
    expect(screen.getByTestId("blog-draft-writing-an-article/a-draft")).toHaveTextContent("Draft");
  });

  it("dates an article under its title — when its frontmatter has a date", () => {
    const { unmount } = renderAt("/blog/tournaments/olympiad-2026", "article");
    expect(screen.getByTestId("article-dates")).toHaveTextContent("Published Sep 16, 2026");
    unmount();
    renderAt("/blog/writing-an-article/components/nav-cards", "article");
    expect(screen.queryByTestId("article-dates")).not.toBeInTheDocument();
  });

  it("orders a folder: pinned articles in sequence, then the newest first", () => {
    renderAt("/blog/tournaments", "index");
    const cards = within(screen.getByTestId("blog-articles")).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("href"))).toEqual([
      "/blog/tournaments/olympiad-2026",
      "/blog/tournaments/werner-obermeyer-swiss-2026",
      "/blog/tournaments/green-hills-masters-rapid-2026",
      "/blog/tournaments/fide-candidates-2026",
    ]);
  });

  it("shows a translation's own title over the English document, and marks an English title under Hebrew as English", async () => {
    await i18n.changeLanguage("he");
    // A frontmatter-only translation: the Hebrew title, the English body.
    renderAt("/blog/writing-an-article/components/nav-cards", "article");
    const translated = screen.getByRole("heading", { level: 1, name: "כל המסכים ככרטיסים" });
    expect(translated.querySelector("[lang]")).toBeNull();
    const section = await screen.findByRole("heading", { level: 2, name: "The markup" });
    expect(section.closest("[lang]")).toHaveAttribute("lang", "en");

    // No translation at all: the English title, marked, in the h1 and the trail…
    renderAt("/blog/writing-an-article/a-draft", "article");
    const english = screen.getByRole("heading", { level: 1, name: "A draft" }).querySelector("[lang]");
    expect(english).toHaveAttribute("lang", "en");
    expect(english).toHaveAttribute("dir", "ltr");
    const current = within(screen.getAllByTestId("blog-article-crumbs").at(-1)!).getByText("A draft");
    expect(current).toHaveAttribute("lang", "en");
    expect(current).toHaveAttribute("dir", "ltr");
    // …and on its folder's index.
    renderAt("/blog/writing-an-article", "index");
    const card = within(screen.getByTestId("blog-articles")).getByText("A draft");
    expect(card).toHaveAttribute("lang", "en");
    expect(card).toHaveAttribute("dir", "ltr");
    // A Hebrew title is not marked.
    expect(within(screen.getByTestId("blog-articles")).getByText("כתיבת מאמר")).not.toHaveAttribute("lang");
  });
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
