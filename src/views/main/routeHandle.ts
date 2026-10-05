import type { UIMatch } from "react-router";

import type { AppLanguage } from "../../i18n";
import type { ShareImageLevel } from "../../lib/shareImage";

/**
 * **What a page is, from its address alone** (CTA-135) — what a route's
 * `handle.meta` returns for one match. A pure function of the URL and the
 * app's data, so the browser and a page rendered ahead of time read the same
 * thing; the shell renders it into the document's `<head>`.
 */
export type PageMeta = {
  /** The page's own name, first in its title — "Every screen as cards — Blog — Chess Trainer App". */
  title?: string;
  /** The page's `<meta name="description">`. */
  description?: string;
  /**
   * What the page is to a link preview (CTA-136): `article` (a Blog article,
   * with its dates and tags below) or `website` — the default.
   */
  kind?: "article" | "website";
  /** `YYYY-MM-DD` — an article's `article:published_time`. */
  published?: string;
  /** `YYYY-MM-DD` — an article's `article:modified_time`. */
  modified?: string;
  tags?: readonly string[];
  /**
   * The languages the page is written in (CTA-136) — a page of its own in
   * each: its `hreflang` alternates, the sitemap's entries. Under another
   * language it shows the default language's body, so its canonical is the
   * default language's page. Absent: every language (a screen, translated
   * whole through the catalogs).
   */
  languages?: readonly AppLanguage[];
  /**
   * The page's own levels of its share image's chain, nearest first — its
   * own image, its folders' (`lib/shareImage.ts`). The section's and the
   * site's follow them in every page's head.
   */
  images?: readonly ShareImageLevel[];
};

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
  /**
   * **The page at this address** (CTA-135), for a route whose one pattern
   * serves many pages — the Blog's `/blog/*`: its name and description from
   * the match, in the reader's language. Its `title` goes before the route's,
   * ahead of anything a screen reports through `usePageTitle`; and each
   * address is a page of its own, so moving between two takes the focus to
   * the new one's heading. Absent, the route is titled as it always was.
   */
  meta?: (match: UIMatch, language: AppLanguage) => PageMeta;
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

/** The deepest matched route that describes its pages, or `undefined`. */
const metaMatchOf = (matches: readonly UIMatch[]): UIMatch | undefined =>
  [...matches].reverse().find((match) => handleOf(match)?.meta !== undefined);

/** The page's metadata from the deepest matched route with a `meta`, or `undefined` for none (CTA-135). */
export const pageMetaOf = (matches: readonly UIMatch[], language: AppLanguage): PageMeta | undefined => {
  const match = metaMatchOf(matches);
  return match === undefined ? undefined : handleOf(match)?.meta?.(match, language);
};

/**
 * Which screen the reader is on, for the focus (CTA-112): the route's title
 * key — so a query string or a Settings tab stays on the screen — but every
 * address of a route with `meta` is a page of its own (CTA-135).
 */
export const screenIdOf = (matches: readonly UIMatch[]): string => {
  const titleKey = titleKeyOf(matches);
  const leaf = matches[matches.length - 1]?.pathname ?? "";
  if (metaMatchOf(matches) !== undefined) return `${titleKey ?? ""}:${leaf}`;
  return titleKey ?? leaf;
};

/**
 * A screen's description's catalog key (CTA-136) — `pages.library` →
 * `pageDescriptions.library` — the page's `<meta name="description">` where
 * its `meta` gives none. Not every screen has one: ask the catalog.
 */
export const descriptionKeyOf = (titleKey: string | undefined): string | undefined =>
  titleKey?.startsWith("pages.") === true ? `pageDescriptions.${titleKey.slice("pages.".length)}` : undefined;

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
