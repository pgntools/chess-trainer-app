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
   * The screen is an article — the front page and the Blog (CTA-130): the
   * full body as `fullWidth` gives it, with the content in one column
   * centred at a readable width (`ARTICLE_MAX_WIDTH_PX`),
   * the whole body's width on a window narrower than that. The column
   * scrolls the page, not the screen inside it. Implies `fullWidth`.
   */
  article?: boolean;
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

/**
 * An article's column at its widest, in pixels (CTA-130): prose at a readable
 * line length on a wide window, and still room for a row of three boards or a
 * crosstable. A maximum, not a width — under it the column is the body's
 * whole width, down to 320 px (WCAG 1.4.10, the reflow gate).
 */
export const ARTICLE_MAX_WIDTH_PX = 960;

/** The handle an article route carries — the front page and every Blog route (CTA-130). */
export const ARTICLE_ROUTE: ShellHandle = { fullWidth: true, article: true };

const handleOf = (match: UIMatch): ShellHandle | undefined => match.handle as ShellHandle | undefined;

/** Whether any matched route asks for the full body — an article does too. */
export const isFullWidthRoute = (matches: readonly UIMatch[]): boolean =>
  matches.some((match) => handleOf(match)?.fullWidth === true || handleOf(match)?.article === true);

/** Whether any matched route asks for the article look (CTA-130). */
export const isArticleRoute = (matches: readonly UIMatch[]): boolean =>
  matches.some((match) => handleOf(match)?.article === true);

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
