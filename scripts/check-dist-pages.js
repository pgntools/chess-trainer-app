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
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

if (problems.length > 0) fail(`\n${problems.join("\n")}`);
console.log(
  `check-dist-pages: ${pages} pages, each with its head, its language and its content; 404.html the template${swa ? `; the sitemap's ${ownCanonicals.size} pages and robots.txt` : ""}.`,
);
