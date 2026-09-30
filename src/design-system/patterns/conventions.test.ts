import { describeTierConventions } from "../../test/tierConventions";
import { PATTERN_SECTIONS } from "./sections";

/* The patterns' house rules (CTA-110) — the base components' own (`src/test/tierConventions.ts`). */

describeTierConventions({
  tier: "patterns",
  sources: import.meta.glob<string>("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
  sections: PATTERN_SECTIONS,
  everySectionFilled: true,
  fixtures: false,
  docs: {
    sources: import.meta.glob<string>("../../../docs/design/sections/patterns/*.md", { query: "?raw", import: "default", eager: true }),
    file: (section) => `sections/patterns/${section}.md`,
    form: "heading",
  },
});
