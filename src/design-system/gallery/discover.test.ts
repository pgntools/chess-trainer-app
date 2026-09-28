import { describe, expect, it } from "vitest";

import { SECTIONS } from "../components/sections";
import { discoverGallery, groupGallery } from "./discover";
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
