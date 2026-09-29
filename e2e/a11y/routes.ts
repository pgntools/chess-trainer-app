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
  { id: "home", pattern: "/", path: "" },
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
  { id: "library-upload", pattern: "/library/new", path: "library/new" },
  { id: "library-game", pattern: "/library/:collectionId/:game", path: `library/${SEED.collectionId}/1`, board: true },
  { id: "settings-export", pattern: "/settings/:tab", path: "settings/export" },
  { id: "settings-import", pattern: "/settings/:tab", path: "settings/import" },
  { id: "settings-storage", pattern: "/settings/:tab", path: "settings/storage" },
  { id: "settings-appearance", pattern: "/settings/:tab", path: "settings/appearance" },
];
