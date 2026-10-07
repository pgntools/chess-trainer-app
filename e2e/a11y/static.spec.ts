import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { check, watchErrors } from "./checks";
import type { Language } from "./matrix";
import type { PageRoute } from "./routes";

/*
  **The pages as a crawler reads them** (CTA-136) — the `static` project of
  `playwright.config.ts`, which opens each page **with every script it loads
  blocked** — the app never runs: what a search engine's first pass and every
  link preview (Facebook, X, LinkedIn, Slack, WhatsApp, Telegram) receive.
  (Not with the browser's JavaScript switched off: axe runs in the page, and
  there its timers never fire. The one inline script a page carries is MUI's,
  which sets the colour-scheme attribute and nothing else.) Every page the build pre-rendered — each
  `index.html` under `dist/` (`scripts/prerender.mjs`), the front page, the
  Blog, every screen and the shipped collections, in every language — must
  carry its heading and its content in the HTML itself, read in its URL's
  language, and pass the same checks as the pass with JavaScript on
  (`checks.ts`: axe's WCAG 2.2 A / AA with colour contrast and target size,
  the document's direction, the boards left to right).

  Default theme, light: with no app, no preference is read.
*/

type StaticPage = { id: string; path: string; language: Language; article: boolean };

const DIST = join(process.cwd(), "dist");

/** Every page the build wrote — not a redirect's stub (GitHub Pages' refresh page at an old Blog address). */
const staticPages = (): StaticPage[] =>
  globSync("**/index.html", { cwd: DIST })
    .filter((file) => !readFileSync(join(DIST, file), "utf8").includes('http-equiv="refresh"'))
    .map((file) => {
      const path = file.split("\\").join("/").replace(/index\.html$/, "");
      const language: Language = path.startsWith("he/") ? "he" : "en";
      const unprefixed = language === "en" ? path : path.slice("he/".length);
      const slug = unprefixed.replace(/\/$/, "").replace(/\//g, "-") || "front-page";
      return { id: `static-${slug}-${language}`, path, language, article: /^blog\/.+\/.+/.test(unprefixed) || unprefixed === "" };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

for (const page of staticPages()) {
  test(page.id, async ({ page: tab }, testInfo) => {
    const errors = watchErrors(tab);
    // No app: every script the page asks for is refused.
    await tab.route("**/*", (request) => (request.request().resourceType() === "script" ? request.abort() : request.continue()));
    const response = await tab.goto(page.path);
    expect(response?.status(), "served with status 200").toBe(200);

    // The page's own heading, and — an article — its text, with no script to draw them.
    const heading = tab.locator("main h1");
    await expect(heading).toHaveCount(1);
    await expect(heading).not.toHaveText("");
    if (page.article) expect((await tab.locator("main").innerText()).length, "the article's text in the HTML").toBeGreaterThan(200);

    const board = (await tab.locator('[id$="-square-a8"]').count()) > 0;
    const route: PageRoute = { id: page.id, pattern: "static", path: page.path, ...(board && { board: true }) };
    // The scripts refused above are reported as failed loads; nothing else may be.
    const others = errors.filter((error) => !/Failed to load resource: net::ERR_FAILED/.test(error));
    await check(tab, testInfo, route, { theme: "default", scheme: "light", language: page.language }, others);
  });
}
