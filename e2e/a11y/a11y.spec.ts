import { test } from "@playwright/test";

import { applyPreferences, check, open, watchErrors } from "./checks";
import { comboName, MATRICES, matrixName, visits } from "./matrix";
import { ROUTES } from "./routes";

/*
  The pass (CTA-116): every shipped route, seeded, under every combination of
  theme, colour scheme and language in the matrix (`A11Y_MATRIX`), against the
  production build. What is asked of each page is `checks.ts`; what is let
  through is `allowlist.ts`.
*/

const matrix = MATRICES[matrixName()];

for (const combo of matrix) {
  test.describe(comboName(combo), () => {
    test.use({
      colorScheme: combo.scheme,
      locale: combo.language === "he" ? "he-IL" : "en-US",
    });

    for (const route of ROUTES.filter((candidate) => visits(candidate, combo))) {
      test(route.id, async ({ page }, testInfo) => {
        await applyPreferences(page, combo);
        const errors = watchErrors(page);
        await open(page, route, { language: combo.language });
        await check(page, testInfo, route, combo, errors);
      });
    }
  });
}
