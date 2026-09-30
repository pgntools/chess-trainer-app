import type { CSSProperties } from "react";
import type { Components, Theme, ThemeOptions } from "@mui/material/styles";

import { paletteColor } from "../themes/overrides";
import "./augment";

/**
 * **The smallest pointer target**, in CSS pixels — WCAG 2.2's 2.5.8 (Target
 * Size, Minimum, AA). Every icon button is at least this wide and tall.
 */
export const MIN_TARGET_PX = 24;

/**
 * The component overrides that are the same for every theme (CTA-111,
 * ACCESSIBILITY.md) — `buildTheme` lays them over the theme's own, so no
 * theme can drop them:
 *
 * - **the focus ring**: `focusRingWidth` of the palette's `focusRing` on
 *   everything that takes the keyboard (MUI's `ButtonBase` family and the
 *   slider's thumb) — inset on a row (a list row, a menu item, a tab), whose
 *   scrolling container would clip it;
 * - **the target size**: an icon button is never under {@link MIN_TARGET_PX};
 * - **the control border**: an outlined field rests on the palette's
 *   `controlBorder` (3:1), not MUI's 1.6:1 grey; hover and focus stay MUI's;
 * - **a toggle button's words** (CTA-109): an unpressed one is written in
 *   the palette's `text.secondary` — measured at 4.5:1 on every surface —
 *   not MUI's `action.active`, a 54 % black no test measures, which a
 *   browser audit found at 4.4:1 on the default and brown pages;
 * - **reduced motion**: no ripple;
 * - **no heading by typeface** (CTA-112): a `subtitle1` / `subtitle2` line
 *   is a paragraph, not MUI's `h6` — a bold line in a panel or a card was a
 *   level-six heading, and every page's outline jumped from its `h1` to a
 *   scatter of them. A title that *is* a heading says so (`component="h2"`).
 *
 * A theme tunes these through its tokens (`focusRingWidth`, `focusRing`,
 * `controlBorder`), never by an override of the same component.
 */
export const accessibilityOverrides = (focusRingWidth: number, reducedMotion: boolean): Components<Omit<Theme, "components">> => {
  const ring = (theme: Parameters<typeof paletteColor>[0]) => focusRingOf(theme, focusRingWidth);
  return {
    MuiButtonBase: {
      ...(reducedMotion && { defaultProps: { disableRipple: true } }),
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-focusVisible": ring(theme),
          "&.MuiListItemButton-root.Mui-focusVisible, &.MuiMenuItem-root.Mui-focusVisible, &.MuiTab-root.Mui-focusVisible": {
            outlineOffset: -focusRingWidth,
          },
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: ({ theme }) => ({ "&.Mui-focusVisible": ring(theme) }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: MIN_TARGET_PX, minHeight: MIN_TARGET_PX },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({ color: paletteColor(theme, (palette) => palette.text.secondary) }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: ({ theme }) => ({ borderColor: paletteColor(theme, (palette) => palette.controlBorder) }),
      },
    },
    MuiTypography: {
      defaultProps: { variantMapping: { subtitle1: "p", subtitle2: "p" } },
    },
  };
};

/** The focus ring's style under `theme` — what `theme.mixins.focusRing` holds. */
export const focusRingOf = (theme: Parameters<typeof paletteColor>[0], width: number): CSSProperties => ({
  outline: `${width}px solid`,
  outlineColor: paletteColor(theme, (palette) => palette.focusRing),
  outlineOffset: 2,
});

/** The component names {@link accessibilityOverrides} owns — a theme's own override of one would be dropped. */
export const ACCESSIBILITY_OVERRIDDEN = [
  "MuiButtonBase",
  "MuiSlider",
  "MuiIconButton",
  "MuiToggleButton",
  "MuiOutlinedInput",
  "MuiTypography",
] as const;

/**
 * **No motion** (CTA-111), for a reader whose system asks for reduced
 * motion (`prefers-reduced-motion: reduce`): every MUI transition is `none`
 * and takes no time, so a dialog, a menu, a collapse or a snackbar appears
 * and leaves at once — their `onEnter` / `onExited` still fire.
 */
export const REDUCED_MOTION_TRANSITIONS: ThemeOptions["transitions"] = {
  create: () => "none",
  duration: {
    shortest: 0,
    shorter: 0,
    short: 0,
    standard: 0,
    complex: 0,
    enteringScreen: 0,
    leavingScreen: 0,
  },
};
