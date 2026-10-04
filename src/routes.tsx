import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router";

import { DefaultLayout } from './views/main/Layout';
import { FULL_WIDTH_ROUTE } from './views/main/routeHandle';
import { default as HomeScreen  } from './views/home/Main'
import { default as PlayWithEngineScreen  } from './views/engine/play/Main'
import { default as PlayedGamesScreen  } from './views/engine/games/Main'
import { default as MaskedPlayScreen  } from './views/engine/masked/Main'
import { default as AnalysisBoardScreen  } from './views/tools/analysis/Main'
import { default as SavedAnalysesScreen  } from './views/tools/analysis/saved/Main'
import { default as AnalysisSettingsScreen  } from './views/tools/analysis/saved/AnalysisSettingsScreenMain'
import { default as OpeningsScreen  } from './views/openings/Main'
import { default as LibraryScreen  } from './views/library/LibraryHomeMain'
import { default as LibraryUploadScreen  } from './views/library/LibraryUploadMain'
import { default as LibraryCollectionScreen  } from './views/library/CollectionScreenMain'
import { default as LibraryCollectionSettingsScreen  } from './views/library/CollectionSettingsScreenMain'
import { default as LibraryGameScreen  } from './views/library/LibraryGameScreenMain'
import { default as RepertoiresScreen  } from './views/repertoires/RepertoiresMain'
import { default as RepertoireUploadScreen  } from './views/repertoires/RepertoireUploadMain'
import { default as RepertoireBoardScreen  } from './views/repertoires/RepertoireBoardMain'
import { default as RepertoireSettingsScreen  } from './views/repertoires/RepertoireSettingsScreenMain'
import { default as RepertoireGameScreen  } from './views/repertoires/RepertoireGameMain'
import { default as SettingsScreen  } from './views/settings/SettingsMain'
import { default as BlogIndexScreen  } from './views/blog/BlogIndexMain'
import { default as BlogArticleScreen  } from './views/blog/BlogArticleMain'

/**
 * The **Development** section's routes (`chessboard.md` §9.5) — the design
 * gallery (CTA-107) and the theme editor (CTA-115).
 *
 * Dev-only, and this array is the whole of the gate. Two things make it
 * provable rather than hopeful:
 *
 * - `import.meta.env.DEV` is replaced by the literal `false` in a production
 *   build, so the conditional below is dead code;
 * - every screen is reached through `lazy(() => import(…))` rather than a
 *   static import at the top of this file, so with the branch dead there is no
 *   reference to it left for rollup to keep — no dev chunk is emitted at all,
 *   where a static import would have been bundled whether the route existed
 *   or not.
 *
 * `Suspense` is required by `lazy`, and a screen resolves from the same dev
 * server in a frame, so the fallback is deliberately nothing.
 */
const devScreen = (load: Parameters<typeof lazy>[0]): ReactNode => {
  const Screen = lazy(load);
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
};

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        // One page per section of each tier (`/dev/design/tables`,
        // `/dev/design/patterns/tables`, `/dev/design/blocks/tables`, …);
        // `/dev/design` and an unknown page land on the first. One splat
        // route, so moving between pages keeps the gallery (and its switches)
        // mounted.
        path: "/dev/design/*",
        element: devScreen(() => import("./views/dev/design/Main")),
        // Not a board: the gallery takes the whole body (no square, no aside).
        handle: { ...FULL_WIDTH_ROUTE, title: "pages.designSystem" },
      },
      {
        // The theme editor (CTA-115): every token of a theme, edited against
        // a live preview, saved by download. `?theme=<id>` opens that theme.
        path: "/dev/theme-editor",
        element: devScreen(() => import("./views/dev/themeEditor/Main")),
        handle: { ...FULL_WIDTH_ROUTE, title: "pages.themeEditor" },
      },
    ]
  : [];


/**
 * **The app's routes** — the shell and every screen behind it. Each screen's
 * route names it in its `handle` (`title`, a `pages.*` catalog key — CTA-112):
 * the shell makes the page title, the `main` landmark's name and the page's
 * `h1` of it (`views/main/routeHandle.ts`), and `routes.test.tsx` holds every
 * route to having one. `App.tsx` builds the browser router over this; a test
 * can build a memory router over the same table.
 */
export const appRoutes: RouteObject[] = [
    {
      path: "/",
      //  errorElement: <NotFoundPage />,
      element:
          <DefaultLayout />
      ,
      children: [
        {
          index: true, element: <HomeScreen />, handle: { title: "pages.home" }
        },
        {
          path: "/engine/play",
          element: <PlayWithEngineScreen />,
          handle: { title: "pages.playWithEngine" }
        },
        // The Lobby: the games against the engine (`lib/playedGameStore.ts`),
        // flat and newest first, and the new-game form.
        {
          path: "/engine/games",
          element: <PlayedGamesScreen />,
          handle: { title: "pages.lobby" }
        },
        // Masked Pieces: Play with Engine's screen in a costume; its games are
        // kept with the engine games above.
        {
          path: "/engine/masked",
          element: <MaskedPlayScreen />,
          handle: { title: "pages.maskedPieces" }
        },
        {
          path: "/tools/analysis",
          element: <AnalysisBoardScreen />,
          handle: { title: "pages.analysisBoard" }
        },
        // The reader's own analysis boards, kept in IndexedDB
        // (`lib/savedAnalysisStore.ts`), filed into nested folders.
        {
          path: "/tools/analysis/saved",
          element: <SavedAnalysesScreen />,
          handle: { title: "pages.savedAnalyses" }
        },
        // A saved analysis' title, description, side, arrows and folder (CTA-73).
        {
          path: "/tools/analysis/saved/:id/settings",
          element: <AnalysisSettingsScreen />,
          handle: { title: "pages.analysisSettings" }
        },
        // The Openings explorer (CTA-78): a v2 board with the opening book.
        // It keeps nothing — its Analysis button hands the tree on.
        {
          path: "/openings",
          element: <OpeningsScreen />,
          handle: { title: "pages.openings" }
        },
        // The reader's own repertoires (CTA-61), kept in IndexedDB
        // (`lib/savedRepertoireStore.ts`): the list, the screen one is brought
        // in on, and the v2 board one is read on. `new` is a static segment, so
        // it ranks above `:id` whatever the order here.
        {
          path: "/repertoires",
          element: <RepertoiresScreen />,
          handle: { title: "pages.repertoires" }
        },
        {
          path: "/repertoires/new",
          element: <RepertoireUploadScreen />,
          handle: { title: "pages.newRepertoire" }
        },
        {
          path: "/repertoires/:id",
          element: <RepertoireBoardScreen />,
          handle: { title: "pages.repertoire" }
        },
        // A repertoire's title, description and main color (and what comes next).
        {
          path: "/repertoires/:id/settings",
          element: <RepertoireSettingsScreen />,
          handle: { title: "pages.repertoireSettings" }
        },
        // Its games (CTA-63): `end` (Get to the end) and `backtrack`. The
        // same player the repertoire's own view is, with a game's rules; an
        // unknown game is the view's own miss.
        {
          path: "/repertoires/:id/games/:game",
          element: <RepertoireGameScreen />,
          handle: { title: "pages.repertoireGame" }
        },
        // The Library (CTA-75): the collections, the screen one is added on, a
        // collection's table and a game's analysis board. A `.pgn` dropped into
        // `src/data/library/` is a collection with no edit here. `new` is a
        // static segment, so it ranks above `:collectionId`.
        {
          path: "/library",
          element: <LibraryScreen />,
          handle: { title: "pages.library" }
        },
        {
          path: "/library/new",
          element: <LibraryUploadScreen />,
          handle: { title: "pages.addCollection" }
        },
        {
          path: "/library/:collectionId",
          element: <LibraryCollectionScreen />,
          handle: { title: "pages.collection" }
        },
        // A collection's settings (CTA-121) — its title, description and
        // tournament mark. A static segment, so it ranks above `:game`.
        {
          path: "/library/:collectionId/settings",
          element: <LibraryCollectionSettingsScreen />,
          handle: { title: "pages.collectionSettings" }
        },
        {
          path: "/library/:collectionId/:game",
          element: <LibraryGameScreen />,
          handle: { title: "pages.libraryGame" }
        },
        // The Blog (CTA-126): its index, a folder of it (any depth — the
        // splat ranks below every static article path), and one line per
        // article: the article named by its address in
        // `views/blog/articles.ts`, its document `articles/<path>.mdx`. A new
        // article is a line here and one in `e2e/a11y/routes.ts`
        // (`views/blog/articles.test.ts` holds them to the registry).
        {
          path: "/blog",
          element: <BlogIndexScreen />,
          handle: { title: "pages.blog" }
        },
        {
          path: "/blog/*",
          element: <BlogIndexScreen />,
          handle: { title: "pages.blog" }
        },
        {
          path: "/blog/get-started",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/game-boards-3col",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/start-move",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/repertoires-2col",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/collection-wide-view-1",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/collection-wide-view-2",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/stored-game-embed",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/components/nav-cards",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/inline-pgn/the-component",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/inline-pgn/windows",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/inline-pgn/variations",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/inline-pgn/arrows-and-circles",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/inline-pgn/rubinstein-capablanca-1911",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/tournaments/olympiad-2026",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/tournaments/fide-candidates-2026",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/tournaments/werner-obermeyer-swiss-2026",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/tournaments/green-hills-masters-rapid-2026",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/swiss",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/single-round-robin",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/double-round-robin",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/knockout",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/double-elimination",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/match",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/demo-tables/team",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        {
          path: "/blog/writing-an-article/guide",
          element: <BlogArticleScreen />,
          handle: { title: "pages.blogArticle" }
        },
        // Settings (CTA-86): one tab per segment — Export today. `/settings`
        // and an unknown tab land on the first.
        {
          path: "/settings",
          element: <SettingsScreen />,
          handle: { title: "pages.settings" }
        },
        {
          path: "/settings/:tab",
          element: <SettingsScreen />,
          handle: { title: "pages.settings" }
        },
        // The Development section — dev-only; see `devRoutes` above.
        ...devRoutes,

      ]
    }
  ];
