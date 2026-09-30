import { describe, expect, it } from "vitest";

import { SECTIONS } from "../components/sections";
import { PATTERN_SECTIONS } from "../patterns/sections";
import { discoverGallery, discoverPatterns, discoverTiers, galleryEntriesOf, groupGallery, pageKeyOf } from "./discover";
import type { GalleryModule } from "./types";

const module = (section: string, title: string): GalleryModule =>
  ({ section, title, demos: [] }) as unknown as GalleryModule;

describe("groupGallery", () => {
  it("orders the sections as registered and a section's components by title", () => {
    const grouped = groupGallery([
      module("forms", "SwitchField"),
      module("dialogs", "ConfirmDialog"),
      module("forms", "SideToggle"),
    ]);
    expect(grouped.map((section) => section.id)).toEqual(["dialogs", "forms"]);
    expect(grouped[1].modules.map((entry) => entry.title)).toEqual(["SideToggle", "SwitchField"]);
    expect(grouped[0].title).toBe("Dialogs");
  });

  it("leaves out a section with nothing in it", () => {
    expect(groupGallery([])).toEqual([]);
  });

  it("shows a module naming an unregistered section last, under that id", () => {
    const grouped = groupGallery([module("dialgos", "Typo"), module("cards", "Card")]);
    expect(grouped.map((section) => [section.id, section.title])).toEqual([
      ["cards", "Cards"],
      ["dialgos", "dialgos"],
    ]);
  });
});

describe("discoverGallery", () => {
  it("finds every section's components' demos, with no registration — and no placeholder left", () => {
    const sections = discoverGallery();
    expect(sections.map((section) => section.id)).toEqual(SECTIONS.map((section) => section.id));
    for (const section of sections) {
      expect(section.modules.length).toBeGreaterThan(0);
      expect(section.modules.map((entry) => entry.title)).not.toContain("Placeholder");
      for (const entry of section.modules) expect(entry.demos.length).toBeGreaterThan(0);
    }
  });
});

describe("galleryEntriesOf", () => {
  it("names each module by the folder it sits in, whatever its title says", () => {
    const entries = galleryEntriesOf({
      "../components/tables/useTableUrlState/useTableUrlState.gallery.tsx": module("tables", "useTableUrlState — the whole table"),
    });
    expect(entries.map((entry) => entry.id)).toEqual(["useTableUrlState"]);
  });

  it("gives a module grouped without a file its title's first word", () => {
    expect(groupGallery([module("forms", "SnackbarProvider + useSnackbar")])[0].modules[0].id).toBe("SnackbarProvider");
  });
});

describe("discoverPatterns / discoverTiers", () => {
  it("finds every pattern section's patterns, in the registry's order", () => {
    const sections = discoverPatterns();
    expect(sections.map((section) => section.id)).toEqual(PATTERN_SECTIONS.map((section) => section.id));
    // Every pattern that has a gallery, and no other — read off the disk the
    // way the gallery does, not listed by name (CTA-116), so a new pattern
    // needs no edit here.
    const onDisk = Object.keys(import.meta.glob("../patterns/*/*/*.gallery.tsx")).map((path) => path.split("/").slice(-3, -1).join("/"));
    const found = sections.flatMap((section) => section.modules.map((entry) => `${section.id}/${entry.id}`));
    expect(onDisk.length).toBeGreaterThan(0);
    expect([...found].sort()).toEqual([...onDisk].sort());
  });

  it("is Base, then Patterns — Blocks is the dev route's to add", () => {
    expect(discoverTiers().map((tier) => [tier.id, tier.title])).toEqual([
      ["", "Base"],
      ["patterns", "Patterns"],
    ]);
  });

  it("keys a base section by its id and another tier's under the tier", () => {
    expect(pageKeyOf("", "tables")).toBe("tables");
    expect(pageKeyOf("patterns", "tables")).toBe("patterns/tables");
  });
});
