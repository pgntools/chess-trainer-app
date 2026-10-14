import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { matchRoutes, MemoryRouter, type RouteObject } from "react-router";

import { appRoutes } from "../../routes";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { Footer } from "../main/Footer";

/*
  A build whose site operator is not configured — a fork, a plain local run,
  a pull request's build — has no legal pages (CTA-182): no route (so no
  pre-rendered page and no sitemap line, both read from the route table) and
  no footer link. Vitest's own build has them (`src/test/siteOperator.ts`),
  so this file stands in for one that does not.
*/

vi.mock("./legalPagesShown", () => ({ LEGAL_PAGES_SHOWN: false }));

const paths = (routes: readonly RouteObject[]): (string | undefined)[] =>
  routes.flatMap((route) => [route.path, ...paths(route.children ?? [])]);

describe("a build with no site operator (CTA-182)", () => {
  it("has no /privacy or /cookies route — they fall to no screen", () => {
    expect(paths(appRoutes)).not.toContain("/privacy");
    expect(paths(appRoutes)).not.toContain("/cookies");
    expect(paths(appRoutes)).toContain("/analysis/jobs");
    for (const path of ["/privacy", "/cookies"]) {
      expect(matchRoutes(appRoutes, path)?.at(-1)?.route.path, path).not.toBe(path);
    }
  });

  it("links to neither from the footer, and keeps the version's source link", () => {
    render(
      <AppThemeWithLang>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </AppThemeWithLang>,
    );
    const footer = within(screen.getByTestId("layout-footer"));
    expect(footer.queryByRole("link", { name: "Privacy Policy" })).toBeNull();
    expect(footer.queryByRole("link", { name: "Cookies Notice" })).toBeNull();
    expect(footer.getByRole("link", { name: `v${__APP_VERSION__}` })).toBeInTheDocument();
  });
});
