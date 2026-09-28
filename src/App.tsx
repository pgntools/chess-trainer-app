//import * as Sentry from "@sentry/react";
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router";

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
import { default as LibraryGameScreen  } from './views/library/LibraryGameScreenMain'
import { default as RepertoiresScreen  } from './views/repertoires/RepertoiresMain'
import { default as RepertoireUploadScreen  } from './views/repertoires/RepertoireUploadMain'
import { default as RepertoireBoardScreen  } from './views/repertoires/RepertoireBoardMain'
import { default as RepertoireSettingsScreen  } from './views/repertoires/RepertoireSettingsScreenMain'
import { default as RepertoireGameScreen  } from './views/repertoires/RepertoireGameMain'
import { default as SettingsScreen  } from './views/settings/SettingsMain'

/**
 * The **Development** section's routes (`chessboard.md` §9.5) — today the
 * design gallery (CTA-107).
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
        handle: FULL_WIDTH_ROUTE,
      },
    ]
  : [];


const routes = createBrowserRouter(

  [
    {
      path: "/",
      //  errorElement: <NotFoundPage />,
      element:
          <DefaultLayout />
      ,
      children: [
        {
          index: true, element: <HomeScreen />

        },
        {
          path: "/engine/play",
          element: <PlayWithEngineScreen />
        },
        // The Lobby: the games against the engine (`lib/playedGameStore.ts`),
        // flat and newest first, and the new-game form.
        {
          path: "/engine/games",
          element: <PlayedGamesScreen />
        },
        // Masked Pieces: Play with Engine's screen in a costume; its games are
        // kept with the engine games above.
        {
          path: "/engine/masked",
          element: <MaskedPlayScreen />
        },
        {
          path: "/tools/analysis",
          element: <AnalysisBoardScreen />
        },
        // The reader's own analysis boards, kept in IndexedDB
        // (`lib/savedAnalysisStore.ts`), filed into nested folders.
        {
          path: "/tools/analysis/saved",
          element: <SavedAnalysesScreen />
        },
        // A saved analysis' title, description, side, arrows and folder (CTA-73).
        {
          path: "/tools/analysis/saved/:id/settings",
          element: <AnalysisSettingsScreen />
        },
        // The Openings explorer (CTA-78): a v2 board with the opening book.
        // It keeps nothing — its Analysis button hands the tree on.
        {
          path: "/openings",
          element: <OpeningsScreen />
        },
        // The reader's own repertoires (CTA-61), kept in IndexedDB
        // (`lib/savedRepertoireStore.ts`): the list, the screen one is brought
        // in on, and the v2 board one is read on. `new` is a static segment, so
        // it ranks above `:id` whatever the order here.
        {
          path: "/repertoires",
          element: <RepertoiresScreen />
        },
        {
          path: "/repertoires/new",
          element: <RepertoireUploadScreen />
        },
        {
          path: "/repertoires/:id",
          element: <RepertoireBoardScreen />
        },
        // A repertoire's title, description and main color (and what comes next).
        {
          path: "/repertoires/:id/settings",
          element: <RepertoireSettingsScreen />
        },
        // Its games (CTA-63): `end` (Get to the end) and `backtrack`. The
        // same player the repertoire's own view is, with a game's rules; an
        // unknown game is the view's own miss.
        {
          path: "/repertoires/:id/games/:game",
          element: <RepertoireGameScreen />
        },
        // The Library (CTA-75): the collections, the screen one is added on, a
        // collection's table and a game's analysis board. A `.pgn` dropped into
        // `src/data/library/` is a collection with no edit here. `new` is a
        // static segment, so it ranks above `:collectionId`.
        {
          path: "/library",
          element: <LibraryScreen />
        },
        {
          path: "/library/new",
          element: <LibraryUploadScreen />
        },
        {
          path: "/library/:collectionId",
          element: <LibraryCollectionScreen />
        },
        {
          path: "/library/:collectionId/:game",
          element: <LibraryGameScreen />
        },
        // Settings (CTA-86): one tab per segment — Export today. `/settings`
        // and an unknown tab land on the first.
        {
          path: "/settings",
          element: <SettingsScreen />
        },
        {
          path: "/settings/:tab",
          element: <SettingsScreen />
        },
        // The Development section — dev-only; see `devRoutes` above.
        ...devRoutes,

      ]
    }
  ],
  {
    // In a GitHub Pages project-site build this is "/chess-trainer-app/"
    // (Vite's `base`); in dev and under Vitest it is "/". Keeps route
    // matching and generated links under the deployed sub-path.
    basename: import.meta.env.BASE_URL,
  })

function App() {
  //const [count, setCount] = useState(0)

  return (
    <RouterProvider
      router={routes}

    />
  )
}

export default App
