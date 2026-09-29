import { expect, test as setup } from "@playwright/test";

import { STATE_PATH } from "./env";
import { seedZip } from "./seedZip";

/*
  The seed goes in through the app's own Import (Settings → Import), the way a
  reader's data does — no store, no schema, no IndexedDB call of the suite's
  own. The browser's storage afterwards (localStorage and IndexedDB) is kept in
  a file, and every test of the pass starts from it.
*/
setup("seed the app through its own Import", async ({ page }) => {
  await page.goto("settings/import");
  await page.getByTestId("settings-import-input").setInputFiles({
    name: "seed.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(seedZip()),
  });
  await page.getByTestId("settings-import-run").click();

  // Every category came in: the report has no warning and no refusal.
  const report = page.getByTestId("settings-import-done");
  await expect(report).toBeVisible({ timeout: 60_000 });
  for (const category of ["games", "analyses", "repertoires", "collections"]) {
    await expect(page.getByTestId(`settings-import-result-${category}`), category).toBeVisible();
  }

  await page.context().storageState({ path: STATE_PATH, indexedDB: true });
});
