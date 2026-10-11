import type { SiteEnv } from "../lib/siteOperator.ts";

/**
 * **The site's operator under Vitest** (CTA-182) — `vite.config.ts` builds
 * the tests with these values, not a machine's `.env.local`, so every run
 * reads the same legal pages: configured, each value in its language. A test
 * of a build without them mocks `views/legal/legalPagesShown.ts`.
 */
export const TEST_SITE_ENV: SiteEnv = {
  SITE_OPERATOR_NAME: "Ada Example",
  SITE_OPERATOR_NAME_HE: "עדה דוגמה",
  SITE_OPERATOR_ADDRESS: "1 Example Street, Exampletown",
  SITE_OPERATOR_ADDRESS_HE: "רחוב הדוגמה 1, עיר הדוגמה",
  SITE_PRIVACY_EMAIL: "privacy@example.org",
};
