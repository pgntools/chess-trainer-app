import { test } from "@playwright/test";

import { applyPreferences, open, watchErrors, type ReflowRecord } from "./checks";
import { LANGUAGES } from "./matrix";
import { ROUTES } from "./routes";

/*
  Reflow (WCAG 1.4.10, CTA-116): content must be usable at 320 CSS px wide
  without scrolling in two dimensions — the width of a 1280 px window at 400 %
  zoom. It is **measured, not gated**: every route is opened at 320 × 256 and
  the horizontal overflow recorded, and the findings go to ACCESSIBILITY.md's
  known gaps with a plan. Nothing here fails on an overflow; it fails only if
  the page cannot be opened and measured.

  Measured once per language in the default theme, light: reflow is about the
  layout, which the theme's colours do not change.
*/

const VIEWPORT = { width: 320, height: 256 } as const;

for (const language of LANGUAGES) {
  test.describe(`reflow at 320 px · ${language}`, () => {
    test.use({ viewport: VIEWPORT, locale: language === "he" ? "he-IL" : "en-US" });

    for (const route of ROUTES) {
      test(route.id, async ({ page }, testInfo) => {
        await applyPreferences(page, { theme: "default", scheme: "light", language });
        watchErrors(page);
        await open(page, route, { onScreen: false });

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

        const record: ReflowRecord = { route: route.id, language, ...measured };
        await testInfo.attach("reflow-record", { body: JSON.stringify(record), contentType: "application/json" });
      });
    }
  });
}
