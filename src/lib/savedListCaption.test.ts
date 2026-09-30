import { describe, expect, it } from "vitest";

import { savedListDate, savedListLine } from "./savedListCaption";

describe("savedListCaption", () => {
  it("joins the facts that are there", () => {
    expect(savedListLine(["12 moves", "", "3 variations", "Sep 3, 2026"])).toBe("12 moves · 3 variations · Sep 3, 2026");
    expect(savedListLine(["", ""])).toBe("");
  });

  it("writes a date in the reader's language, and nothing for one that does not parse", () => {
    expect(savedListDate("2026-09-03T12:00:00.000Z", "en")).toBe("Sep 3, 2026");
    expect(savedListDate("not a date", "en")).toBe("");
  });
});
