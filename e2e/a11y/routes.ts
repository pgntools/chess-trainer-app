import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Locator, Page } from "@playwright/test";

import { blogArticleRoutes } from "./blogRoutes";
import { SEED } from "./seedZip";

/*
  Every shipped route the pass visits (CTA-116) — the ones `src/routes.tsx`
  serves in a production build; the Development section (`/dev/…`) is not in
  one. `routes.spec.ts` holds this list to the route table, so a screen added
  without a line here fails a test rather than going unchecked.

  A `path` is relative to the base (`/chess-trainer-app/`), so it has no
  leading slash — a leading one would drop the base and visit a 404.
*/

export type PageRoute = {
  /** The test's name. Kebab-case, unique. */
  id: string;
  /** The route's pattern in `src/routes.tsx` this visits an instance of. */
  pattern: string;
  /** Relative to the base: no leading slash. */
  path: string;
  /** It draws a chessboard: the board must run left to right whatever the language. */
  board?: boolean;
  /**
   * It draws chess pieces without a board — the position editor's palette, on
   * the page behind a dialog. A board's page draws them too (`drawsPieces`).
   */
  pieces?: boolean;
  /** What tells the page has its data, beyond its heading — the seeded row it lists. */
  ready?: (page: Page) => Locator;
  /**
   * Visited once per language — the default theme, light — rather than under
   * the whole matrix (CTA-135): a Blog article outside `BLOG_SAMPLE`, the same
   * components on other data as one inside it. `visits()` in `matrix.ts`.
   */
  oncePerLanguage?: true;
};

/** Whether the page draws chess pieces: a board's, or an editor's palette. */
export const drawsPieces = (route: PageRoute): boolean => route.board === true || route.pieces === true;

const byTestId = (id: string) => (page: Page) => page.getByTestId(id);

/*
  **The Blog's articles** (CTA-135) are not listed by hand: `blogRoutes.ts`
  reads them from their files, a line each — `blog-<path, dashed>` — and
  whether one draws a board from the embeds it uses. Every article is
  visited in the default theme, light, in both languages; the sample below,
  an article per family of embeds plus the front page's, under the whole
  matrix. What is kept by hand is only this: the sample, and what shows that
  an article has its data.
*/

/** The articles checked under every theme, scheme and language — a family of embeds each. */
export const BLOG_SAMPLE: readonly string[] = [
  "get-started", // the front page: Library games, repertoires, a collection's card, the screens' cards
  "writing-an-article/guide", // prose and markup
  "writing-an-article/components/stored-game-embed",
  "writing-an-article/inline-pgn/the-component",
  "writing-an-article/inline-pgn/arrows-and-circles", // the theme's drawing brushes
  "tournaments/olympiad-2026", // a team event's standings, flags
  "writing-an-article/demo-tables/swiss",
  "writing-an-article/demo-tables/double-round-robin",
  "writing-an-article/demo-tables/knockout",
  "writing-an-article/demo-tables/double-elimination",
  "writing-an-article/demo-tables/match",
  "writing-an-article/demo-tables/from-a-collection", // names and results linked into the Library
];

/** What shows an article has its data — the test id of an embed it draws once it has read it. */
export const BLOG_READY: Readonly<Record<string, string>> = {
  "get-started": "home-game-library-fischer-52",
  "writing-an-article/components/game-boards-3col": "home-game-library-capablanca-442",
  "writing-an-article/components/start-move": "home-game-library-fischer-891",
  "writing-an-article/components/repertoires-2col": "home-repertoire-sample-caro-kann-black",
  "writing-an-article/components/collection-wide-view-1": "home-game-library-fischer-52",
  "writing-an-article/components/collection-wide-view-2": "home-game-library-capablanca-442",
  "writing-an-article/components/stored-game-embed": "home-game-library-capablanca-1",
  "tournaments/olympiad-2026": "tournament-team-standings-46th-olympiad-women-2026",
  "tournaments/fide-candidates-2026": "tournament-crosstable-fide-candidates-2026",
  "tournaments/werner-obermeyer-swiss-2026": "tournament-standings-20th-werner-obermeyer",
  "tournaments/green-hills-masters-rapid-2026": "tournament-crosstable-green-hills-masters-rapid",
  "writing-an-article/demo-tables/swiss": "tournament-standings-112th-ch-gbr-2026",
  "writing-an-article/demo-tables/single-round-robin": "tournament-crosstable-green-hills-masters-rapid",
  "writing-an-article/demo-tables/double-round-robin": "tournament-crosstable-fide-candidates-2026",
  "writing-an-article/demo-tables/knockout": "tournament-bracket-ch-ned-ko-2026",
  "writing-an-article/demo-tables/double-elimination": "tournament-bracket-esports-world-cup-pi-2026",
  "writing-an-article/demo-tables/match": "tournament-match-clutch-chess-the-legends-2026",
  "writing-an-article/demo-tables/team": "tournament-team-standings-fide-world-rapid-team",
  "writing-an-article/demo-tables/from-a-collection": "tournament-collection-candidates2026-roundRobin",
  "writing-an-article/demo-tables/knockout-from-a-collection": "tournament-collection-netherlands2026-knockout",
  "writing-an-article/demo-tables/double-elimination-from-a-collection": "tournament-collection-esportsplayin2026-doubleElimination",
  "writing-an-article/demo-tables/team-from-a-collection": "tournament-collection-worldrapidteam2026-team",
};

/** The legal pages' routes — in `src/routes.tsx` behind its site operator (CTA-182). */
export const LEGAL_PATTERNS: readonly string[] = ["/privacy", "/cookies"];

/**
 * **Whether the build under test has the legal pages** (CTA-182): only a
 * build whose site operator is configured does (`SITE_*`, `src/lib/siteOperator.ts`)
 * — read from what it wrote, which `yarn check:pages` holds to the build's
 * own decision. Without them the pass neither visits nor misses them.
 */
export const LEGAL_PAGES_BUILT = existsSync(resolve("dist/privacy/index.html"));

export const ROUTES: readonly PageRoute[] = [
  // The front page (CTA-126) draws boards: Library games, repertoires, a collection's card.
  { id: "home", pattern: "/", path: "", board: true, ready: byTestId("home-game-library-fischer-52") },
  { id: "lobby", pattern: "/engine/games", path: "engine/games", ready: byTestId("played-games-row-e2e-on") },
  { id: "play-with-engine", pattern: "/engine/play", path: "engine/play", board: true },
  { id: "masked-pieces", pattern: "/engine/masked", path: "engine/masked", board: true },
  // Analysis V2 (CTA-186, shipped in CTA-192): the Projects browser, a Project's Cases, a Case's board and Jobs V2.
  {
    id: "analysis-projects",
    pattern: "/analysis",
    path: "analysis",
    ready: byTestId(`analysis-v2-list-row-${SEED.projectId}`),
  },
  {
    id: "analysis-project",
    pattern: "/analysis/projects/:projectId",
    path: `analysis/projects/${SEED.projectId}`,
    ready: byTestId(`analysis-v2-cases-row-${SEED.caseId}`),
  },
  {
    id: "analysis-case",
    pattern: "/analysis/projects/:projectId/cases/:caseId",
    path: `analysis/projects/${SEED.projectId}/cases/${SEED.caseId}`,
    board: true,
  },
  { id: "openings", pattern: "/openings", path: "openings", board: true },
  {
    id: "repertoires",
    pattern: "/repertoires",
    path: "repertoires",
    ready: byTestId(`repertoires-item-${SEED.repertoireId}`),
  },
  { id: "repertoire-upload", pattern: "/repertoires/new", path: "repertoires/new" },
  { id: "repertoire-player", pattern: "/repertoires/:id", path: `repertoires/${SEED.repertoireId}`, board: true },
  {
    id: "repertoire-game",
    pattern: "/repertoires/:id/games/:game",
    path: `repertoires/${SEED.repertoireId}/games/end`,
    board: true,
  },
  {
    id: "repertoire-settings",
    pattern: "/repertoires/:id/settings",
    path: `repertoires/${SEED.repertoireId}/settings`,
  },
  { id: "library", pattern: "/library", path: "library", ready: byTestId(`library-row-${SEED.collectionId}`) },
  {
    id: "library-collection",
    pattern: "/library/:collectionId",
    path: `library/${SEED.collectionId}`,
    board: true,
    ready: (page) => page.getByText("Rosen, Anna").first(),
  },
  // CTA-142: a collection marked as a tournament — its view, a route per tab.
  {
    id: "library-tournament-info",
    pattern: "/library/:collectionId",
    path: `library/${SEED.tournamentId}`,
    ready: byTestId(`tournament-collection-${SEED.tournamentId}-roundRobin`),
  },
  {
    id: "library-tournament-participants",
    pattern: "/library/:collectionId",
    path: `library/${SEED.tournamentId}?tab=participants`,
    ready: byTestId("library-tournament-participants"),
  },
  {
    id: "library-tournament-games",
    pattern: "/library/:collectionId",
    path: `library/${SEED.tournamentId}?tab=games`,
    board: true,
    ready: (page) => page.getByText("Rosen, Anna").first(),
  },
  { id: "library-upload", pattern: "/library/new", path: "library/new" },
  { id: "library-game", pattern: "/library/:collectionId/:game", path: `library/${SEED.collectionId}/1`, board: true },
  // The Blog (CTA-126): its index and a folder; its articles follow, read from their files (CTA-135).
  { id: "blog", pattern: "/blog/*", path: "blog" },
  { id: "blog-folder", pattern: "/blog/*", path: "blog/writing-an-article/components" },
  // The Jobs module (CTA-221): no job in the seed (a job is not in the export zip), so the empty list, and its settings.
  // A job's own page: the seed cannot carry one, so its miss ("No such job") — a job's page whole is audited with axe in `src/views/jobs/Jobs.test.tsx`.
  { id: "jobs", pattern: "/jobs", path: "jobs" },
  { id: "jobs-settings", pattern: "/jobs/settings", path: "jobs/settings" },
  { id: "job", pattern: "/jobs/:jobId", path: "jobs/none", ready: byTestId("job-missing") },
  // The legal pages (CTA-159): the Privacy Policy and the Cookies Notice, MDX documents reached from the footer —
  // in a build that has them (CTA-182).
  ...(LEGAL_PAGES_BUILT
    ? [
        { id: "privacy", pattern: "/privacy", path: "privacy" },
        { id: "cookies", pattern: "/cookies", path: "cookies" },
      ]
    : []),
  { id: "settings-export", pattern: "/settings/:tab", path: "settings/export" },
  { id: "settings-import", pattern: "/settings/:tab", path: "settings/import" },
  { id: "settings-storage", pattern: "/settings/:tab", path: "settings/storage" },
  { id: "settings-appearance", pattern: "/settings/:tab", path: "settings/appearance" },
  // The Sounds tab (CTA-260): the move sounds' switches and volume.
  { id: "settings-sounds", pattern: "/settings/:tab", path: "settings/sounds" },
  // The Engine tab (CTA-153): the registry's engines, the multi-thread one disabled where the host does not isolate the page.
  { id: "settings-engine", pattern: "/settings/:tab", path: "settings/engine" },
  // The Support tab (CTA-155): a line and the button that opens the support dialog.
  { id: "settings-support", pattern: "/settings/:tab", path: "settings/support" },
  ...blogArticleRoutes().map(
    ({ path, board }): PageRoute => ({
      id: `blog-${path.replaceAll("/", "-")}`,
      pattern: "/blog/*",
      path: `blog/${path}`,
      ...(board ? { board: true } : {}),
      ...(path in BLOG_READY ? { ready: byTestId(BLOG_READY[path]) } : {}),
      ...(BLOG_SAMPLE.includes(path) ? {} : { oncePerLanguage: true }),
    }),
  ),
];
