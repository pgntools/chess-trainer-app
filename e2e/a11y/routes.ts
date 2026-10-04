import type { Locator, Page } from "@playwright/test";

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
};

/** Whether the page draws chess pieces: a board's, or an editor's palette. */
export const drawsPieces = (route: PageRoute): boolean => route.board === true || route.pieces === true;

const byTestId = (id: string) => (page: Page) => page.getByTestId(id);

export const ROUTES: readonly PageRoute[] = [
  // The front page (CTA-126) draws boards: Library games, repertoires, a collection's card.
  { id: "home", pattern: "/", path: "", board: true, ready: byTestId("home-game-library-fischer-52") },
  { id: "lobby", pattern: "/engine/games", path: "engine/games", ready: byTestId("played-games-row-e2e-on") },
  { id: "play-with-engine", pattern: "/engine/play", path: "engine/play", board: true },
  { id: "masked-pieces", pattern: "/engine/masked", path: "engine/masked", board: true },
  { id: "analysis-board", pattern: "/tools/analysis", path: "tools/analysis", board: true },
  {
    id: "saved-analyses",
    pattern: "/tools/analysis/saved",
    path: "tools/analysis/saved",
    pieces: true,
    ready: byTestId(`saved-analyses-item-${SEED.analysisId}`),
  },
  {
    id: "saved-analysis-settings",
    pattern: "/tools/analysis/saved/:id/settings",
    path: `tools/analysis/saved/${SEED.analysisId}/settings`,
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
  {
    id: "library-collection-settings",
    pattern: "/library/:collectionId/settings",
    path: `library/${SEED.collectionId}/settings`,
  },
  { id: "library-upload", pattern: "/library/new", path: "library/new" },
  { id: "library-game", pattern: "/library/:collectionId/:game", path: `library/${SEED.collectionId}/1`, board: true },
  // The Blog (CTA-126): its index, a folder, and every article — each article its own line.
  { id: "blog", pattern: "/blog", path: "blog" },
  { id: "blog-folder", pattern: "/blog/*", path: "blog/writing-an-article/components" },
  {
    id: "blog-get-started",
    pattern: "/blog/get-started",
    path: "blog/get-started",
    board: true,
    ready: byTestId("home-game-library-fischer-52"),
  },
  {
    id: "blog-game-boards-3col",
    pattern: "/blog/writing-an-article/components/game-boards-3col",
    path: "blog/writing-an-article/components/game-boards-3col",
    board: true,
    ready: byTestId("home-game-library-capablanca-442"),
  },
  {
    id: "blog-start-move",
    pattern: "/blog/writing-an-article/components/start-move",
    path: "blog/writing-an-article/components/start-move",
    board: true,
    ready: byTestId("home-game-library-fischer-891"),
  },
  {
    id: "blog-repertoires-2col",
    pattern: "/blog/writing-an-article/components/repertoires-2col",
    path: "blog/writing-an-article/components/repertoires-2col",
    board: true,
    ready: byTestId("home-repertoire-sample-caro-kann-black"),
  },
  {
    id: "blog-collection-wide-view-1",
    pattern: "/blog/writing-an-article/components/collection-wide-view-1",
    path: "blog/writing-an-article/components/collection-wide-view-1",
    board: true,
    ready: byTestId("home-game-library-fischer-52"),
  },
  {
    id: "blog-collection-wide-view-2",
    pattern: "/blog/writing-an-article/components/collection-wide-view-2",
    path: "blog/writing-an-article/components/collection-wide-view-2",
    board: true,
    ready: byTestId("home-game-library-capablanca-442"),
  },
  {
    id: "blog-stored-game-embed",
    pattern: "/blog/writing-an-article/components/stored-game-embed",
    path: "blog/writing-an-article/components/stored-game-embed",
    board: true,
    ready: byTestId("home-game-library-capablanca-1"),
  },
  { id: "blog-nav-cards", pattern: "/blog/writing-an-article/components/nav-cards", path: "blog/writing-an-article/components/nav-cards" },
  { id: "blog-inline-pgn-the-component", pattern: "/blog/writing-an-article/inline-pgn/the-component", path: "blog/writing-an-article/inline-pgn/the-component", board: true },
  { id: "blog-inline-pgn-windows", pattern: "/blog/writing-an-article/inline-pgn/windows", path: "blog/writing-an-article/inline-pgn/windows", board: true },
  { id: "blog-inline-pgn-variations", pattern: "/blog/writing-an-article/inline-pgn/variations", path: "blog/writing-an-article/inline-pgn/variations", board: true },
  { id: "blog-inline-pgn-arrows-and-circles", pattern: "/blog/writing-an-article/inline-pgn/arrows-and-circles", path: "blog/writing-an-article/inline-pgn/arrows-and-circles", board: true },
  { id: "blog-inline-pgn-rubinstein-capablanca-1911", pattern: "/blog/writing-an-article/inline-pgn/rubinstein-capablanca-1911", path: "blog/writing-an-article/inline-pgn/rubinstein-capablanca-1911", board: true },
  {
    id: "blog-tournaments-olympiad-2026",
    pattern: "/blog/tournaments/olympiad-2026",
    path: "blog/tournaments/olympiad-2026",
    ready: byTestId("tournament-team-standings-46th-olympiad-women-2026"),
  },
  {
    id: "blog-tournaments-fide-candidates-2026",
    pattern: "/blog/tournaments/fide-candidates-2026",
    path: "blog/tournaments/fide-candidates-2026",
    board: true,
    ready: byTestId("tournament-crosstable-fide-candidates-2026"),
  },
  {
    id: "blog-tournaments-werner-obermeyer-swiss-2026",
    pattern: "/blog/tournaments/werner-obermeyer-swiss-2026",
    path: "blog/tournaments/werner-obermeyer-swiss-2026",
    board: true,
    ready: byTestId("tournament-standings-20th-werner-obermeyer"),
  },
  {
    id: "blog-tournaments-green-hills-masters-rapid-2026",
    pattern: "/blog/tournaments/green-hills-masters-rapid-2026",
    path: "blog/tournaments/green-hills-masters-rapid-2026",
    board: true,
    ready: byTestId("tournament-crosstable-green-hills-masters-rapid"),
  },
  {
    id: "blog-tournaments-demo-swiss",
    pattern: "/blog/writing-an-article/demo-tables/swiss",
    path: "blog/writing-an-article/demo-tables/swiss",
    ready: byTestId("tournament-standings-112th-ch-gbr-2026"),
  },
  {
    id: "blog-tournaments-demo-single-round-robin",
    pattern: "/blog/writing-an-article/demo-tables/single-round-robin",
    path: "blog/writing-an-article/demo-tables/single-round-robin",
    ready: byTestId("tournament-crosstable-green-hills-masters-rapid"),
  },
  {
    id: "blog-tournaments-demo-double-round-robin",
    pattern: "/blog/writing-an-article/demo-tables/double-round-robin",
    path: "blog/writing-an-article/demo-tables/double-round-robin",
    ready: byTestId("tournament-crosstable-fide-candidates-2026"),
  },
  {
    id: "blog-tournaments-demo-knockout",
    pattern: "/blog/writing-an-article/demo-tables/knockout",
    path: "blog/writing-an-article/demo-tables/knockout",
    ready: byTestId("tournament-bracket-ch-ned-ko-2026"),
  },
  {
    id: "blog-tournaments-demo-double-elimination",
    pattern: "/blog/writing-an-article/demo-tables/double-elimination",
    path: "blog/writing-an-article/demo-tables/double-elimination",
    ready: byTestId("tournament-bracket-esports-world-cup-pi-2026"),
  },
  {
    id: "blog-tournaments-demo-match",
    pattern: "/blog/writing-an-article/demo-tables/match",
    path: "blog/writing-an-article/demo-tables/match",
    ready: byTestId("tournament-match-clutch-chess-the-legends-2026"),
  },
  {
    id: "blog-tournaments-demo-team",
    pattern: "/blog/writing-an-article/demo-tables/team",
    path: "blog/writing-an-article/demo-tables/team",
    ready: byTestId("tournament-team-standings-fide-world-rapid-team"),
  },
  {
    id: "blog-tournaments-demo-from-a-collection",
    pattern: "/blog/writing-an-article/demo-tables/from-a-collection",
    path: "blog/writing-an-article/demo-tables/from-a-collection",
    ready: byTestId("tournament-collection-candidates2026-roundRobin"),
  },
  {
    id: "blog-tournaments-demo-knockout-from-a-collection",
    pattern: "/blog/writing-an-article/demo-tables/knockout-from-a-collection",
    path: "blog/writing-an-article/demo-tables/knockout-from-a-collection",
    ready: byTestId("tournament-collection-netherlands2026-knockout"),
  },
  {
    id: "blog-tournaments-demo-double-elimination-from-a-collection",
    pattern: "/blog/writing-an-article/demo-tables/double-elimination-from-a-collection",
    path: "blog/writing-an-article/demo-tables/double-elimination-from-a-collection",
    ready: byTestId("tournament-collection-esportsplayin2026-doubleElimination"),
  },
  {
    id: "blog-tournaments-demo-team-from-a-collection",
    pattern: "/blog/writing-an-article/demo-tables/team-from-a-collection",
    path: "blog/writing-an-article/demo-tables/team-from-a-collection",
    ready: byTestId("tournament-collection-worldrapidteam2026-team"),
  },
  { id: "blog-writing-an-article", pattern: "/blog/writing-an-article/guide", path: "blog/writing-an-article/guide" },
  { id: "settings-export", pattern: "/settings/:tab", path: "settings/export" },
  { id: "settings-import", pattern: "/settings/:tab", path: "settings/import" },
  { id: "settings-storage", pattern: "/settings/:tab", path: "settings/storage" },
  { id: "settings-appearance", pattern: "/settings/:tab", path: "settings/appearance" },
];
