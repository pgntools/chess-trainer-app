import { resolve } from "node:path";

/*
  Where the accessibility pass runs (CTA-116): the production build, served by
  `vite preview` under the deployed base path — the same sub-path GitHub Pages
  serves, so a link or an asset that only works at `/` fails here.
*/

/** The port `vite preview` is given. `A11Y_PORT` moves it, e.g. to run two worktrees at once. */
export const PORT = Number(process.env.A11Y_PORT ?? 4173);

/**
 * `vite.config.ts`'s `base` — from the same `BASE_PATH` the build reads
 * (CTA-136), so the pass runs against either host's build; unset, the GitHub
 * Pages project site's.
 */
const BASE_PATH = ((value) => {
  if (value === undefined || value.trim() === "") return "/chess-trainer-app/";
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "/" : `/${trimmed}/`;
})(process.env.BASE_PATH);

/** Every route is visited relative to this, so it ends in a slash. */
export const BASE_URL = `http://localhost:${PORT}${BASE_PATH}`;

/** The seeded browser state (localStorage and IndexedDB), written by the setup project and read by every test. */
export const STATE_PATH = resolve("a11y-report/.state/seeded.json");

/** Where the reports go — the HTML report, the JSON results and this pass's own summary. */
export const REPORT_DIR = resolve("a11y-report");
