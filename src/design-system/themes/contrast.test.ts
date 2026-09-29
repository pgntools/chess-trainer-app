import { describe, expect, it } from "vitest";
import { decomposeColor, getContrastRatio, recomposeColor, type Theme } from "@mui/material/styles";

import { buildTheme } from "../theme";
import { themes } from "./registry";
import type { ThemeDefinition } from "./types";

/*
  The accessibility baseline's contrast (CTA-111, ACCESSIBILITY.md): every
  registered theme, in light and dark, measured over its tokens — jsdom
  paints nothing, so axe cannot measure a colour in the gallery's tests and
  this does instead. WCAG 2.2 AA: 4.5:1 for text, 3:1 for a control's
  boundary and the focus ring (1.4.11). A theme that fails is fixed by the
  smallest token change, each listed in docs/design/README.md's themes
  section.
*/

const TEXT = 4.5;
const NON_TEXT = 3;

/** `color` as it shows over `background` — MUI's own contrast text is a translucent black. */
const over = (color: string, background: string): string => {
  const fg = decomposeColor(color);
  const alpha = fg.type === "rgba" ? (fg.values[3] ?? 1) : 1;
  if (alpha >= 1) return color;
  const bg = decomposeColor(background);
  const mixed = [0, 1, 2].map((i) => Math.round(fg.values[i] * alpha + bg.values[i] * (1 - alpha)));
  return recomposeColor({ type: "rgb", values: mixed as [number, number, number] });
};

const ratio = (color: string, background: string) => getContrastRatio(over(color, background), background);

const schemes = themes.flatMap((definition) =>
  (["light", "dark"] as const).map((mode) => [`${definition.id} · ${mode}`, buildTheme(definition, mode, "ltr"), definition] as const),
);

/** The surfaces text and controls sit on: the page, a card or panel, the sunken rail. */
const surfaces = (theme: Theme) => {
  const { background } = theme.palette;
  return { default: background.default, paper: background.paper, sunken: background.sunken };
};

const PALETTE_COLOURS = ["primary", "secondary", "error", "warning", "info", "success"] as const;
const TONES = ["primary", "error", "warning", "info", "success"] as const;

describe.each(schemes)("%s meets WCAG 2.2 AA", (_name, theme) => {
  it("text.secondary on a raised row — the paper under action.hover (CTA-113) — at 4.5:1", () => {
    const row = over(theme.palette.action.hover, theme.palette.background.paper);
    expect(ratio(theme.palette.text.secondary, row)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(Object.entries(surfaces(theme)))("text.primary and text.secondary on background.%s at 4.5:1", (_surface, background) => {
    expect(ratio(theme.palette.text.primary, background)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(theme.palette.text.secondary, background)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(PALETTE_COLOURS)("%s: its contrastText on its main at 4.5:1 (a contained button, a chip)", (colour) => {
    const { main, contrastText } = theme.palette[colour];
    expect(ratio(contrastText, main)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(TONES)("%s as text (a status line, a link, a text button) on every surface at 4.5:1", (tone) => {
    for (const background of Object.values(surfaces(theme))) {
      expect(ratio(theme.palette[tone].main, background)).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it("the focus ring and a control's border on every surface at 3:1", () => {
    for (const background of Object.values(surfaces(theme))) {
      expect(ratio(theme.palette.focusRing, background)).toBeGreaterThanOrEqual(NON_TEXT);
      expect(ratio(theme.palette.controlBorder, background)).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});

/**
 * **The board's coordinates on their squares.** The high-contrast theme
 * writes them at AA; the others keep the traditional board look — the
 * coordinates in the other square's colour — and are a known gap
 * (ACCESSIBILITY.md), measured here so the document stays true: a change to
 * a board's squares shows up as a changed ratio.
 */
const COORDINATE_GAPS: Record<string, { light: number; dark: number }> = {
  default: { light: 2.3, dark: 2.3 },
  brown: { light: 2.3, dark: 2.3 },
  green: { light: 2.84, dark: 2.84 },
};

const coordinates = ({ chess: { board } }: ThemeDefinition) => ({
  light: ratio(board.lightSquareNotation, board.lightSquare),
  dark: ratio(board.darkSquareNotation, board.darkSquare),
});

describe("the board's coordinates on their squares", () => {
  it("are at AA in the high-contrast theme", () => {
    const measured = coordinates(themes.find((theme) => theme.id === "high-contrast")!);
    expect(measured.light).toBeGreaterThanOrEqual(TEXT);
    expect(measured.dark).toBeGreaterThanOrEqual(TEXT);
  });

  it("are the known gap ACCESSIBILITY.md records in every other theme", () => {
    const others = themes.filter((theme) => theme.id !== "high-contrast");
    expect(Object.keys(COORDINATE_GAPS).sort()).toEqual(others.map((theme) => theme.id).sort());
    for (const theme of others) {
      const measured = coordinates(theme);
      expect(measured.light, `${theme.id} light`).toBeCloseTo(COORDINATE_GAPS[theme.id].light, 2);
      expect(measured.dark, `${theme.id} dark`).toBeCloseTo(COORDINATE_GAPS[theme.id].dark, 2);
    }
  });
});
