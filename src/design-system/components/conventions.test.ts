import { describeTierConventions } from "../../test/tierConventions";
import { SECTIONS } from "./sections";

/*
  The base components' house rules (CTA-108), checked over the source itself:
  every component is a folder of four files re-exported from its section, it
  draws no colour of its own, it uses no physical side, and it takes a
  `testId`. The gallery's demos are held to the colour and side rules too.
  The rules are every tier's (`src/test/tierConventions.ts`).
*/

describeTierConventions({
  tier: "base",
  sources: import.meta.glob<string>("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
  sections: SECTIONS,
  everySectionFilled: true,
  fixtures: false,
});
