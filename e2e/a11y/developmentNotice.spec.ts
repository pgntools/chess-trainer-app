import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { localizedPath } from "./checks";

/*
  The in-development notice (CTA-155), the one page the pass opens *without*
  dismissing it ahead (`checks.ts`'s `dismissDevelopmentNotice`): a modal that
  opens on the first load of a session, audited by axe with colour contrast and
  target size on, closed by Dismiss, and still closed after a reload.
*/

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

for (const [language, title, dismiss] of [
  ["en", "chessapp.dev is still in development", "Dismiss"],
  ["he", "chessapp.dev עדיין בפיתוח", "סגירה"],
] as const) {
  test(`the notice opens on the first load, is accessible, and stays dismissed — ${language}`, async ({ page }) => {
    await page.goto(localizedPath("", language));
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).options({ rules: { "target-size": { enabled: true } } }).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);

    await dialog.getByRole("button", { name: dismiss }).click();
    await expect(dialog).toBeHidden();

    // The same session: a reload and another screen do not bring it back.
    await page.reload();
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(localizedPath("settings/export", language));
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
