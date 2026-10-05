import { expect, test } from "@playwright/test";

import { applyPreferences, open, watchErrors, type ReflowRecord } from "./checks";
import { comboName, reflowCombos, visits } from "./matrix";
import { ROUTES } from "./routes";

/*
  Reflow (WCAG 1.4.10, CTA-116 measured it, CTA-118 gates it): content must be
  usable at 320 CSS px wide without scrolling in two dimensions — the width of
  a 1280 px window at 400 % zoom. Every route is opened at 320 × 256 and held
  to three things:

    - the page does not scroll sideways;
    - `main` has the viewport less the shell's inset — until CTA-118 the
      sidebar was a permanent 280 px rail and `main` came out 0 px wide on all
      21 routes, so none of the page could be read;
    - nothing reaches past the edge that no scrolling box of its own contains
      — a table scrolls inside its region rather than widening the page.

  The measurements still go to `a11y-report/summary.md`, one row a route.

  Measured under every theme of the selected matrix, in both languages, in one
  colour scheme — `reflowCombos()` says why (a theme carries typography, shape
  and component knobs and can change a box's size; a colour scheme cannot).
*/

const VIEWPORT = { width: 320, height: 256 } as const;

/**
 * The shell's board inset, a side (`views/main/Layout.tsx`'s `BOARD_INSET_PX`)
 * — repeated rather than imported, because this spec runs in node and that
 * module is the app's React shell. What `main` must have is the viewport less
 * both insets.
 */
const SHELL_INSET_PX = 16;
const MAIN_MIN_WIDTH_PX = VIEWPORT.width - SHELL_INSET_PX * 2;

for (const combo of reflowCombos()) {
  test.describe(`reflow at 320 px · ${comboName(combo)}`, () => {
    test.use({ viewport: VIEWPORT, locale: combo.language === "he" ? "he-IL" : "en-US" });

    for (const route of ROUTES.filter((candidate) => visits(candidate, combo))) {
      test(route.id, async ({ page }, testInfo) => {
        await applyPreferences(page, combo);
        watchErrors(page);
        await open(page, route, { language: combo.language });

        const measured = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          const isScroller = (element: Element) => {
            const style = getComputedStyle(element);
            return /(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflow}`);
          };
          const clippedByAncestor = (element: Element) => {
            for (let parent = element.parentElement; parent !== null && parent !== document.body; parent = parent.parentElement) {
              if (isScroller(parent) && parent.getBoundingClientRect().width <= width + 1) return true;
            }
            return false;
          };
          const name = (element: Element) => {
            const id = element.getAttribute("data-testid");
            return id !== null ? `[data-testid="${id}"]` : `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(" ")[0]}` : ""}`;
          };
          const found: { selector: string; overflowPx: number }[] = [];
          for (const element of document.body.querySelectorAll("*")) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            // Past the end the reader scrolls to: the right in English, the left in Hebrew.
            const past = Math.max(rect.right - width, -rect.left);
            if (past > 1 && !clippedByAncestor(element)) found.push({ selector: name(element), overflowPx: Math.round(past) });
          }
          found.sort((a, b) => b.overflowPx - a.overflowPx);
          return {
            pageOverflowPx: document.documentElement.scrollWidth - width,
            mainWidthPx: Math.round(document.querySelector("main")?.getBoundingClientRect().width ?? 0),
            // The outermost few say where it starts; the rest are their children.
            offenders: found.slice(0, 5),
          };
        });

        const record: ReflowRecord = { route: route.id, theme: combo.theme, language: combo.language, ...measured };
        await testInfo.attach("reflow-record", { body: JSON.stringify(record), contentType: "application/json" });

        const where = `${route.id} under ${comboName(combo)}`;
        // Soft, so one route reports everything wrong with it at once.
        expect.soft(measured.pageOverflowPx, `${where} scrolls sideways at ${VIEWPORT.width} px`).toBeLessThanOrEqual(1);
        expect
          .soft(measured.mainWidthPx, `${where}: main has the viewport less the shell's inset`)
          .toBeGreaterThanOrEqual(MAIN_MIN_WIDTH_PX);
        expect
          .soft(
            measured.offenders.map((offender) => `${offender.selector} (+${offender.overflowPx} px)`),
            `${where}: elements past the edge that no scrolling box of their own contains`,
          )
          .toEqual([]);
      });
    }
  });
}
