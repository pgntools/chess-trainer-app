import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import DesignGallery from "../../design-system/gallery/DesignGallery";
import { discoverTiers, pageKeyOf } from "../../design-system/gallery/discover";
import { themes } from "../../design-system/themes";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { AXE_PAGE_TIMEOUT_MS, expectNoAxeViolations } from "../axe";
import { flushEmotionCaches } from "../emotionCaches";
import { MATRIX_SLICES, sliceOf } from "./slices";

/*
  Every component's page — the Base and Patterns tiers (CTA-108, CTA-110) —
  under every registered theme, both schemes and both directions: each
  renders every one of its demos, and nothing on the way — React, MUI, a prop
  type — complains, and axe finds no WCAG 2.2 A / AA violation in the demos
  (CTA-111, `src/test/axe.ts`). What it looks like is the gallery's to show
  in a browser; this is that nothing breaks. The Blocks tier's pages are
  `./blocks.tsx`'s, since the design system cannot import a block.

  Each page is rendered once per theme, the scheme and direction turning
  as the themes go — light LTR, dark RTL, light RTL, dark LTR — so every theme,
  every scheme, every direction and every scheme × direction pair is met on
  every page, at a quarter of the full matrix's cost. `gallery/everyTheme.test.tsx`
  holds the combinations to that, in the pull-request gate; the matrix itself
  is the `gallery` group's (CTA-123), run in slices (`./slices.ts`).
*/

export const designSystemPages = discoverTiers().flatMap((tier) =>
  tier.sections.flatMap((section) =>
    section.modules.map((entry) => ({ key: `${pageKeyOf(tier.id, section.id)}/${entry.id}`, demos: entry.demos.length })),
  ),
);
const SCHEMES = [
  ["light", "ltr"],
  ["dark", "rtl"],
  ["light", "rtl"],
  ["dark", "ltr"],
] as const;
export const designSystemCombos = designSystemPages.flatMap((page) =>
  themes.map((theme, index) => {
    const [mode, direction] = SCHEMES[index % SCHEMES.length];
    return [page.key, theme.id, mode, direction, page.demos] as const;
  }),
);

/** Slice `slice` of the Base and Patterns tiers' matrix — the whole body of a `designSystem.<n>.matrix.test.tsx`. */
export function designSystemMatrix(slice: number) {
  let errors: unknown[][];
  beforeEach(() => {
    errors = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    // Each test's theme leaves its rules behind; without this a slice's later pages slow down (CTA-124).
    flushEmotionCaches();
  });

  describe(`the gallery under every theme, scheme and direction (${slice}/${MATRIX_SLICES.designSystem})`, () => {
    it.each(sliceOf(designSystemCombos, slice, MATRIX_SLICES.designSystem))(
      "%s under %s · %s · %s renders every demo, with no error and no axe violation",
      async (pageKey, themeId, mode, direction, demos) => {
        render(
          <AppThemeWithLang>
            <MemoryRouter>
              <DesignGallery
                section={pageKey}
                sectionPath={(id) => `/dev/design/${id}`}
                startPath="/dev/design"
                initialThemeId={themeId}
                initialMode={mode}
                initialDirection={direction}
              />
            </MemoryRouter>
          </AppThemeWithLang>,
        );
        const preview = screen.getByTestId("design-gallery-preview");
        expect(preview).toHaveAttribute("data-theme", themeId);
        expect(preview).toHaveAttribute("data-mode", mode);
        expect(preview).toHaveAttribute("dir", direction);
        expect(preview).toHaveAttribute("data-page", pageKey);
        expect(within(preview).getAllByTestId(/^design-gallery-demo-/)).toHaveLength(demos);
        await expectNoAxeViolations(preview);
        expect(errors).toEqual([]);
      },
      AXE_PAGE_TIMEOUT_MS,
    );
  });
}
