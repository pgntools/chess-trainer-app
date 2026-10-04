import { defineConfig, devices } from "@playwright/test";

import { BASE_URL, PORT, REPORT_DIR, STATE_PATH } from "./e2e/a11y/env";

/*
  The browser accessibility pass (CTA-116, `yarn test:a11y`): every shipped
  route, seeded, under the theme × scheme × language matrix, against the
  production build. Kept out of Vitest (`vite.config.ts` excludes `e2e/`) —
  this is a real browser over `vite preview`, not jsdom.

  `yarn test:a11y` builds first; `A11Y_MATRIX=reduced` runs the pull-request
  matrix. The reports (the HTML one, the JSON results and this pass's own
  summary, which also fails the run on a stale allowlist entry) land in
  `a11y-report/`.

  `A11Y_CHROMIUM` runs the pass on a Chromium already on the machine instead
  of Playwright's own download — a cloud container whose pre-installed
  browser is an older build than this Playwright expects, and whose network
  will not fetch the new one (`A11Y_CHROMIUM=/opt/pw-browsers/chromium`).
  Unset, nothing changes.
*/
const chromium = process.env.A11Y_CHROMIUM;
export default defineConfig({
  testDir: "./e2e/a11y",
  outputDir: "./a11y-report/traces",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // A page that fails twice is a finding, not a flake — but one retry keeps a
  // slow runner's timeout from failing a night's run.
  retries: process.env.CI ? 1 : 0,
  // A board page runs a WASM Stockfish, so the pages are CPU-heavy: more
  // workers than this starve each other and the engine's first line (waited
  // for) comes late. `A11Y_WORKERS` for a bigger machine.
  workers: Number(process.env.A11Y_WORKERS ?? (process.env.CI ? 2 : 4)),
  // Generous: a page opens, waits for its data and — on a board — up to 45 s
  // for the engine's first line, then axe walks it.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: `${REPORT_DIR}/html`, open: "never" }],
    ["json", { outputFile: `${REPORT_DIR}/results.json` }],
    ["./e2e/a11y/summaryReporter.ts", { outputDir: REPORT_DIR }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    // A desktop window, wide enough for the shell's sidebar, the board and its panel.
    viewport: { width: 1440, height: 900 },
    ...(chromium !== undefined && chromium !== "" && { launchOptions: { executablePath: chromium } }),
  },
  projects: [
    // Puts the seed in through the app's own Import and keeps the browser's
    // storage for every test that follows.
    { name: "setup", testMatch: /seed\.setup\.ts$/ },
    {
      name: "a11y",
      testMatch: /\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: STATE_PATH },
    },
  ],
  webServer: {
    command: `yarn preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
