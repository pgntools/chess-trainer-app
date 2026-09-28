import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { themes } from "../themes";
import DesignGallery from "./DesignGallery";
import { discoverGallery } from "./discover";

/*
  Every section's page under every registered theme, both schemes and both
  directions (CTA-108, acceptance 3): each renders every one of its demos,
  and nothing on the way — React, MUI, a prop type — complains. What it looks
  like is the gallery's to show in a browser; this is that nothing breaks.

  Each section is rendered once per theme, the scheme and direction turning
  as the themes go — light LTR, dark RTL, light RTL, dark LTR — so every theme,
  every scheme, every direction and every scheme × direction pair is met on
  every page, at a quarter of the full matrix's cost.
*/

const sections = discoverGallery();
const SCHEMES = [
  ["light", "ltr"],
  ["dark", "rtl"],
  ["light", "rtl"],
  ["dark", "ltr"],
] as const;
const combos = sections.flatMap((section) =>
  themes.map((theme, index) => {
    const [mode, direction] = SCHEMES[index % SCHEMES.length];
    return [section.id, theme.id, mode, direction] as const;
  }),
);

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

describe("the gallery under every theme, scheme and direction", () => {
  it("meets every theme, scheme, direction and scheme × direction pair", () => {
    expect(new Set(combos.map(([, theme]) => theme))).toEqual(new Set(themes.map((theme) => theme.id)));
    expect(new Set(combos.map(([, , mode, direction]) => `${mode} ${direction}`)).size).toBe(Math.min(4, themes.length));
  });

  it.each(combos)("%s under %s · %s · %s renders every demo, with no error", (sectionId, themeId, mode, direction) => {
    const section = sections.find((candidate) => candidate.id === sectionId);
    render(
      <AppThemeWithLang>
        <MemoryRouter>
          <DesignGallery
            section={sectionId}
            sectionPath={(id) => `/dev/design/${id}`}
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
    const demos = section?.modules.reduce((sum, module) => sum + module.demos.length, 0);
    expect(within(preview).getAllByTestId(`design-gallery-demo-${sectionId}`)).toHaveLength(demos ?? -1);
    expect(errors).toEqual([]);
  });
});
