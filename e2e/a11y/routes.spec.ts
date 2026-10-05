import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { blogArticleRoutes } from "./blogRoutes";
import { BLOG_READY, BLOG_SAMPLE, ROUTES } from "./routes";

/*
  The pass visits every shipped route (CTA-116) — so the list of routes it
  visits is held to the route table. A screen added to `src/routes.tsx`
  without a line in `routes.ts` fails here, not by going unchecked. (No
  browser: this reads the two files.)
*/

/** The route table's shipped patterns: every `path: "/…"` before the Development section's. */
const shippedPatterns = (): string[] => {
  const source = readFileSync("src/routes.tsx", "utf8");
  const table = source.slice(source.indexOf("export const appRoutes"));
  const beforeDev = table.slice(0, table.indexOf("...devRoutes"));
  return [...beforeDev.matchAll(/path:\s*"([^"]+)"/g)].map((match) => match[1]).filter((path) => path !== "/");
};

/** A pattern that lands on a screen another line visits already, and why. */
const SAME_SCREEN: Record<string, string> = {
  "/settings": "lands on the Export tab, which settings-export visits",
};

test("every shipped route is visited", () => {
  const patterns = shippedPatterns();
  expect(patterns.length, "the route table was read").toBeGreaterThan(10);
  const visited = new Set(ROUTES.map((route) => route.pattern));
  const missing = ["/", ...patterns].filter((pattern) => !visited.has(pattern) && !(pattern in SAME_SCREEN));
  expect(missing, "shipped routes with no line in e2e/a11y/routes.ts").toEqual([]);
});

test("no line visits a route that is not there", () => {
  const known = new Set(["/", ...shippedPatterns()]);
  expect(ROUTES.map((route) => route.pattern).filter((pattern) => !known.has(pattern))).toEqual([]);
});

test("the lines have unique names and paths that keep the base", () => {
  const ids = ROUTES.map((route) => route.id);
  expect(new Set(ids).size).toBe(ids.length);
  // A leading slash would drop `/chess-trainer-app/` and open a 404.
  expect(ROUTES.filter((route) => route.path.startsWith("/")).map((route) => route.id)).toEqual([]);
});

test("every published Blog article is visited, and the hand-kept lists name articles that are there (CTA-135)", () => {
  const articles = blogArticleRoutes().map((article) => article.path);
  expect(articles.length, "the articles were read").toBeGreaterThan(20);
  const visited = new Set(ROUTES.map((route) => route.path));
  expect(articles.filter((path) => !visited.has(`blog/${path}`))).toEqual([]);
  // A renamed or removed article would otherwise drop out of the sample silently.
  expect([...BLOG_SAMPLE, ...Object.keys(BLOG_READY)].filter((path) => !articles.includes(path))).toEqual([]);
});
