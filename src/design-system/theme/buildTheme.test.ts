import { describe, expect, it } from "vitest";
import { createTheme, type Theme } from "@mui/material/styles";
import { heIL } from "@mui/material/locale";

import { defaultTheme } from "../themes";
import { buildTheme } from "./buildTheme";
import { chessTokensOf } from "./chessTokens";

/** A CSS-variables theme's own fields, which MUI's `Theme` type does not declare. */
type VarsTheme = Theme & {
  colorSchemes: Partial<Record<"light" | "dark", { palette: Theme["palette"] }>>;
  generateStyleSheets?: () => unknown[];
};

const build = (...args: Parameters<typeof buildTheme>) => buildTheme(...args) as VarsTheme;

/** Every CSS custom property a built theme's stylesheets declare, joined. */
const cssOf = (theme: Theme) => JSON.stringify((theme as VarsTheme).generateStyleSheets?.() ?? []);

describe("buildTheme", () => {
  it("builds the app's theme: both schemes as CSS variables, switched by the attribute", () => {
    const theme = build(defaultTheme, "both", "ltr");
    expect(theme.vars).toBeDefined();
    expect(theme.colorSchemes.light?.palette.primary.main).toBe("#2563eb");
    expect(theme.colorSchemes.dark?.palette.primary.main).toBe("#60a5fa");
    expect(cssOf(theme)).toContain("data-mui-color-scheme");
    expect(cssOf(theme)).toContain("--mui-palette-background-sunken");
  });

  it("reproduces the look the app had before themes (the default theme's values)", () => {
    const theme = build(defaultTheme, "both", "ltr");
    const light = theme.colorSchemes.light?.palette;
    const dark = theme.colorSchemes.dark?.palette;
    expect(light?.background).toMatchObject({
      default: "#eef2f7",
      paper: "#ffffff",
      translucent: "rgba(238, 242, 247, 0.85)",
      sunken: "#f8fafc",
    });
    expect(dark?.background).toMatchObject({
      default: "#0b0f16",
      paper: "#131a24",
      translucent: "rgba(11, 15, 22, 0.85)",
      sunken: "#0f1621",
    });
    expect(light?.text).toMatchObject({ primary: "#1f2937", secondary: "#646e83" });
    expect(dark?.divider).toBe("#26313f");
    expect(theme.shape.borderRadius).toBe(10);
    expect(theme.typography.button).toMatchObject({ fontWeight: 700, textTransform: "none" });
    expect(theme.components?.MuiButton?.defaultProps).toEqual({ disableElevation: true });
  });

  it("takes the direction and merges the locale bundle", () => {
    const theme = buildTheme(defaultTheme, "both", "rtl", { localization: [heIL] });
    expect(theme.direction).toBe("rtl");
    expect(theme.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage).toBe(
      heIL.components?.MuiTablePagination?.defaultProps?.labelRowsPerPage,
    );
  });

  it("builds one fixed scheme with no variables, for a theme nested in the app's", () => {
    const dark = buildTheme(defaultTheme, "dark", "ltr");
    expect(dark.vars).toBeUndefined();
    expect(dark.palette.mode).toBe("dark");
    expect(dark.palette.background.default).toBe("#0b0f16");
    expect(dark.palette.background.sunken).toBe("#0f1621");

    const light = buildTheme(defaultTheme, "light", "rtl");
    expect(light.palette.mode).toBe("light");
    expect(light.palette.primary.main).toBe("#2563eb");
    expect(light.direction).toBe("rtl");
  });

  it("carries the theme's chess tokens, as values and never as CSS variables", () => {
    for (const mode of ["both", "light", "dark"] as const) {
      expect(buildTheme(defaultTheme, mode, "ltr").chess).toEqual(defaultTheme.chess);
    }
    expect(cssOf(buildTheme(defaultTheme, "both", "ltr"))).not.toContain("--mui-chess");
  });
});

describe("chessTokensOf", () => {
  it("reads a built theme's tokens", () => {
    const chess = { ...defaultTheme.chess, lastMove: "rgba(1, 2, 3, 0.5)" };
    const theme = buildTheme({ ...defaultTheme, chess }, "light", "ltr");
    expect(chessTokensOf(theme).lastMove).toBe("rgba(1, 2, 3, 0.5)");
  });

  it("falls back to the default theme's under a theme buildTheme did not make", () => {
    expect(chessTokensOf(createTheme())).toBe(defaultTheme.chess);
  });

  it("gives the board react-chessboard's own default colours under the default theme", () => {
    expect(defaultTheme.chess.board).toEqual({
      lightSquare: "#F0D9B5",
      darkSquare: "#B58863",
      lightSquareNotation: "#B58863",
      darkSquareNotation: "#F0D9B5",
    });
  });
});
