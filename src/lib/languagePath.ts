// With its extension: the pre-render (`scripts/prerender.mjs`) and the browser pass read this file too.
import { defaultLanguage, supportedLanguages, type AppLanguage } from "../languages.ts";

/**
 * **The language in the address** (CTA-136) — every route answers under a
 * language's prefix, `/he/library`, `/he/blog/<path>/`, and the default
 * language's pages are unprefixed, so the links made before it keep working.
 * The URL decides what a page is in: a Hebrew link opens in Hebrew for
 * whoever follows it, and a crawler, which keeps no preference, finds each
 * language at an address of its own.
 *
 * The prefix sits **between the deployment's base and the app's routes**: it
 * is the router's `basename` (`routerBasename`), so the app's own links —
 * `<Link to="/library">`, a `navigate`, the nav registries — resolve under it
 * with no edit. Pure, over pathnames: the boot (`src/i18n.ts`), the router
 * (`src/App.tsx`), the language switch and the pre-render all read these.
 *
 * Terms: the **base** is Vite's `base` (`import.meta.env.BASE_URL`,
 * `/chess-trainer-app/` or `/`, ending in a slash); an **app path** is a
 * pathname under it, `/`-led — `/he/blog/x/`.
 */

/** The languages that take a prefix — every one but the default. */
export const prefixedLanguages: readonly AppLanguage[] = supportedLanguages.filter((language) => language !== defaultLanguage);

/** A pathname under the base, `/`-led — `/chess-trainer-app/he/x` → `/he/x`. A pathname outside the base is the base itself, `/`. */
export const appPathOf = (pathname: string, base: string): string => {
  const root = base.endsWith("/") ? base : `${base}/`;
  if (pathname === root.slice(0, -1)) return "/";
  return pathname.startsWith(root) ? `/${pathname.slice(root.length)}` : "/";
};

/** The prefix an app path starts with — `he` for `/he/x` and `/he` — or `undefined` for none. A language the app does not ship is no prefix. */
export const languagePrefixOf = (appPath: string): AppLanguage | undefined => {
  const first = appPath.split("/")[1] ?? "";
  return prefixedLanguages.find((language) => language === first);
};

/** The language an app path is in: its prefix's, else the default. */
export const languageOfAppPath = (appPath: string): AppLanguage => languagePrefixOf(appPath) ?? defaultLanguage;

/** An app path without its language prefix — `/he/blog/x/` → `/blog/x/`, `/he` → `/`. */
export const unprefixedAppPath = (appPath: string): string => {
  const language = languagePrefixOf(appPath);
  if (language === undefined) return appPath;
  const rest = appPath.slice(language.length + 1);
  return rest === "" ? "/" : rest;
};

/** An unprefixed app path in a language — `/blog/x/` → `/he/blog/x/`, `/` → `/he/`; the default language's is the path itself. */
export const localizedAppPath = (appPath: string, language: AppLanguage): string =>
  language === defaultLanguage ? appPath : `/${language}${appPath}`;

/**
 * **The router's `basename`** for a language: the base for the default one,
 * the base and the prefix for another — `/chess-trainer-app/he`, with no
 * trailing slash, so `/chess-trainer-app/he` (the Hebrew front page, as a
 * link may write it) matches as `/` and `/chess-trainer-app/hello` does not.
 */
export const routerBasename = (base: string, language: AppLanguage): string =>
  language === defaultLanguage ? base : `${base.endsWith("/") ? base : `${base}/`}${language}`;

/**
 * **The same place in another language** — the URL the language switch moves
 * to: its path re-prefixed, its query and hash kept. A pathname, `?search`
 * and `#hash` as `window.location` holds them; a URL path back.
 */
export const switchedLanguageUrl = (
  location: { pathname: string; search: string; hash: string },
  base: string,
  language: AppLanguage,
): string => {
  const root = base.endsWith("/") ? base : `${base}/`;
  const path = localizedAppPath(unprefixedAppPath(appPathOf(location.pathname, base)), language);
  return `${root}${path.slice(1)}${location.search}${location.hash}`;
};
