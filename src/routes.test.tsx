import { matchRoutes, type RouteObject, type UIMatch } from "react-router";
import { describe, expect, it } from "vitest";

import i18n from "./i18n";
import en from "./locales/en";
import he from "./locales/he";
import { appRoutes } from "./routes";
import { pageTitleOf, titleKeyOf, type ShellHandle } from "./views/main/routeHandle";

/*
  Every route has its own page title (CTA-112): the route's `handle.title`,
  a catalog key in both languages. The shell's making of the title — the
  record's name first, focus on a move — is `views/main/pageStructure.test.tsx`'s.
*/

/** Every route under the shell, depth first. */
const leaves = (routes: readonly RouteObject[]): RouteObject[] =>
  routes.flatMap((route) => (route.children === undefined ? [route] : leaves(route.children)));

const lookup = (catalog: object, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);

/** The title a path gets, in the language i18n is in. */
const titleAt = (path: string, detail?: string): string => {
  const matches = (matchRoutes(appRoutes, path) ?? []).map(
    (match) => ({ handle: match.route.handle, pathname: match.pathname }) as UIMatch,
  );
  const key = titleKeyOf(matches);
  return pageTitleOf(key === undefined ? undefined : i18n.t(key), detail, i18n.t("app.brandText")).title;
};

describe("every route's page title (CTA-112)", () => {
  it("names every screen with a key both catalogs hold", () => {
    const routes = leaves(appRoutes);
    expect(routes.length).toBeGreaterThanOrEqual(19);
    for (const route of routes) {
      const key = (route.handle as ShellHandle | undefined)?.title;
      expect(key, `route ${route.path ?? "(index)"} has no title`).toMatch(/^pages\./);
      expect(typeof lookup(en, key as string), key).toBe("string");
      expect(typeof lookup(he, key as string), key).toBe("string");
    }
  });

  it.each([
    ["/", "Home — chessapp.dev"],
    ["/engine/play", "Play with Engine — chessapp.dev"],
    ["/engine/games", "Lobby — chessapp.dev"],
    ["/engine/masked", "Masked Pieces — chessapp.dev"],
    ["/tools/analysis", "Analysis Board — chessapp.dev"],
    ["/tools/analysis/saved", "Saved analyses — chessapp.dev"],
    ["/tools/analysis/saved/a1/settings", "Analysis settings — chessapp.dev"],
    ["/openings", "Openings explorer — chessapp.dev"],
    ["/repertoires", "My repertoires — chessapp.dev"],
    ["/repertoires/new", "New repertoire — chessapp.dev"],
    ["/repertoires/r1", "Repertoire — chessapp.dev"],
    ["/repertoires/r1/settings", "Repertoire settings — chessapp.dev"],
    ["/repertoires/r1/games/end", "Repertoire game — chessapp.dev"],
    ["/library", "Library — chessapp.dev"],
    ["/library/new", "Add collection — chessapp.dev"],
    ["/library/tal", "Collection — chessapp.dev"],
    ["/library/tal/12", "Library game — chessapp.dev"],
    ["/settings", "Settings — chessapp.dev"],
    ["/settings/export", "Settings — chessapp.dev"],
    ["/dev/design/tables", "Design system — chessapp.dev"],
  ])("%s is “%s”", async (path, title) => {
    await i18n.changeLanguage("en");
    expect(titleAt(path)).toBe(title);
  });

  it("makes the front page and every Blog route an article, and no other (CTA-130)", () => {
    for (const route of leaves(appRoutes)) {
      const handle = route.handle as ShellHandle | undefined;
      const article = route.index === true || route.path === "/blog" || (route.path ?? "").startsWith("/blog/");
      expect(handle?.article === true, `route ${route.path ?? "(index)"}`).toBe(article);
      // An article is the full body: no board square, no aside.
      if (article) expect(handle?.fullWidth, `route ${route.path ?? "(index)"}`).toBe(true);
    }
  });

  it("puts an open record's name first, in either language", async () => {
    await i18n.changeLanguage("en");
    expect(titleAt("/library/tal", "Tal")).toBe("Tal — Collection — chessapp.dev");
    await i18n.changeLanguage("he");
    expect(titleAt("/library/tal", "Tal")).toBe("Tal — אוסף — chessapp.dev");
    await i18n.changeLanguage("en");
  });
});
