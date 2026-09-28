import type { UIMatch } from "react-router";

/**
 * What a route may tell the shell through its `handle` (react-router's
 * per-route data, read by `Layout.tsx` with `useMatches`). Optional: a route
 * with no handle gets the shell it always had.
 */
export type ShellHandle = {
  /**
   * The screen is not a board: the shell gives it the whole body — no board
   * square, no right-hand aside, no `ForceLTR` (nothing in it is a board, so
   * it mirrors with the app). The design gallery is the user (CTA-107).
   */
  fullWidth?: boolean;
};

/** The handle a full-width route carries. */
export const FULL_WIDTH_ROUTE: ShellHandle = { fullWidth: true };

/** Whether any matched route asks for the full body. */
export const isFullWidthRoute = (matches: readonly UIMatch[]): boolean =>
  matches.some((match) => (match.handle as ShellHandle | undefined)?.fullWidth === true);
