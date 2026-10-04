import { describe, expect, it } from "vitest";

import { FIDE_FLAG_CODES, federationFlagOf, federationName, flagCodeOf } from "./federations";

/* A federation tag as a flag (CTA-128): FIDE's codes, not ISO's, read through a table. */

describe("federations", () => {
  it("reads FIDE's codes, which are not ISO's", () => {
    expect(flagCodeOf("GER")).toBe("de");
    expect(flagCodeOf("NED")).toBe("nl");
    expect(flagCodeOf("DEN")).toBe("dk");
    expect(flagCodeOf("SUI")).toBe("ch");
    expect(flagCodeOf("ned")).toBe("nl");
  });

  it("gives the parts of the United Kingdom their own flags and names", () => {
    expect(flagCodeOf("ENG")).toBe("gb-eng");
    expect(flagCodeOf("SCO")).toBe("gb-sct");
    expect(federationName("WLS", "en")).toBe("Wales");
    expect(federationName("ENG", "he")).toBe("אנגליה");
  });

  it("names a federation in the reader's language", () => {
    expect(federationName("FRA", "en")).toBe("France");
    expect(federationName("FRA", "he")).toBe("צרפת");
  });

  it("takes a tag already in ISO's two letters as one", () => {
    expect(flagCodeOf("fr")).toBe("fr");
  });

  it("has no flag for a code it does not know, and names it as written", () => {
    expect(flagCodeOf("FID")).toBeUndefined();
    expect(federationName("FID", "en")).toBe("FID");
    expect(federationFlagOf("FID", "en")).toBeUndefined();
    expect(federationFlagOf(undefined, "en")).toBeUndefined();
    expect(federationFlagOf("UZB", "en")).toEqual({ code: "uz", name: "Uzbekistan" });
  });

  it("names a flag the package has for every federation it knows", () => {
    const files = Object.keys(import.meta.glob("/node_modules/flag-icons/flags/4x3/*.svg")).map((path) => path.split("/").pop()!.replace(".svg", ""));
    for (const [federation, code] of Object.entries(FIDE_FLAG_CODES)) expect(files, federation).toContain(code);
    expect(Object.keys(FIDE_FLAG_CODES).length).toBeGreaterThan(190);
  });
});
