import { describe, expect, it } from "vitest";

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

/*
  Every table takes paging (CTA-128): a pattern named `…Table` declares the
  optional `paging` prop (`TablePaging`, `./tables/paging.ts`), so a long
  table — today's or one to come — can be cut into pages without a change to
  the pattern. A table that never needs it still takes it.
*/
describe("the table patterns", () => {
  const tables = Object.entries(import.meta.glob<string>("./*/*/*Table.tsx", { query: "?raw", import: "default", eager: true }));

  it("are found", () => {
    expect(tables.length).toBeGreaterThan(0);
  });

  it.each(tables)("%s takes the optional `paging` prop", (_path, source) => {
    expect(source).toMatch(/\bpaging\?\s*:\s*(TablePaging|DataTablePaging)\b/);
  });
});
