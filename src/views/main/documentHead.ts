import { defaultLanguage, type AppLanguage } from "../../languages";
import { localizedAppPath } from "../../lib/languagePath";

/**
 * **A page's `<head>`, for those who read only the HTML** (CTA-136) — search
 * engines and the link previews of chats and feeds, which run no JavaScript.
 * The pre-render (`src/entry-server.tsx`, `scripts/prerender.mjs`) writes it
 * into every page it renders; the browser's own title and description are
 * the shell's (`Layout.tsx`), from the same route handles.
 *
 * Every URL in it is absolute and on the **canonical host** (`chessapp.dev`),
 * whichever host the build is for, so the two deployments never compete in
 * search: the canonical, `og:url`, the `hreflang` alternates and the image.
 * Every page's URL ends in a slash — the `x/index.html` file it is served
 * from.
 */

/** A page's address in a language, absolute — `https://chessapp.dev/he/blog/x/`. `root` ends in a slash; `path` is unprefixed. */
export const pageUrlOf = (root: string, path: string, language: AppLanguage): string =>
  `${root}${localizedAppPath(path, language).slice(1)}`;

/** Open Graph's locale for each language. */
export const OG_LOCALES: Record<AppLanguage, string> = { en: "en_US", he: "he_IL" };

export type DocumentHeadInput = {
  /** The page's language — its URL's. */
  language: AppLanguage;
  /** The unprefixed app path, ending in a slash — `/blog/x/`, `/`. */
  path: string;
  /** The document's `<title>` — "Fischer — Collection — chessapp.dev". */
  title: string;
  /** The page's own name, for a preview's headline — "Fischer". */
  name: string;
  description?: string;
  siteName: string;
  kind: "article" | "website";
  published?: string;
  modified?: string;
  tags?: readonly string[];
  /** The languages the page is written in; under any other its canonical is the default language's page. */
  languages: readonly AppLanguage[];
  /** The canonical host and base — `https://chessapp.dev/`. */
  canonicalRoot: string;
  image?: { url: string; alt?: string; width: number; height: number; type: string };
};

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The page's canonical URL: its own in a language it is written in, else the default language's page. */
export const canonicalUrlOf = (input: Pick<DocumentHeadInput, "canonicalRoot" | "path" | "language" | "languages">): string =>
  pageUrlOf(input.canonicalRoot, input.path, input.languages.includes(input.language) ? input.language : defaultLanguage);

/** **The tags**, as HTML for the template's `<head>` — one per line. */
export const documentHeadHtml = (input: DocumentHeadInput): string => {
  const { language, languages } = input;
  const canonical = canonicalUrlOf(input);
  const meta = (attribute: "name" | "property", key: string, content: string | undefined) =>
    content === undefined || content === "" ? [] : [`<meta ${attribute}="${key}" content="${escapeHtml(content)}">`];
  const alternates = languages.includes(defaultLanguage)
    ? [...languages.map((alt) => [alt, pageUrlOf(input.canonicalRoot, input.path, alt)]), ["x-default", pageUrlOf(input.canonicalRoot, input.path, defaultLanguage)]]
    : languages.map((alt) => [alt, pageUrlOf(input.canonicalRoot, input.path, alt)]);
  const image = input.image;
  return [
    `<title>${escapeHtml(input.title)}</title>`,
    ...meta("name", "description", input.description),
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    ...(languages.length > 1 ? alternates.map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}">`) : []),
    ...meta("property", "og:type", input.kind),
    ...meta("property", "og:site_name", input.siteName),
    ...meta("property", "og:title", input.name),
    ...meta("property", "og:description", input.description),
    ...meta("property", "og:url", canonical),
    ...meta("property", "og:locale", OG_LOCALES[language]),
    ...languages.filter((alt) => alt !== language).flatMap((alt) => meta("property", "og:locale:alternate", OG_LOCALES[alt])),
    ...(image === undefined
      ? []
      : [
          ...meta("property", "og:image", image.url),
          ...meta("property", "og:image:type", image.type),
          ...meta("property", "og:image:width", String(image.width)),
          ...meta("property", "og:image:height", String(image.height)),
          ...meta("property", "og:image:alt", image.alt),
        ]),
    ...(input.kind === "article"
      ? [
          ...meta("property", "article:published_time", input.published),
          ...meta("property", "article:modified_time", input.modified),
          ...(input.tags ?? []).flatMap((tag) => meta("property", "article:tag", tag)),
        ]
      : []),
    ...meta("name", "twitter:card", image === undefined ? "summary" : "summary_large_image"),
    ...meta("name", "twitter:title", input.name),
    ...meta("name", "twitter:description", input.description),
    ...(image === undefined ? [] : [...meta("name", "twitter:image", image.url), ...meta("name", "twitter:image:alt", image.alt)]),
  ].join("\n    ");
};
