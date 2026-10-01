import { cleanup } from "@testing-library/react";

import { ltrCache, rtlCache } from "../design-system/theme";

/*
  **Emptying the app's two emotion caches between tests** (CTA-124). They live
  for a whole test file, so every rule a render inserted stays in
  `document.head` — and jsdom's `getComputedStyle` matches each element
  against every rule in the document. Where a file renders one theme that is
  harmless: its rules stop growing after the first few tests. The gallery's
  matrix renders a new theme, scheme and direction in every test, and axe asks
  for every node's computed style, so its later tests slowed down with each
  one before them — a table page took 8 s alone and over 100 s late in a long
  file. A matrix test calls this after each test instead.

  It unmounts first (`cleanup()` is idempotent; the setup file's own runs
  after a test file's hooks), so nothing on screen loses its styles; the next
  render inserts what it needs afresh.
*/
export const flushEmotionCaches = (): void => {
  cleanup();
  for (const cache of [ltrCache, rtlCache]) {
    cache.sheet.flush();
    for (const key of Object.keys(cache.inserted)) delete cache.inserted[key];
  }
};
