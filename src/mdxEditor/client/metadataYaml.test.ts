import { describe, expect, it } from "vitest";

import { setMetadataKey, starterFrontmatter } from "./metadataYaml";

describe("the Metadata tab's edits (CTA-135)", () => {
  it("sets one key, keeping the comments, the order and a key the form does not know", () => {
    const yaml = "# The article's own words\ntitle: Old\nsummary: S # short\ncustom: kept\n";
    expect(setMetadataKey(yaml, "title", "New: with a colon")).toBe('# The article\'s own words\ntitle: "New: with a colon"\nsummary: S # short\ncustom: kept\n');
  });

  it("adds a key at the end, writes a list in brackets, and takes a key out", () => {
    let yaml = "title: T\nsummary: S\n";
    yaml = setMetadataKey(yaml, "order", 70);
    yaml = setMetadataKey(yaml, "tags", ["a", "b"]);
    yaml = setMetadataKey(yaml, "draft", true);
    expect(yaml).toBe("title: T\nsummary: S\norder: 70\ntags: [ a, b ]\ndraft: true\n");
    yaml = setMetadataKey(yaml, "draft", undefined);
    yaml = setMetadataKey(yaml, "tags", []);
    expect(yaml).toBe("title: T\nsummary: S\norder: 70\n");
  });

  it("writes an edited value afresh — no quote left over from typing — and puts a key back where the schema lists it", () => {
    let yaml = setMetadataKey("summary: S\ndate: 2026-10-05\n", "title", "My ");
    expect(yaml).toBe('title: "My "\nsummary: S\ndate: 2026-10-05\n');
    yaml = setMetadataKey(yaml, "title", "My event");
    expect(yaml).toBe("title: My event\nsummary: S\ndate: 2026-10-05\n");
    // An unknown key ranks last: a schema key goes before it.
    expect(setMetadataKey("title: T\ncustom: x\n", "order", 3)).toBe("title: T\norder: 3\ncustom: x\n");
  });

  it("starts from nothing, and comes back to nothing", () => {
    expect(setMetadataKey("", "title", "T")).toBe("title: T\n");
    expect(setMetadataKey("title: T\n", "title", undefined)).toBe("");
  });

  it("starts a new article as a draft, dated today", () => {
    expect(starterFrontmatter("2026-10-05")).toContain("date: 2026-10-05\ndraft: true\n");
  });
});
