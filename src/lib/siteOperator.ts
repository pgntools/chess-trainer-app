/**
 * **The site's operator, filled in at build time** (CTA-182). The Privacy
 * Policy and the Cookies Notice (`src/views/blog/articles/app-pages/`) are
 * generic, fork-ready texts: where they name who runs the site they say
 * `%OPERATOR_NAME%`, `%OPERATOR_ADDRESS%` and `%PRIVACY_EMAIL%`, and the build
 * puts in the values of its environment (`plugins/siteOperator.ts`) — `.env.local`
 * on a machine, the repository's variables in a deploy (`docs/in-app-pages.md` §5).
 *
 * A value can differ by language, any language the app has: `<VARIABLE>_<LANG>`
 * — `SITE_OPERATOR_NAME_HE` is the name in a `.he.mdx` file, a French build's
 * would be `SITE_OPERATOR_NAME_FR` — and `SITE_OPERATOR_NAME` everywhere else
 * and where a language has none of its own. Nothing here lists the languages:
 * a new one needs no edit, and `unknownSiteVariables` warns of a variable
 * naming one the app has not got (a typo, `_HEB`).
 *
 * **One predicate decides whether the site has legal pages**,
 * `legalPagesConfigured`: the three values, or none. Without them (a fork, a
 * plain local run, a pull request's build) the build leaves the pages out —
 * no route, no footer link, no pre-rendered page, no sitemap line — rather
 * than publish a policy that names no controller. Some but not all is a
 * mistake, and fails the build.
 *
 * Pure and import-free: `vite.config.ts` reads it in Node, as the app does.
 */

/** Each placeholder, and the variable that fills it. */
export const OPERATOR_PLACEHOLDERS = {
  OPERATOR_NAME: "SITE_OPERATOR_NAME",
  OPERATOR_ADDRESS: "SITE_OPERATOR_ADDRESS",
  PRIVACY_EMAIL: "SITE_PRIVACY_EMAIL",
} as const;

export type OperatorPlaceholder = keyof typeof OPERATOR_PLACEHOLDERS;

/** The prefix of every variable, as `loadEnv` takes it. */
export const SITE_ENV_PREFIX = "SITE_";

/** The build's environment, as far as it is read here. */
export type SiteEnv = Readonly<Record<string, string | undefined>>;

/** A placeholder as written in a document: `%OPERATOR_NAME%`. Any `%UPPER_CASE%` word is one, known or not. */
const PLACEHOLDER = /%([A-Z][A-Z0-9_]*)%/g;

const valueOf = (env: SiteEnv, name: string): string | undefined => {
  const value = env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
};

/** The variables `env` lacks for the legal pages — none when it has every one. */
export const missingOperatorVariables = (env: SiteEnv): string[] =>
  Object.values(OPERATOR_PLACEHOLDERS).filter((name) => valueOf(env, name) === undefined);

/**
 * **Whether the build has legal pages**: every variable set → `true`, none →
 * `false`. Some but not all throws, naming the missing ones — a deploy that
 * forgot one should not quietly lose its Privacy Policy.
 */
export const legalPagesConfigured = (env: SiteEnv): boolean => {
  const missing = missingOperatorVariables(env);
  if (missing.length === 0) return true;
  if (missing.length === Object.keys(OPERATOR_PLACEHOLDERS).length) return false;
  throw new Error(
    `The site's operator is half configured: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} unset. ` +
      `Set ${missing.length === 1 ? "it" : "them"} too for the legal pages, or none of ${Object.values(OPERATOR_PLACEHOLDERS).join(", ")} to leave the pages out (docs/in-app-pages.md §5).`,
  );
};

/** A placeholder's value in `language` — its `_<LANG>` variable first, then the plain one. */
export const operatorValue = (env: SiteEnv, placeholder: OperatorPlaceholder, language: string): string | undefined => {
  const name = OPERATOR_PLACEHOLDERS[placeholder];
  return (language === "en" ? undefined : valueOf(env, `${name}_${language.toUpperCase()}`)) ?? valueOf(env, name);
};

/**
 * The `SITE_*` variables of `env` the build reads none of — neither one of
 * the three nor `<one>_<LANG>` for a language of `languages` but the default,
 * whose value is the plain one's. A typo, or a language the app has not got
 * (yet): its value would be silently ignored, so the build warns of it.
 * `languages` is passed in, so this module stays import-free.
 */
export const unknownSiteVariables = (env: SiteEnv, languages: readonly string[], defaultLanguage: string): string[] => {
  const known = new Set<string>(Object.values(OPERATOR_PLACEHOLDERS));
  for (const name of Object.values(OPERATOR_PLACEHOLDERS)) {
    for (const language of languages) if (language !== defaultLanguage) known.add(`${name}_${language.toUpperCase()}`);
  }
  return Object.keys(env).filter((name) => name.startsWith(SITE_ENV_PREFIX) && !known.has(name) && valueOf(env, name) !== undefined).sort();
};

/**
 * MDX reads `{` and `<` as code: a value is inserted as text, so those (and
 * the backslash that escapes them) are escaped. Markdown in a value — `*`,
 * `_` — stays Markdown.
 */
const asMdxText = (value: string): string => value.replace(/[\\{}<>]/g, (character) => `\\${character}`);

/**
 * **A document with its placeholders filled** for `language` (`en`, `he` —
 * the file's own). An unknown placeholder, or a known one with no value,
 * throws, naming it: a page must not go out with `%OPERATOR_NAME%` in it.
 */
export const fillOperatorPlaceholders = (text: string, env: SiteEnv, language: string): string =>
  text.replace(PLACEHOLDER, (_match, word: string) => {
    if (!(word in OPERATOR_PLACEHOLDERS)) {
      throw new Error(`%${word}% is no placeholder — the known ones are ${Object.keys(OPERATOR_PLACEHOLDERS).map((known) => `%${known}%`).join(", ")}`);
    }
    const value = operatorValue(env, word as OperatorPlaceholder, language);
    if (value === undefined) throw new Error(`%${word}% has no value: ${OPERATOR_PLACEHOLDERS[word as OperatorPlaceholder]} is unset`);
    return asMdxText(value);
  });

