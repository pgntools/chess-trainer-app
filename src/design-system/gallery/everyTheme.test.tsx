import { describe, expect, it } from "vitest";

import { designSystemCombos, designSystemPages } from "../../test/galleryMatrix/designSystem";
import { themes } from "../themes";

/*
  Every component's page — the Base and Patterns tiers (CTA-108, CTA-110) —
  is rendered under every registered theme, scheme and direction, and audited
  by axe (CTA-111), by the gallery's axe matrix: `src/test/galleryMatrix/`,
  the `gallery` test group, run nightly and on demand rather than on every
  pull request (CTA-123 — it is half an hour of tests). What stays in the
  gate is that the matrix is the right one: it meets every theme, scheme,
  direction and scheme × direction pair, over both tiers. The Blocks tier's
  pages are `views/dev/design/Main.test.tsx`'s, since the design system
  cannot import a block.
*/

describe("the gallery under every theme, scheme and direction", () => {
  it("meets every theme, scheme, direction and scheme × direction pair", () => {
    expect(new Set(designSystemCombos.map(([, theme]) => theme))).toEqual(new Set(themes.map((theme) => theme.id)));
    expect(new Set(designSystemCombos.map(([, , mode, direction]) => `${mode} ${direction}`)).size).toBe(Math.min(4, themes.length));
  });

  it("covers both of the design system's tiers, DataTable and TreeView among them", () => {
    expect(designSystemPages.map((page) => page.key)).toEqual(
      expect.arrayContaining(["tables/TableFrame", "patterns/tables/DataTable", "patterns/trees/TreeView"]),
    );
  });
});
