import type { CSSProperties } from "react";

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

  /** The accessibility baseline's colours (CTA-111), one per scheme — both measured by `themes/contrast.test.ts`. */
  interface Palette {
    /** The keyboard focus ring, at 3:1 or better against every background. */
    focusRing: string;
    /** A form control's resting border (an outlined field), at 3:1 or better against every background. */
    controlBorder: string;
  }

  interface PaletteOptions {
    focusRing?: string;
    controlBorder?: string;
  }

  interface Mixins {
    /**
     * **The keyboard focus ring** (CTA-111) — the theme's `focusRingWidth`
     * in its palette's `focusRing`, 2 px off the element. Spread it under
     * `&:focus-visible` on anything focusable that is not an MUI button (a
     * scrolling region, a plain link); MUI's buttons draw it already. Absent
     * under a theme `buildTheme` did not make.
     */
    focusRing?: CSSProperties;
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
