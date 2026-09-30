import { describeTierConventions } from "../test/tierConventions";
import { BLOCK_FAMILIES } from "./families";

/*
  The blocks' house rules (CTA-110) — the design system's
  (`src/test/tierConventions.ts`), plus a `fixtures.ts` in every block's
  folder that only its gallery and its test import. A family is registered
  before its first block, so an empty one is allowed.
*/

describeTierConventions({
  tier: "blocks",
  sources: import.meta.glob<string>("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
  sections: BLOCK_FAMILIES,
  everySectionFilled: false,
  fixtures: true,
  // Every block is a row of hierarchy.md's Blocks table (CTA-117).
  docs: {
    sources: import.meta.glob<string>("../../docs/design/hierarchy.md", { query: "?raw", import: "default", eager: true }),
    file: () => "hierarchy.md",
    form: "row",
  },
});
