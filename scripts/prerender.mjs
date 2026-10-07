#!/usr/bin/env node
/*
  **The pre-render** (CTA-136) — the last step of `yarn build`: every page the
  app lists (`prerenderedPages` in `src/entry-server.tsx` — the front page,
  the Blog, every screen, the shipped Library collections) rendered in every
  language and written into `dist/` as `<path>/index.html`, which a static host
  serves with status 200 at `<path>/`. Its head carries the page's title,
  description, canonical URL, `hreflang` alternates and link-preview tags
  (`src/views/main/documentHead.ts`), its `<html lang dir>` the URL's language.

    vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && node scripts/prerender.mjs

  Read from the environment, all optional:

    DEPLOY_TARGET   gh (GitHub Pages, the default) | swa (Azure Static Web Apps)
    CANONICAL_URL   the canonical host and base, https://chessapp.dev/ — every
                    canonical, og:url, hreflang and image URL, on both hosts

  - **The template is kept pristine** as `dist/app-shell.html` before the front
    page overwrites `dist/index.html`: it is the SPA fallback for every address
    no page is written for (a reader's record, an unknown path) — `404.html`
    is a copy of it on both hosts, and Static Web Apps' `navigationFallback`
    rewrites to it.
  - **The share image** is the first file of the page's chain that exists
    (`src/lib/shareImage.ts`), copied to `dist/assets/share/` under a content
    hash — a changed image is a new URL, which a preview cache cannot hold on
    to — and checked: PNG or JPEG, at least 600 × 315, at most 5 MB (errors),
    near 1.91 : 1 (a warning), its words in the page's language (an error).
    The pages that fall through to the site's own image are listed.
  - **Per host**: `gh` writes a refresh page at each of the Blog's old
    addresses (`redirectFrom`); `swa` writes `staticwebapp.config.json` (the
    fallback, real 301s for those addresses, headers — COOP / COEP among them,
    `scripts/crossOriginIsolation.mjs`), `sitemap.xml` and
    `robots.txt` — which a GitHub Pages project site cannot serve at its
    host's root.

  A page that fails to render, or renders a part that fell back to the browser,
  fails the build.
*/
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CROSS_ORIGIN_ISOLATION_HEADERS } from "./crossOriginIsolation.mjs";

const DIST = resolve("dist");
const SERVER_ENTRY = resolve("dist-ssr/entry-server.js");
const TARGET = process.env.DEPLOY_TARGET ?? "gh";
if (TARGET !== "gh" && TARGET !== "swa") throw new Error(`prerender: DEPLOY_TARGET must be gh or swa, not "${TARGET}"`);
const CANONICAL = (process.env.CANONICAL_URL ?? "https://chessapp.dev/").replace(/\/?$/, "/");

if (!existsSync(resolve(DIST, "index.html"))) throw new Error("prerender: no dist/index.html — run vite build first");
if (!existsSync(SERVER_ENTRY)) throw new Error("prerender: no dist-ssr/entry-server.js — run vite build --ssr src/entry-server.tsx --outDir dist-ssr first");

// The pristine template — kept on a second run, which must not take a rendered front page for it.
const shellFile = resolve(DIST, "app-shell.html");
if (!existsSync(shellFile)) copyFileSync(resolve(DIST, "index.html"), shellFile);
const template = readFileSync(shellFile, "utf8");
if (!template.includes('<div id="root"></div>') || !/<title>[^<]*<\/title>/.test(template)) {
  throw new Error("prerender: dist/app-shell.html is not the app's template (an empty #root and a <title>)");
}
const base = /<script type="module"[^>]*src="([^"]*?)assets\//.exec(template)?.[1] ?? "/";

const server = await import(pathToFileURL(SERVER_ENTRY).href);
const { renderPage, prerenderedPages, blogRedirects, documentHeadHtml, pageUrlOf, localizedAppPath, shareImageOf, imageInfoOf, shareImageProblems, colorSchemeScript, supportedLanguages, defaultLanguage } = server;

const errors = [];
const warnings = [];

/* --- share images --------------------------------------------------- */

const images = new Map();
const imageOf = (file) => {
  if (images.has(file)) return images.get(file);
  const bytes = readFileSync(resolve(file));
  const info = imageInfoOf(bytes);
  const problems = shareImageProblems({ ...info, bytes: bytes.length });
  for (const message of problems.errors) errors.push(`share image ${file} ${message}`);
  for (const message of problems.warnings) warnings.push(`share image ${file} ${message}`);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const name = `${file.split("/").at(-1).replace(/\.[^.]+$/, "")}-${hash}${extname(file).toLowerCase()}`;
  mkdirSync(resolve(DIST, "assets/share"), { recursive: true });
  copyFileSync(resolve(file), resolve(DIST, "assets/share", name));
  const image = { url: `${CANONICAL}assets/share/${name}`, width: info.width, height: info.height, type: info.type === "png" ? "image/png" : "image/jpeg" };
  images.set(file, image);
  return image;
};

/* --- the pages ------------------------------------------------------ */

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fileFor = (appPath) => resolve(DIST, `.${appPath}`, "index.html");
const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

const schemeScript = colorSchemeScript();
const fallbacks = [];
const sitemap = [];
const started = Date.now();
const pages = prerenderedPages();
let written = 0;

for (const page of pages) {
  for (const language of supportedLanguages) {
    const appPath = localizedAppPath(page.path, language);
    let rendered;
    try {
      rendered = await renderPage(page.path, language);
    } catch (error) {
      errors.push(`${appPath}: did not render — ${error?.stack ?? error}`);
      continue;
    }
    for (const error of rendered.errors) errors.push(`${appPath}: a part fell back to the browser — ${error.split("\n")[0]}`);
    const { imageLevels, ...head } = rendered.head;
    const chosen = shareImageOf(imageLevels, (file) => existsSync(resolve(file)));
    if (chosen === undefined) errors.push(`${appPath}: no share image — not even the site's (${imageLevels.at(-1)?.options.map((option) => option.file).join(", ")})`);
    else {
      if (chosen.alt === undefined) errors.push(`${appPath}: its share image ${chosen.file} has no words in ${language} — imageAlt in its ${language} file`);
      if (chosen.level === "default") fallbacks.push(appPath);
    }
    const image = chosen === undefined ? undefined : { ...imageOf(chosen.file), alt: chosen.alt };
    const tags = documentHeadHtml({ ...head, canonicalRoot: CANONICAL, image });
    const html = template
      .replace(/<html[^>]*>/, `<html lang="${language}" dir="${rendered.dir}">`)
      .replace(/<title>[^<]*<\/title>/, `${tags}\n    ${schemeScript}\n    ${rendered.hoisted}${rendered.styles}`)
      .replace('<div id="root"></div>', `<div id="root">${rendered.html}</div>`);
    write(fileFor(appPath), html);
    written += 1;
    if (head.languages.includes(language)) {
      sitemap.push({
        loc: pageUrlOf(CANONICAL, page.path, language),
        lastmod: head.modified ?? head.published,
        alternates:
          head.languages.length > 1
            ? [
                ...head.languages.map((alt) => [alt, pageUrlOf(CANONICAL, page.path, alt)]),
                ...(head.languages.includes(defaultLanguage) ? [["x-default", pageUrlOf(CANONICAL, page.path, defaultLanguage)]] : []),
              ]
            : [],
      });
    }
  }
}

/* --- per host ------------------------------------------------------- */

// The SPA fallback: the template the app boots from, never a rendered page.
copyFileSync(shellFile, resolve(DIST, "404.html"));
const redirects = blogRedirects();

if (TARGET === "gh") {
  rmSync(shellFile);
  // GitHub Pages has no redirects: a page at the old address that sends the reader on, and tells a crawler where the page is now.
  for (const { from, to } of redirects) {
    for (const language of supportedLanguages) {
      const here = `${base}${localizedAppPath(to, language).slice(1)}`;
      const canonical = pageUrlOf(CANONICAL, to, language);
      write(
        fileFor(localizedAppPath(from, language)),
        `<!doctype html>\n<html lang="${language}">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(here)}</title>\n<link rel="canonical" href="${escapeHtml(canonical)}">\n<meta http-equiv="refresh" content="0; url=${escapeHtml(here)}">\n</head>\n<body><a href="${escapeHtml(here)}">${escapeHtml(here)}</a></body>\n</html>\n`,
      );
    }
  }
} else {
  const prefixes = supportedLanguages.filter((language) => language !== defaultLanguage);
  const config = {
    trailingSlash: "auto",
    // Every address no page is written for — a reader's record, a screen's query — boots the app.
    navigationFallback: {
      rewrite: "/app-shell.html",
      exclude: ["/assets/*", "/stockfish/*", "/blog/*", ...prefixes.map((prefix) => `/${prefix}/blog/*`), "*.{png,jpg,jpeg,svg,ico,js,css,json,xml,txt,wasm,map}"],
    },
    // An unknown Blog address: the app's own "no such article", with a real 404.
    responseOverrides: { 404: { rewrite: "/404.html" } },
    routes: [
      ...redirects.flatMap(({ from, to }) =>
        supportedLanguages.flatMap((language) => {
          const old = localizedAppPath(from, language);
          const target = localizedAppPath(to, language);
          return [old, old.replace(/\/$/, "")].map((route) => ({ route, redirect: target, statusCode: 301 }));
        }),
      ),
      { route: "/assets/*", headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
    ],
    // Every response — the page, the Stockfish worker and its .wasm — carries COOP / COEP, so the page is cross-origin isolated (CTA-154).
    globalHeaders: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...CROSS_ORIGIN_ISOLATION_HEADERS,
    },
    mimeTypes: { ".wasm": "application/wasm" },
  };
  writeFileSync(resolve(DIST, "staticwebapp.config.json"), `${JSON.stringify(config, null, 2)}\n`);

  const entry = ({ loc, lastmod, alternates }) =>
    [
      "  <url>",
      `    <loc>${escapeHtml(loc)}</loc>`,
      ...(lastmod === undefined ? [] : [`    <lastmod>${lastmod}</lastmod>`]),
      ...alternates.map(([language, href]) => `    <xhtml:link rel="alternate" hreflang="${language}" href="${escapeHtml(href)}"/>`),
      "  </url>",
    ].join("\n");
  writeFileSync(
    resolve(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemap.map(entry).join("\n")}\n</urlset>\n`,
  );
  writeFileSync(resolve(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${CANONICAL}sitemap.xml\n`);
}

/* --- the report ----------------------------------------------------- */

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`prerender: ${written} pages (${pages.length} × ${supportedLanguages.length} languages) for ${TARGET} in ${seconds} s, canonical ${CANONICAL}`);
for (const warning of warnings) console.warn(`prerender: warning — ${warning}`);
if (fallbacks.length > 0) {
  console.log(`prerender: ${fallbacks.length} pages share the site's own image — an image of their own, their folder's or their section's would be nearer:`);
  for (const path of fallbacks) console.log(`  ${path}`);
}
if (errors.length > 0) {
  for (const error of errors) console.error(`prerender: ${error}`);
  console.error(`prerender: ${errors.length} problems — the build fails`);
  process.exit(1);
}
