import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "./i18n";
import { expectNoAxeViolations, PAGE_STRUCTURE_RULES, AXE_PAGE_TIMEOUT_MS } from "./test/axe";
import AppThemeWithLang from "./theme/AppThemeWithLang";

/*
  The migrated screens' pages, whole (CTA-112): the real routes inside the real
  shell — one `h1`, an outline that never skips a level, and axe's
  page-structure rules. Each module's migration adds its screens here.
*/

vi.mock("./lib/engine", async () => ({
  default: (await import("./views/board/boardTestHarness")).FakeEngine,
}));
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("./views/board/boardTestHarness");
  return reactChessboardMock();
});
vi.mock("./lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("./views/board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("./lib/openings")>);
});

import { appRoutes } from "./routes";

const mountAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <AppThemeWithLang>
      <RouterProvider router={router} />
    </AppThemeWithLang>,
  );
};

/** The page's headings, in document order, as `h<level> <name>`. */
const outline = () =>
  screen.getAllByRole("heading").map((heading) => `h${heading.tagName.slice(1)} ${heading.textContent?.trim()}`);

/** No level deeper than one below the heading before it (h1 → h3 skips). */
const skips = (levels: readonly number[]) =>
  levels.flatMap((level, index) => (index > 0 && level > levels[index - 1] + 1 ? [`h${levels[index - 1]} → h${level}`] : []));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the migrated screens' outlines (CTA-112)", () => {
  it.each([
    ["/engine/games", "Lobby"],
    ["/engine/play", "Play with Engine"],
    ["/engine/masked", "Masked Pieces"],
    ["/settings/export", "Settings"],
    ["/settings/import", "Settings"],
    ["/settings/storage", "Settings"],
    ["/settings/appearance", "Settings"],
    ["/settings/engine", "Settings"],
    ["/settings/support", "Settings"],
    // CTA-113: the rest of the app.
    ["/", "Get started"],
    ["/tools/analysis", "Analysis Board"],
    ["/tools/analysis/saved", "Saved analyses"],
    ["/repertoires", "Repertoires"],
    ["/repertoires/new", "Add a repertoire"],
    ["/openings", "Openings"],
    ["/library", "Library"],
    ["/library/new", "Add a collection"],
    ["/library/capablanca", "Capablanca"],
  ])(
    "%s has one h1, “%s”, an outline with no skipped level, and passes axe's page rules",
    async (path, h1) => {
      mountAt(path);
      // A screen that reads a store shows the shell's h1 until its own lands: wait for its.
      await waitFor(() => {
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(h1);
      });
      expect(screen.getAllByRole("main")).toHaveLength(1);
      const levels = screen.getAllByRole("heading").map((heading) => Number(heading.tagName.slice(1)));
      expect(skips(levels), outline().join("\n")).toEqual([]);
      await expectNoAxeViolations(document.documentElement, { enable: PAGE_STRUCTURE_RULES });
    },
    AXE_PAGE_TIMEOUT_MS,
  );
});
