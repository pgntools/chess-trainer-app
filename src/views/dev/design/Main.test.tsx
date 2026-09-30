import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { BLOCK_FAMILIES } from "../../../blocks/families";
import { themes } from "../../../design-system/themes";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { AXE_PAGE_TIMEOUT_MS, expectNoAxeViolations } from "../../../test/axe";
import { THEME_STORAGE_KEY } from "../../../theme/themeChoice";
import { blocksTier } from "./blocksTier";
import Main from "./Main";

/*
  The dev route (CTA-110): it discovers `src/blocks/**\/*.gallery.tsx` and
  hands the gallery a Blocks tier, keeps the CTA-107 links working, and every
  block's page renders under every theme, as the design system's own pages do
  in `design-system/gallery/everyTheme.test.tsx` — and, as there, axe finds
  no WCAG 2.2 A / AA violation in its demos (CTA-111).
*/

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

const mount = (entry: string) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/dev/design/*" element={<Main />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const preview = () => screen.getByTestId("design-gallery-preview");

/** Every block's page — found as the route finds them. */
const BLOCK_PAGES = Object.keys(import.meta.glob("../../../blocks/**/*.gallery.tsx")).map((path) => {
  const [family, block] = path.split("/").slice(-3, -1);
  return `blocks/${family}/${block}`;
});

let errors: unknown[][];
beforeEach(() => {
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("the design gallery's route", () => {
  it("finds the blocks — the Lobby's table and the folder tree among them", () => {
    expect(BLOCK_PAGES).toEqual(expect.arrayContaining(["blocks/tables/PlayedGamesTable", "blocks/trees/FolderTree"]));
    for (const page of BLOCK_PAGES) expect(BLOCK_FAMILIES.map((family) => family.id)).toContain(page.split("/")[1]);
  });

  it("shows the Blocks tier after Base and Patterns, a family's blocks under it", () => {
    mount("/dev/design/blocks/trees/FolderTree");
    expect(preview()).toHaveAttribute("data-tier", "blocks");
    expect(screen.getByTestId("design-gallery-tier")).toHaveTextContent("Blocks · Trees");
    expect(screen.getByTestId("design-gallery-nav-blocks")).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByTestId("design-gallery-nav-blocks-trees-group")).getByRole("treeitem", { name: /FolderTree/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("lands a CTA-107 section link on one of its components' pages", () => {
    mount("/dev/design/tables");
    expect(screen.getByTestId("where").textContent).toMatch(/^\/dev\/design\/tables\/[A-Za-z]+$/);
  });

  it("lands a family's own link on its first block", () => {
    // The route's own registry says which is first (CTA-116): the tier is
    // read, not a block named here that the next new one would displace.
    const family = blocksTier.sections[0];
    mount(`/dev/design/blocks/${family.id}/`);
    expect(screen.getByTestId("where")).toHaveTextContent(`/dev/design/blocks/${family.id}/${family.modules[0].id}`);
  });

  it("gives the tier every block that has a gallery, and no other", () => {
    const tiered = blocksTier.sections.flatMap((section) => section.modules.map((entry) => `blocks/${section.id}/${entry.id}`));
    expect([...tiered].sort()).toEqual([...BLOCK_PAGES].sort());
  });

  const SCHEMES = [
    ["light", "ltr"],
    ["dark", "rtl"],
    ["light", "rtl"],
    ["dark", "ltr"],
  ] as const;
  const combos = BLOCK_PAGES.flatMap((page) => themes.map((theme, index) => [page, theme.id, ...SCHEMES[index % SCHEMES.length]] as const));

  it.each(combos)("%s under %s · %s · %s renders, with no error and no axe violation", async (page, themeId, mode, direction) => {
    // The gallery opens on the reader's theme; the scheme and direction are its own switches.
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    render(
      <AppThemeWithLang>
        <MemoryRouter initialEntries={[`/dev/design/${page}`]}>
          <Routes>
            <Route path="/dev/design/*" element={<Main />} />
          </Routes>
        </MemoryRouter>
      </AppThemeWithLang>,
    );
    act(() => screen.getByTestId(`design-gallery-mode-${mode}`).click());
    act(() => screen.getByTestId(`design-gallery-direction-${direction}`).click());
    expect(preview()).toHaveAttribute("data-page", page);
    expect(preview()).toHaveAttribute("data-mode", mode);
    expect(preview()).toHaveAttribute("dir", direction);
    expect(within(preview()).getAllByTestId(/^design-gallery-demo-/).length).toBeGreaterThan(0);
    expect(preview()).toHaveAttribute("data-theme", themeId);
    await expectNoAxeViolations(preview());
    expect(errors).toEqual([]);
  }, AXE_PAGE_TIMEOUT_MS);
});
