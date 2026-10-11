/**
 * **Whether this build has the legal pages** (CTA-182) — the Privacy Policy
 * and the Cookies Notice name the site's operator, whose details only the
 * build has (`src/lib/siteOperator.ts`). Without them — a fork, a plain local
 * run, a pull request's build — there is no `/privacy` or `/cookies` route,
 * so no pre-rendered page and no sitemap line, and no footer link. Vite's
 * `define` sets it (`__LEGAL_PAGES__`, `vite.config.ts`); a test of a build
 * without them mocks this module.
 */
export const LEGAL_PAGES_SHOWN: boolean = __LEGAL_PAGES__;
