/**
 * **The app, rendered ahead of time** (CTA-136) — the server entry the build
 * compiles beside the browser's (`vite build --ssr src/entry-server.tsx`, into
 * `dist-ssr/`), which `scripts/prerender.mjs` loads in Node to write every
 * page it lists into `dist/` as a static `index.html`: the Blog, the front
 * page and every screen of the app, in every language. A crawler and a link
 * preview read that HTML; a person's browser then loads the same JavaScript
 * as ever, which **replaces** it (`createRoot`, `src/main.tsx`).
 *
 * This file renders; the script writes. What it gives the script, per page:
 * the markup of `#root`, the styles it used (emotion's, extracted), and what
 * its `<head>` says (`views/main/documentHead.ts`) — the image as its chain's
 * levels, which the script resolves against the files.
 *
 * - **The same tree as the browser's** — `AppThemeWithLang`, `CssBaseline`,
 *   the app's routes — over react-router's static handler, under the
 *   deployment's base and the page's language prefix.
 * - **React 19's `prerender`**, which waits for every lazy chunk (each
 *   article is one) and every `Suspense` boundary, and — with the chunk size
 *   unbounded — writes what they hold in place, not in a hidden segment a
 *   script would move: the page reads the same with JavaScript off.
 * - **What only a browser has stays out**: a store's first read is an effect,
 *   so a screen over IndexedDB renders its loading state, as a reader's
 *   browser first does; a hook over a store gives React a server snapshot.
 */
import { prerender } from "react-dom/static";
import { renderToStaticMarkup } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type UIMatch } from "react-router";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import createEmotionServer from "@emotion/server/create-instance";
import type { EmotionCache } from "@emotion/cache";

import i18n, { rtlLanguages, supportedLanguages, type AppLanguage } from "./i18n";
import AppThemeWithLang from "./theme/AppThemeWithLang";
import { ltrCache, rtlCache } from "./design-system/theme";
import { appRoutes } from "./routes";
import { routerBasename } from "./lib/languagePath";
import { languageAwareOptions, type ShareImageLevel } from "./lib/shareImage";
import { shippedCollections } from "./lib/shippedCollections";
import { SITE_SHARE_IMAGE, shareSectionImage, shareSectionOf } from "./assets/share/sections";
import { BLOG_ARTICLES, BLOG_FOLDERS } from "./views/blog/articles";
import { descriptionKeyOf, pageMetaOf, pageTitleOf, titleKeyOf } from "./views/main/routeHandle";
import { navItemsInFolder } from "./views/main/navItems";
import type { DocumentHeadInput } from "./views/main/documentHead";

export { documentHeadHtml, pageUrlOf } from "./views/main/documentHead";
export { imageInfoOf, shareImageOf, shareImageProblems } from "./lib/shareImage";
export { localizedAppPath } from "./lib/languagePath";
export { supportedLanguages, defaultLanguage } from "./languages";

/* --- which pages ------------------------------------------------------ */

/** A page the build writes: its unprefixed app path, ending in a slash. Every one is written in every language. */
export type PrerenderedPage = { path: string; kind: "blog" | "front" | "screen" | "collection" };

/**
 * **Every page the build writes** — the front page; the Blog's index, its
 * folders and its published articles (a production build's manifest holds
 * no draft); every screen whose route names no record of the reader's; the
 * Settings tabs; and the shipped Library collections. Not a reader's own
 * record (`/repertoires/<id>`, a saved analysis, an uploaded collection) and
 * not a single Library game: those reach the app through the host's fallback.
 */
export const prerenderedPages = (): PrerenderedPage[] => {
  const screens = (appRoutes[0]?.children ?? [])
    .map((route) => route.path)
    // A static path. `/settings` shows its first tab, which is a page of its own below.
    .filter((path): path is string => path !== undefined && !/[:*]/.test(path) && path !== "/settings");
  return [
    { path: "/", kind: "front" },
    { path: "/blog/", kind: "blog" },
    ...BLOG_FOLDERS.map((folder) => ({ path: `/blog/${folder.path}/`, kind: "blog" as const })),
    ...BLOG_ARTICLES.filter((article) => !article.draft).map((article) => ({ path: `/blog/${article.path}/`, kind: "blog" as const })),
    ...screens.map((path) => ({ path: `${path}/`, kind: "screen" as const })),
    ...navItemsInFolder("settings").map((item) => ({ path: `${item.to}/`, kind: "screen" as const })),
    ...shippedCollections.map((collection) => ({ path: `/library/${encodeURIComponent(collection.id)}/`, kind: "collection" as const })),
  ];
};

/** The Blog's old addresses (`redirectFrom`) and where each leads — unprefixed app paths, ending in a slash. */
export const blogRedirects = (): { from: string; to: string }[] =>
  BLOG_ARTICLES.filter((article) => !article.draft).flatMap((article) =>
    (article.redirectFrom ?? []).map((from) => ({ from: `/blog/${from}/`, to: `/blog/${article.path}/` })),
  );

/* --- one page --------------------------------------------------------- */

/** What a page's head says, but its image — which arrives as its chain's levels — and the host it is for. */
export type RenderedHead = Omit<DocumentHeadInput, "canonicalRoot" | "image"> & { imageLevels: ShareImageLevel[] };

export type RenderedPage = {
  /** `#root`'s markup. */
  html: string;
  /** The `<style>` tags of what the page used. */
  styles: string;
  /** What React would have put in the head but the head itself — an image's preload. */
  hoisted: string;
  head: RenderedHead;
  dir: "ltr" | "rtl";
  /** What went wrong while it rendered — a part that fell back to the browser. The build fails on any. */
  errors: string[];
};

// Styles are cached for extraction, not written beside each element.
for (const cache of [ltrCache, rtlCache]) cache.compat = true;

const resetCache = (cache: EmotionCache) => {
  for (const key of Object.keys(cache.inserted)) delete cache.inserted[key];
  for (const key of Object.keys(cache.registered)) delete cache.registered[key];
};

/** React's own head tags, written before the markup in a render with no `<head>`: the ones the template does not write (a preload) go to the head; the title and description are the build's. */
const splitHoisted = (markup: string): { hoisted: string; body: string } => {
  const tag = /^(?:<link\b[^>]*>|<meta\b[^>]*>|<title>[\s\S]*?<\/title>)/;
  const hoisted: string[] = [];
  let body = markup;
  for (let match = tag.exec(body); match !== null; match = tag.exec(body)) {
    if (match[0].startsWith("<link")) hoisted.push(match[0]);
    body = body.slice(match[0].length);
  }
  return { hoisted: hoisted.join(""), body };
};

/**
 * **One `h1`** (CTA-112): the shell renders a hidden one unless the screen
 * says it renders its own — which it says in an effect, and effects do not
 * run here. So where the page holds a heading of its own, the shell's goes.
 */
const SHELL_HEADING = /<h1\b[^>]*\bdata-shell-heading=""[^>]*>[\s\S]*?<\/h1>/;
const withOneHeading = (markup: string): string => {
  const shell = SHELL_HEADING.exec(markup);
  if (shell === null) return markup;
  const rest = markup.slice(0, shell.index) + markup.slice(shell.index + shell[0].length);
  return /<h1\b/.test(rest) ? rest : markup;
};

/** The script MUI writes into a server-rendered page's head, so a dark-mode reader's page is dark before the first paint. */
export const colorSchemeScript = (): string =>
  renderToStaticMarkup(<InitColorSchemeScript attribute="data-mui-color-scheme" />);

/** **One page, in one language** — `path` unprefixed, as `prerenderedPages` lists it. */
export async function renderPage(path: string, language: AppLanguage): Promise<RenderedPage> {
  await i18n.changeLanguage(language);
  const t = i18n.getFixedT(language);
  const base = import.meta.env.BASE_URL;
  const basename = routerBasename(base, language);
  const handler = createStaticHandler(appRoutes, { basename });
  const url = `http://prerender${basename.replace(/\/$/, "")}${path}`;
  const context = await handler.query(new Request(url));
  if (context instanceof Response) throw new Error(`prerender: ${path} answers a redirect (${context.status})`);
  const router = createStaticRouter(handler.dataRoutes, context);

  const dir = rtlLanguages.includes(language) ? "rtl" : "ltr";
  const cache = dir === "rtl" ? rtlCache : ltrCache;
  resetCache(cache);
  const errors: string[] = [];
  const { prelude } = await prerender(
    <AppThemeWithLang>
      <CssBaseline enableColorScheme />
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </AppThemeWithLang>,
    {
      progressiveChunkSize: Number.POSITIVE_INFINITY,
      signal: AbortSignal.timeout(60_000),
      onError: (error) => {
        errors.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
      },
    },
  );
  const { hoisted, body: markup } = splitHoisted(await new Response(prelude).text());
  const body = withOneHeading(markup);
  const emotion = createEmotionServer(cache);
  const styles = emotion.constructStyleTagsFromChunks(emotion.extractCriticalToChunks(body));

  // The head, as the shell makes it (`Layout.tsx`), from the same handles.
  const matches = context.matches.map(
    (match): UIMatch => ({
      id: match.route.id,
      pathname: match.pathname,
      params: match.params,
      loaderData: undefined,
      handle: match.route.handle,
    }),
  );
  const titleKey = titleKeyOf(matches);
  const meta = pageMetaOf(matches, language);
  const siteName = t("app.brandText");
  const screenName = titleKey === undefined ? undefined : t(titleKey);
  const { title } = pageTitleOf(screenName, meta?.title, siteName);
  const descriptionKey = descriptionKeyOf(titleKey);
  const description = meta?.description ?? (descriptionKey !== undefined && i18n.exists(descriptionKey, { lng: language }) ? t(descriptionKey) : undefined);
  const section = shareSectionOf(path.replace(/\/$/, "") || "/");
  const imageLevels: ShareImageLevel[] = [
    ...(meta?.images ?? []),
    ...(section === undefined
      ? []
      : [{ level: "section" as const, from: section.id, options: languageAwareOptions(shareSectionImage(section), language, t(`share.sections.${section.id}`)) }]),
    { level: "default", options: languageAwareOptions(SITE_SHARE_IMAGE, language, t("share.defaultImageAlt")) },
  ];

  return {
    html: body,
    styles,
    hoisted,
    dir,
    errors,
    head: {
      language,
      path,
      title,
      name: path === "/" ? siteName : (meta?.title ?? screenName ?? siteName),
      description,
      siteName,
      kind: meta?.kind ?? "website",
      published: meta?.published,
      modified: meta?.modified,
      tags: meta?.tags,
      languages: meta?.languages ?? supportedLanguages,
      imageLevels,
    },
  };
}
