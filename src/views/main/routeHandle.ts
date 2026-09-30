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
  /**
   * The screen's name — a catalog key (`pages.*`), CTA-112. The shell makes
   * the page title of it ("Lobby — Chess Trainer App"), names the `main`
   * landmark by it and renders it as the page's `h1`. It is also the screen's
   * identity: a navigation between two routes with the same title (a Settings
   * tab to another, one Library game to the next) stays on the screen and
   * leaves the focus where it was.
   */
  title?: string;
};

/** The handle a full-width route carries. */
export const FULL_WIDTH_ROUTE: ShellHandle = { fullWidth: true };

const handleOf = (match: UIMatch): ShellHandle | undefined => match.handle as ShellHandle | undefined;

/** Whether any matched route asks for the full body. */
export const isFullWidthRoute = (matches: readonly UIMatch[]): boolean =>
  matches.some((match) => handleOf(match)?.fullWidth === true);

/** The deepest matched route's title key, or `undefined` for a route that names none. */
export const titleKeyOf = (matches: readonly UIMatch[]): string | undefined =>
  matches.reduce<string | undefined>((key, match) => handleOf(match)?.title ?? key, undefined);

/**
 * **The page title** (CTA-112): the most specific first, the app last —
 * "Carlsen games — Library — Chess Trainer App". `heading` is the same without
 * the app's name: the page's `h1` and its `main` landmark's name.
 */
export const pageTitleOf = (
  screen: string | undefined,
  detail: string | undefined,
  app: string,
): { title: string; heading: string } => {
  const parts = [detail, screen].filter((part): part is string => part !== undefined && part !== "");
  const heading = parts.length === 0 ? app : parts.join(" — ");
  return { heading, title: parts.length === 0 ? app : `${heading} — ${app}` };
};
