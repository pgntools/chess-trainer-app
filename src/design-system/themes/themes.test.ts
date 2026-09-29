import { describe, expect, it } from "vitest";
import { getContrastRatio, type Theme } from "@mui/material/styles";

import { buildTheme, chessTokensOf } from "../theme";
import { brownTheme } from "./brown";
import { defaultTheme } from "./default";
import { greenTheme } from "./green";
import { highContrastTheme } from "./highContrast";
import { themes } from "./registry";

const NEW_THEMES = [brownTheme, greenTheme, highContrastTheme];

describe("the three themes CTA-108 adds", () => {
  it("are registered after the default, which stays first", () => {
    // A theme added later (`yarn theme:bootstrap`, CTA-115) goes after them.
    expect(themes.slice(0, 4).map((theme) => theme.id)).toEqual(["default", "brown", "green", "high-contrast"]);
  });

  it("keep neutral ids and names — no other site's brand", () => {
    for (const theme of NEW_THEMES) {
      expect(`${theme.id} ${theme.labelKey}`).not.toMatch(/lichess|chess\.?com/i);
      expect(theme.labelKey).toBe(`appearance.themes.${theme.id}`);
    }
  });

  it.each(NEW_THEMES.map((theme) => [theme.id, theme]))("%s builds in every mode and direction, carrying its board", (_id, definition) => {
    for (const mode of ["both", "light", "dark"] as const) {
      for (const direction of ["ltr", "rtl"] as const) {
        const theme = buildTheme(definition, mode, direction);
        expect(theme.direction).toBe(direction);
        expect(chessTokensOf(theme)).toEqual(definition.chess);
      }
    }
  });

  it("each restyles the board: its arrows, and — but for brown, lichess's squares already being the default's — its squares", () => {
    for (const theme of NEW_THEMES) {
      expect(theme.chess.arrowPalettes.classic).not.toEqual(defaultTheme.chess.arrowPalettes.classic);
    }
    expect(greenTheme.chess.board).not.toEqual(defaultTheme.chess.board);
    expect(highContrastTheme.chess.board).not.toEqual(defaultTheme.chess.board);
  });
});

/** Both schemes of the high-contrast theme, as the app builds them. */
const schemes: [string, Theme][] = [
  ["light", buildTheme(highContrastTheme, "light", "ltr")],
  ["dark", buildTheme(highContrastTheme, "dark", "ltr")],
];

describe("the high-contrast theme meets WCAG AA", () => {
  it.each(schemes)("%s: text on every surface at 4.5:1 or better", (_mode, theme) => {
    const { text, background } = theme.palette;
    for (const surface of [background.default, background.paper, background.sunken]) {
      expect(getContrastRatio(text.primary, surface)).toBeGreaterThanOrEqual(7);
      expect(getContrastRatio(text.secondary, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(schemes)("%s: every status colour readable as text on paper, and its button's text on it", (_mode, theme) => {
    const { palette } = theme;
    for (const color of [palette.primary, palette.error, palette.warning, palette.success, palette.info]) {
      expect(getContrastRatio(color.main, palette.background.paper)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(color.contrastText, color.main)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(schemes)("%s: dividers and borders at 3:1 or better (non-text)", (_mode, theme) => {
    expect(getContrastRatio(theme.palette.divider, theme.palette.background.paper)).toBeGreaterThanOrEqual(3);
  });

  it("gives every move mark its scheme's AA shade", () => {
    const light = schemes[0][1].palette.background.paper;
    const dark = schemes[1][1].palette.background.paper;
    for (const tone of Object.values(highContrastTheme.chess.nag)) {
      expect(getContrastRatio(tone.light, light)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(tone.dark, dark)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("writes the board's coordinates and result bars at AA on their squares", () => {
    const { board, filterBoard } = highContrastTheme.chess;
    expect(getContrastRatio(board.lightSquareNotation, board.lightSquare)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(board.darkSquareNotation, board.darkSquare)).toBeGreaterThanOrEqual(4.5);
    for (const bar of Object.values(filterBoard)) {
      expect(getContrastRatio(bar.text, bar.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("rings a keyboard focus", () => {
    const theme = buildTheme(highContrastTheme, "light", "ltr");
    const root = theme.components?.MuiButtonBase?.styleOverrides?.root;
    const styles = typeof root === "function" ? root({ theme } as never) : root;
    expect(JSON.stringify(styles)).toContain("Mui-focusVisible");
    expect(JSON.stringify(styles)).toContain("outline");
  });
});
