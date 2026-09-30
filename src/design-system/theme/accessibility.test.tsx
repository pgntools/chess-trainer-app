import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import Typography from "@mui/material/Typography";

import { stubReducedMotion } from "../../test/reducedMotion";
import { themes } from "../themes";
import { ACCESSIBILITY_OVERRIDDEN, MIN_TARGET_PX } from "./accessibility";
import { buildTheme } from "./buildTheme";
import { usePrefersReducedMotion } from "./reducedMotion";

/*
  The accessibility baseline `buildTheme` lays over every theme (CTA-111,
  ACCESSIBILITY.md): the focus ring from the theme's tokens, the smallest
  target, the control border, and no motion for a reader who asks for none.
*/

afterEach(() => {
  vi.restoreAllMocks();
});

/** A colour as the DOM writes it back — `#6d6f72` → `rgb(109, 111, 114)`. */
const toRgb = (color: string) => {
  const probe = document.createElement("div");
  probe.style.color = color;
  return probe.style.color;
};

/** A component's `root` style override, resolved against `theme`, as text. */
const overrideOf = (theme: ReturnType<typeof buildTheme>, component: "MuiButtonBase" | "MuiOutlinedInput", slot: string) => {
  const styleOverrides = theme.components?.[component]?.styleOverrides as Record<string, unknown> | undefined;
  const style = styleOverrides?.[slot];
  return JSON.stringify(typeof style === "function" ? style({ theme }) : style);
};

describe("the accessibility baseline in every theme", () => {
  it("is never overridden by a theme's own component overrides", () => {
    for (const theme of themes) {
      for (const component of ACCESSIBILITY_OVERRIDDEN) expect(theme.overrides?.[component], `${theme.id} ${component}`).toBeUndefined();
    }
  });

  it.each(themes.map((theme) => [theme.id, theme]))("%s rings a keyboard focus in its focus-ring colour, at its width", (_id, definition) => {
    for (const mode of ["light", "dark"] as const) {
      const theme = buildTheme(definition, mode, "ltr");
      const root = overrideOf(theme, "MuiButtonBase", "root");
      expect(root).toContain("Mui-focusVisible");
      expect(root).toContain(`${definition.focusRingWidth}px solid`);
      expect(root).toContain(definition[mode].focusRing);
      expect(overrideOf(theme, "MuiOutlinedInput", "notchedOutline")).toContain(definition[mode].controlBorder);
    }
  });

  it("draws the high-contrast theme's ring thicker than the others'", () => {
    const highContrast = themes.find((theme) => theme.id === "high-contrast")!;
    for (const theme of themes.filter((other) => other !== highContrast)) {
      expect(highContrast.focusRingWidth).toBeGreaterThan(theme.focusRingWidth);
    }
  });

  it(`keeps an icon button at ${MIN_TARGET_PX} × ${MIN_TARGET_PX} px or more, even with its padding taken away`, () => {
    render(
      <ThemeProvider theme={buildTheme(themes[0], "light", "ltr")}>
        <IconButton aria-label="Close" size="small" sx={{ p: 0 }}>
          ×
        </IconButton>
      </ThemeProvider>,
    );
    const style = getComputedStyle(screen.getByRole("button", { name: "Close" }));
    expect(style.minWidth).toBe(`${MIN_TARGET_PX}px`);
    expect(style.minHeight).toBe(`${MIN_TARGET_PX}px`);
  });
});

describe("a toggle button's words (CTA-109)", () => {
  it.each(themes.map((theme) => theme.id))("are the measured text.secondary under %s, not MUI's action.active", (id) => {
    const theme = buildTheme(themes.find((candidate) => candidate.id === id)!, "light", "ltr");
    render(
      <ThemeProvider theme={theme}>
        <ToggleButton value="white">White</ToggleButton>
      </ThemeProvider>,
    );
    expect(getComputedStyle(screen.getByRole("button", { name: "White" })).color).toBe(toRgb(theme.palette.text.secondary));
  });
});

describe("no heading by typeface (CTA-112)", () => {
  it.each(themes.map((theme) => theme.id))("writes a subtitle as a paragraph under %s, and a heading only where asked", (id) => {
    const theme = buildTheme(themes.find((candidate) => candidate.id === id)!, "light", "ltr");
    render(
      <ThemeProvider theme={theme}>
        <Typography variant="subtitle1">A bold line</Typography>
        <Typography variant="subtitle2">A smaller one</Typography>
        <Typography variant="subtitle1" component="h2">
          A section
        </Typography>
      </ThemeProvider>,
    );
    expect(screen.getByText("A bold line").tagName).toBe("P");
    expect(screen.getByText("A smaller one").tagName).toBe("P");
    expect(screen.getAllByRole("heading")).toEqual([screen.getByRole("heading", { level: 2, name: "A section" })]);
  });
});

describe("reduced motion", () => {
  it("turns every transition off and the ripple with it", () => {
    const theme = buildTheme(themes[0], "both", "ltr", { reducedMotion: true });
    expect(theme.transitions.create("opacity")).toBe("none");
    expect(theme.transitions.duration.enteringScreen).toBe(0);
    expect(theme.transitions.duration.leavingScreen).toBe(0);
    expect(theme.components?.MuiButtonBase?.defaultProps).toEqual({ disableRipple: true });
  });

  it("changes nothing without it", () => {
    const theme = buildTheme(themes[0], "both", "ltr");
    expect(theme.transitions.create("opacity")).not.toBe("none");
    expect(theme.transitions.duration.enteringScreen).toBeGreaterThan(0);
    expect(theme.components?.MuiButtonBase?.defaultProps).toBeUndefined();
  });

  function Probe() {
    const reduced = usePrefersReducedMotion();
    return <span data-testid="probe">{`${reduced} ${useTheme().transitions.create("opacity")}`}</span>;
  }

  it("is read from the reader's system", () => {
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toMatch(/^false /);
    unmount();
    stubReducedMotion();
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toMatch(/^true /);
  });
});
