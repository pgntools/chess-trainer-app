import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { BLOCK_FAMILIES } from "../../../blocks/families";
import { themes } from "../../../design-system/themes";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { blockCombos, blockPages } from "../../../test/galleryMatrix/blocks";
import { blocksTier } from "./blocksTier";
import Main from "./Main";

/*
  The dev route (CTA-110): it discovers `src/blocks/**\/*.gallery.tsx` and
  hands the gallery a Blocks tier, and keeps the CTA-107 links working. That
  every block's page renders under every theme with no axe violation (CTA-111)
  is the gallery's axe matrix, `src/test/galleryMatrix/blocks.tsx` — the
  `gallery` test group, run nightly and on demand (CTA-123); this holds it to
  every block and every theme.
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
    expect(screen.getByTestId("design-gallery-breadcrumbs-blocks")).toHaveTextContent("Blocks");
    expect(screen.getByTestId("design-gallery-breadcrumbs-blocks-trees")).toHaveTextContent("Trees");
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

  it("hands the gallery's axe matrix every block's page, under every theme", () => {
    // The matrix itself is the `gallery` group's, run nightly (CTA-123).
    expect([...blockPages].sort()).toEqual([...BLOCK_PAGES].sort());
    for (const page of BLOCK_PAGES)
      expect(blockCombos.filter(([combo]) => combo === page).map(([, theme]) => theme)).toEqual(themes.map((theme) => theme.id));
  });
});
