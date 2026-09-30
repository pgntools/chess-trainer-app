import { describe, expect, it } from "vitest";

import hierarchy from "../../docs/design/hierarchy.md?raw";
import patternTables from "../../docs/design/sections/patterns/tables.md?raw";
import tabs from "../../docs/design/sections/tabs.md?raw";
import { hasDocEntry, hasLiteralTransition, hasOwnFocusStyle } from "./tierConventions";

/*
  The conventions checks' own tests (CTA-117): a check that cannot fail proves
  nothing, so each is shown failing — on the real docs with an entry cut out.
*/

describe("hasDocEntry — a heading (base components, patterns)", () => {
  it("finds the component's heading", () => {
    expect(hasDocEntry(tabs, "PanelTabs", "heading")).toBe(true);
  });

  it("fails when the heading is removed from the real section doc", () => {
    const without = tabs.replace(/^## PanelTabs$/m, "");
    expect(without).not.toBe(tabs);
    expect(hasDocEntry(without, "PanelTabs", "heading")).toBe(false);
  });

  it("does not take a mention in prose for an entry", () => {
    expect(hasDocEntry("# Tabs\n\nPanelTabs is described elsewhere.\n", "PanelTabs", "heading")).toBe(false);
  });

  it("does not take another component's heading for it", () => {
    expect(hasDocEntry("## PanelTabsPlus\n", "PanelTabs", "heading")).toBe(false);
    expect(hasDocEntry("## PanelTabs\n", "Tabs", "heading")).toBe(false);
  });

  it("does not take a top-level title for an entry", () => {
    expect(hasDocEntry("# PanelTabs\n", "PanelTabs", "heading")).toBe(false);
  });

  it("finds each name of a heading that opens with several", () => {
    expect(hasDocEntry("## SwitchField / CheckboxField\n", "SwitchField", "heading")).toBe(true);
    expect(hasDocEntry("## SwitchField / CheckboxField\n", "CheckboxField", "heading")).toBe(true);
    expect(hasDocEntry("## useTableUrlState (+ `sortRows`)\n", "useTableUrlState", "heading")).toBe(true);
  });

  it("does not take a heading that only mentions the component — the real patterns doc with DataTable's own heading cut", () => {
    expect(hasDocEntry(patternTables, "DataTable", "heading")).toBe(true);
    const without = patternTables.replace(/^## DataTable$/m, "");
    expect(without).not.toBe(patternTables);
    // `## CTA-113 additions to \`DataTable\`` is still there.
    expect(without).toMatch(/^## .+DataTable/m);
    expect(hasDocEntry(without, "DataTable", "heading")).toBe(false);
  });
});

describe("hasDocEntry — a table row (blocks)", () => {
  it("finds the block's row in the real Blocks table", () => {
    expect(hasDocEntry(hierarchy, "FolderTree", "row")).toBe(true);
    // A row that names several blocks in its first cell.
    expect(hasDocEntry(hierarchy, "RepertoiresList", "row")).toBe(true);
  });

  it("fails when the row is removed from the real hierarchy.md", () => {
    const without = hierarchy.replace(/^\| `FolderTree` \|.*$/m, "");
    expect(without).not.toBe(hierarchy);
    expect(hasDocEntry(without, "FolderTree", "row")).toBe(false);
  });

  it("does not take a mention in prose or in another column for a row", () => {
    expect(hasDocEntry("`FolderTree` is a block.\n", "FolderTree", "row")).toBe(false);
    expect(hasDocEntry("| `Other` | trees | over `FolderTree` |\n", "FolderTree", "row")).toBe(false);
  });
});

describe("the drift checks", () => {
  it("catch a literal transition, not one from the theme", () => {
    expect(hasLiteralTransition('sx={{ transition: "opacity 0.2s" }}')).toBe(true);
    expect(hasLiteralTransition("sx={{ transition: theme.transitions.create('opacity') }}")).toBe(false);
    expect(hasLiteralTransition('// transition: "none" would be wrong here')).toBe(false);
  });

  it("catch a focus style that does not spread the theme's ring", () => {
    expect(hasOwnFocusStyle('"&:focus-visible": { outline: "2px solid" }')).toBe(true);
    expect(hasOwnFocusStyle('"&:focus-visible": theme.mixins.focusRing')).toBe(false);
    expect(hasOwnFocusStyle("const a = 1;")).toBe(false);
  });
});
