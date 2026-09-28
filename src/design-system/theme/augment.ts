import type { ChessTokens } from "../themes/types";

/**
 * The app's additions to MUI's theme types — global once this file is in the
 * program, so it is imported (for its types) by `buildTheme.ts`.
 */
declare module "@mui/material/styles" {
  interface TypeBackground {
    /** Header fill — translucent so the body shows through the blur. */
    translucent: string;
    /** Inset surface: the sidebar rail and the right-hand analysis panel. */
    sunken: string;
  }

  interface Theme {
    /**
     * The board's colours (CTA-107). Set on every theme `buildTheme` makes;
     * absent only under a theme it did not make (MUI's default, in a test
     * that renders without the app's provider) — which is why it is read
     * through `chessTokensOf` / `useChessTokens`, never directly.
     */
    chess?: ChessTokens;
  }

  interface ThemeOptions {
    chess?: ChessTokens;
  }
}

export {};
