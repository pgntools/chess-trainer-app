import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

import { themes } from "../../design-system/themes";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { THEME_STORAGE_KEY } from "../../theme/themeChoice";
import Main from "../../views/dev/design/Main";
import { AXE_PAGE_TIMEOUT_MS, expectNoAxeViolations } from "../axe";
import { flushEmotionCaches } from "../emotionCaches";
import { MATRIX_SLICES, sliceOf } from "./slices";

/*
  Every block's page (CTA-110) under every theme, as the design system's own
  pages are in `./designSystem.tsx` — and, as there, axe finds no WCAG 2.2
  A / AA violation in its demos (CTA-111). Rendered through the dev route,
  `views/dev/design/Main.tsx`, which is what finds the blocks; that route's
  own behaviour is `views/dev/design/Main.test.tsx`'s, in the pull-request
  gate. The matrix is the `gallery` group's (CTA-123), run in slices
  (`./slices.ts`).
*/

const preview = () => screen.getByTestId("design-gallery-preview");

/** Every block's page — found as the route finds them. */
export const blockPages = Object.keys(import.meta.glob("../../blocks/**/*.gallery.tsx")).map((path) => {
  const [family, block] = path.split("/").slice(-3, -1);
  return `blocks/${family}/${block}`;
});

const SCHEMES = [
  ["light", "ltr"],
  ["dark", "rtl"],
  ["light", "rtl"],
  ["dark", "ltr"],
] as const;
export const blockCombos = blockPages.flatMap((page) => themes.map((theme, index) => [page, theme.id, ...SCHEMES[index % SCHEMES.length]] as const));

/** Slice `slice` of the Blocks tier's matrix — the whole body of a `blocks.<n>.matrix.test.tsx`. */
export function blocksMatrix(slice: number) {
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

  describe(`the design gallery's route — every block under every theme (${slice}/${MATRIX_SLICES.blocks})`, () => {
    it.each(sliceOf(blockCombos, slice, MATRIX_SLICES.blocks))(
      "%s under %s · %s · %s renders, with no error and no axe violation",
      async (page, themeId, mode, direction) => {
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
      },
      AXE_PAGE_TIMEOUT_MS,
    );
  });
}
