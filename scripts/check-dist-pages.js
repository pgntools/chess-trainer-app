#!/usr/bin/env node
/**
 * **The pages, as built** (CTA-136) — `yarn check:pages`, run after `yarn
 * build` (a step of CI's build job, and of each deploy's). The pre-render
 * (`scripts/prerender.mjs`) promises of `dist/`, and this holds it to each:
 *
 * 1. **Every page is there**, in every language — the list is the server
 *    entry's own (`prerenderedPages`, `dist-ssr/entry-server.js`) — at
 *    `<path>/index.html`, which a static host serves with status 200.
 * 2. **Each says what it is**: one `<title>`, a description, a canonical URL
 *    ending in its own path (or, where it is not written in its language,
 *    the default language's), the Open Graph set and its image's words, its
 *    image in `dist/assets/share/`, `<html lang dir>` its URL's language, and
 *    its content in `#root`.
 * 3. **The fallback is the template**: `404.html` boots the app from an
 *    empty `#root` — never a rendered page — and says nothing of one.
 * 4. **On Static Web Apps** (`staticwebapp.config.json` written): the
 *    sitemap lists exactly the pages that are their own canonical, and
 *    `robots.txt` names it.
 * 5. **On Static Web Apps, the page can be cross-origin isolated** (CTA-154):
 *    `globalHeaders` carries COOP and COEP (`scripts/crossOriginIsolation.mjs`),
 *    the Stockfish workers and their `.wasm` are in `dist/` and not left to the
 *    fallback, and no page loads a sub-resource from another origin — which
 *    `Cross-Origin-Embedder-Policy: require-corp` would block. GitHub Pages
 *    cannot set headers, writes no config, and is not held to this.
 * 6. **On Static Web Apps, the host's built-in sign-in is blocked** (CTA-159):
 *    every route of `scripts/swaBlockedAuth.mjs` answers 404, so no reader is
 *    given the auth cookie the Cookies Notice says chessapp.dev never sets.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CROSS_ORIGIN_ISOLATION_HEADERS } from "./crossOriginIsolation.mjs";
import { BLOCKED_AUTH_ROUTES } from "./swaBlockedAuth.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const SERVER_ENTRY = join(ROOT, "dist-ssr/entry-server.js");

const fail = (message) => {
  console.error(`check-dist-pages: ${message}`);
  process.exit(1);
};
if (!existsSync(join(DIST, "index.html")) || !existsSync(SERVER_ENTRY)) fail("no dist/ or dist-ssr/ — run yarn build first");

const { prerenderedPages, supportedLanguages, defaultLanguage, localizedAppPath } = await import(pathToFileURL(SERVER_ENTRY).href);
const RTL = new Set(["he"]);
const problems = [];
const attribute = (html, pattern) => pattern.exec(html)?.[1];
const count = (html, pattern) => (html.match(pattern) ?? []).length;

// 1 and 2. Every page, in every language, saying what it is.
const ownCanonicals = new Set();
let pages = 0;
for (const page of prerenderedPages()) {
  for (const language of supportedLanguages) {
    const path = localizedAppPath(page.path, language);
    const file = join(DIST, `.${path}`, "index.html");
    if (!existsSync(file)) {
      problems.push(`${path}: no index.html`);
      continue;
    }
    pages += 1;
    const html = readFileSync(file, "utf8");
    const where = (message) => problems.push(`${path}: ${message}`);
    if (count(html, /<title>/g) !== 1) where(`${count(html, /<title>/g)} <title>s, not one`);
    if (!/<meta name="description" content="[^"]+">/.test(html)) where("no description");
    const lang = attribute(html, /<html[^>]*\blang="([^"]*)"/);
    const dir = attribute(html, /<html[^>]*\bdir="([^"]*)"/);
    if (lang !== language || dir !== (RTL.has(language) ? "rtl" : "ltr")) where(`<html lang="${lang}" dir="${dir}">, not its URL's ${language}`);
    const canonical = attribute(html, /<link rel="canonical" href="([^"]+)">/);
    if (canonical === undefined) where("no canonical");
    else if (canonical.endsWith(path === "/" ? "/" : path)) ownCanonicals.add(canonical);
    else if (language === defaultLanguage || !canonical.endsWith(page.path)) where(`canonical ${canonical} is neither ${path} nor the default language's page`);
    for (const property of ["og:type", "og:site_name", "og:title", "og:url", "og:locale", "og:image", "og:image:alt", "og:image:width", "og:image:height"]) {
      if (!new RegExp(`<meta property="${property}" content="[^"]+">`).test(html)) where(`no ${property}`);
    }
    const image = attribute(html, /<meta property="og:image" content="[^"]*\/(assets\/share\/[^"]+)">/);
    if (image !== undefined && !existsSync(join(DIST, image))) where(`its image ${image} is not in dist/`);
    if (/<div id="root"><\/div>/.test(html)) where("an empty #root");
  }
}

// 3. The fallback is the template.
const fallback = existsSync(join(DIST, "404.html")) ? readFileSync(join(DIST, "404.html"), "utf8") : "";
if (!fallback.includes('<div id="root"></div>') || fallback.includes('rel="canonical"')) {
  problems.push("404.html is not the app's template — an empty #root and no page's head");
}

// 4. Static Web Apps: the sitemap and robots.
const swa = existsSync(join(DIST, "staticwebapp.config.json"));
if (swa) {
  const sitemap = existsSync(join(DIST, "sitemap.xml")) ? readFileSync(join(DIST, "sitemap.xml"), "utf8") : "";
  const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&")));
  for (const url of ownCanonicals) if (!listed.has(url)) problems.push(`sitemap.xml: no ${url}`);
  for (const url of listed) if (!ownCanonicals.has(url)) problems.push(`sitemap.xml: ${url} is no page's own canonical`);
  const robots = existsSync(join(DIST, "robots.txt")) ? readFileSync(join(DIST, "robots.txt"), "utf8") : "";
  if (!/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m.test(robots)) problems.push("robots.txt names no sitemap");
}

// 5. Static Web Apps: the headers that isolate the page, and nothing they would block.
if (swa) {
  const config = JSON.parse(readFileSync(join(DIST, "staticwebapp.config.json"), "utf8"));
  const sent = Object.fromEntries(Object.entries(config.globalHeaders ?? {}).map(([name, value]) => [name.toLowerCase(), value]));
  for (const [name, value] of Object.entries(CROSS_ORIGIN_ISOLATION_HEADERS)) {
    if (sent[name.toLowerCase()] !== value) problems.push(`staticwebapp.config.json: globalHeaders has no ${name}: ${value}`);
  }
  // The host's built-in sign-in, which would set a cookie the Cookies Notice says the App never sets (CTA-159).
  for (const route of BLOCKED_AUTH_ROUTES) {
    if (!(config.routes ?? []).some((rule) => rule.route === route && rule.statusCode === 404)) {
      problems.push(`staticwebapp.config.json: routes do not answer ${route} with 404 (scripts/swaBlockedAuth.mjs)`);
    }
  }
  // The worker and its wasm are same-origin files the fallback must not answer for.
  if (!(config.navigationFallback?.exclude ?? []).includes("/stockfish/*")) problems.push("staticwebapp.config.json: navigationFallback does not exclude /stockfish/*");
  for (const file of [
    "stockfish/stockfish.wasm.js",
    "stockfish/stockfish.wasm",
    "stockfish/stockfish-19-lite-single/stockfish-19-lite-single.js",
    "stockfish/stockfish-19-lite-single/stockfish-19-lite-single.wasm",
    "stockfish/stockfish-19-lite-multi/stockfish-19-lite.js",
    "stockfish/stockfish-19-lite-multi/stockfish-19-lite.wasm",
  ]) {
    if (!existsSync(join(DIST, file))) problems.push(`dist/${file}: missing — the engine's worker must be served from this origin`);
  }
  // A sub-resource from another origin is blocked under `require-corp` (a link to another site is a navigation, and is not).
  const foreign = /<(?:script|img|iframe|source|video|audio|embed)\b[^>]*\s(?:src|srcset)="(?:https?:)?\/\/[^"]+"|<link\b[^>]*\brel="(?:stylesheet|modulepreload|preload|icon|prefetch)"[^>]*\shref="(?:https?:)?\/\/[^"]+"/gi;
  for (const file of [...new Set(["index.html", "404.html", "app-shell.html"])]) {
    const found = (readFileSync(join(DIST, file), "utf8").match(foreign) ?? []).slice(0, 3);
    for (const tag of found) problems.push(`${file}: a cross-origin sub-resource, blocked by COEP — ${tag}`);
  }
  for (const page of prerenderedPages()) {
    for (const language of supportedLanguages) {
      const file = join(DIST, `.${localizedAppPath(page.path, language)}`, "index.html");
      if (!existsSync(file)) continue;
      for (const tag of (readFileSync(file, "utf8").match(foreign) ?? []).slice(0, 3)) {
        problems.push(`${localizedAppPath(page.path, language)}: a cross-origin sub-resource, blocked by COEP — ${tag}`);
      }
    }
  }
}

if (problems.length > 0) fail(`\n${problems.join("\n")}`);
console.log(
  `check-dist-pages: ${pages} pages, each with its head, its language and its content; 404.html the template${swa ? `; the sitemap's ${ownCanonicals.size} pages and robots.txt; COOP / COEP set, the engine's workers served here, no cross-origin sub-resource` : ""}.`,
);
