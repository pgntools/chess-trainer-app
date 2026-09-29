import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

import { ALLOWLIST, type AllowedGap } from "./allowlist";
import { comboName, type Combo, type Language } from "./matrix";
import { drawsPieces, type PageRoute } from "./routes";

/*
  What the pass asks of a page (CTA-116) — the checks jsdom cannot make:

    - axe's WCAG 2.2 A / AA rules **with colour contrast and target size on**
      (`src/test/axe.ts` switches both off, because jsdom paints and lays out
      nothing);
    - no console error, no uncaught exception;
    - the document reads right to left under Hebrew and left to right under
      English, and every chessboard runs left to right in both.

  A violation the allowlist covers is counted and let through; any other fails.
*/

/** The rule sets `src/test/axe.ts` runs, so the two passes judge by the same standard. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

/** The theme, the colour scheme and the language a page is opened under — the app's own preference keys. */
export const applyPreferences = async (page: Page, { theme, scheme, language }: Combo): Promise<void> => {
  await page.addInitScript(
    ([themeId, mode, lang]) => {
      localStorage.setItem("chessapp.theme", themeId);
      localStorage.setItem("mui-mode", mode);
      localStorage.setItem("i18nextLng", lang);
    },
    [theme, scheme, language],
  );
};

/** Console errors and uncaught exceptions of a page, collected from now on. */
export const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));
  return errors;
};

/**
 * Opens a route and waits until it has what it shows: its heading, its data,
 * its board, its engine's first line. `onScreen: false` waits for them to be in
 * the page rather than on it — the reflow measurement, at a width where the
 * shell's sidebar leaves `main` none (ACCESSIBILITY.md).
 */
export const open = async (page: Page, route: PageRoute, { onScreen = true }: { onScreen?: boolean } = {}): Promise<void> => {
  const shown = (locator: Locator) => (onScreen ? expect(locator).toBeVisible() : expect(locator).toBeAttached());
  await page.goto(route.path);
  await shown(page.locator("main h1").first());
  if (route.ready !== undefined) await shown(route.ready(page).first());
  if (route.board === true) await shown(page.locator('[id$="-square-a8"]').first());
  // A store being read, a table being filled: busy until it is done. The
  // engine's placeholder rows are busy until its first line, waited for below.
  await expect(page.locator('main [aria-busy="true"]:not([data-testid$="-pending"])')).toHaveCount(0);
  // A board with the engine's lines: the lines are on the page, not their placeholders.
  const lines = page.getByTestId("best-variations");
  if ((await lines.count()) > 0 && (await lines.getByTestId("variations-toggle").isChecked())) {
    await (onScreen ? expect(page.getByTestId("variation-1-line")).toBeVisible({ timeout: 45_000 }) : expect(page.getByTestId("variation-1-line")).toBeAttached({ timeout: 45_000 }));
  }
  await page.evaluate(() => document.fonts.ready.then(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))));
};

/** What one page's check found, for the summary. */
export type PageRecord = {
  route: string;
  /** The page draws chess pieces (`drawsPieces`) — what an allowlist entry's scope asks. */
  pieces: boolean;
  combo: Combo;
  /** Allowlist entry id → how many nodes it let through on this page. */
  allowlisted: Record<string, number>;
  /** What was not let through: axe rule → selectors. */
  violations: { rule: string; help: string; targets: string[] }[];
  consoleErrors: string[];
  dir: { document: string; lang: string; boards: string[] };
};

/** What the reflow measurement found on one page (`reflow.spec.ts`). */
export type ReflowRecord = {
  route: string;
  language: Language;
  /** The page's scroll width less its client width: how far it scrolls sideways. 0: it does not. */
  pageOverflowPx: number;
  /** How wide the page's `main` is: where the sidebar takes the viewport it is none, and nothing of the page can be read. */
  mainWidthPx: number;
  /** The elements reaching past the viewport that no scrolling box of their own contains, widest first. */
  offenders: { selector: string; overflowPx: number }[];
};

const covers = (entry: AllowedGap, rule: string, target: string, route: PageRoute, combo: Combo): boolean =>
  entry.rule === rule &&
  entry.target.test(target) &&
  (entry.on?.pieces !== true || drawsPieces(route)) &&
  (entry.on?.themes === undefined || entry.on.themes.includes(combo.theme));

/** Runs the checks on the page as it is, attaches the record, and fails the test on anything not allowlisted. */
export const check = async (page: Page, testInfo: TestInfo, route: PageRoute, combo: Combo, errors: string[]): Promise<void> => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const allowlisted: Record<string, number> = {};
  const violations: PageRecord["violations"] = [];
  for (const violation of results.violations) {
    const targets: string[] = [];
    for (const node of violation.nodes) {
      const selector = node.target.join(" ");
      const entry = ALLOWLIST.find((candidate) => covers(candidate, violation.id, selector, route, combo));
      if (entry !== undefined) allowlisted[entry.id] = (allowlisted[entry.id] ?? 0) + 1;
      else targets.push(`${selector}\n        ${node.failureSummary?.replace(/\n/g, "\n        ") ?? ""}`);
    }
    if (targets.length > 0) violations.push({ rule: violation.id, help: `${violation.help} — ${violation.helpUrl}`, targets });
  }

  const dir = await page.evaluate(() => ({
    document: document.documentElement.dir,
    lang: document.documentElement.lang,
    // Each board's squares sit in one grid; its direction is what puts a1 at the left.
    boards: [...document.querySelectorAll('[id$="-square-a8"]')].map((square) => `${square.id}: ${getComputedStyle(square.parentElement ?? square).direction}`),
  }));

  const record: PageRecord = { route: route.id, pieces: drawsPieces(route), combo, allowlisted, violations, consoleErrors: [...errors], dir };
  await testInfo.attach("a11y-record", { body: JSON.stringify(record), contentType: "application/json" });

  // Soft, so one page reports everything wrong with it at once.
  expect.soft(dir.document, `document dir under ${comboName(combo)}`).toBe(combo.language === "he" ? "rtl" : "ltr");
  expect.soft(dir.lang, "document lang").toBe(combo.language);
  expect.soft(dir.boards.filter((board) => !board.endsWith(": ltr")), "boards that do not run left to right").toEqual([]);
  if (route.board === true) expect.soft(dir.boards.length, "a board on this page").toBeGreaterThan(0);
  expect.soft(errors, "console errors and uncaught exceptions").toEqual([]);
  expect
    .soft(
      violations.map((violation) => `${violation.rule}: ${violation.help}\n      ${violation.targets.join("\n      ")}`),
      "axe WCAG 2.2 A / AA violations (colour contrast and target size included)",
    )
    .toEqual([]);
};
