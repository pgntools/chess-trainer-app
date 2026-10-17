import { describe, expect, it } from "vitest";

import { fillOperatorPlaceholders, legalPagesConfigured, missingOperatorVariables, operatorValue, unknownSiteVariables } from "./siteOperator";

/*
  The site's operator (CTA-182): the legal pages' placeholders, filled from
  the build's `SITE_*` variables — and the one predicate that decides whether
  a build has the pages at all.
*/

const ENV = {
  SITE_OPERATOR_NAME: "Ada Example",
  SITE_OPERATOR_NAME_HE: "עדה דוגמה",
  SITE_OPERATOR_ADDRESS: "1 Example Street, Exampletown",
  SITE_PRIVACY_EMAIL: "privacy@example.org",
};

describe("legalPagesConfigured — whether a build has the legal pages", () => {
  it("is true with the three values, whatever the languages' own", () => {
    expect(legalPagesConfigured(ENV)).toBe(true);
    expect(missingOperatorVariables(ENV)).toEqual([]);
  });

  it("is false with none — a fork, a plain local run — and blank counts as none", () => {
    expect(legalPagesConfigured({})).toBe(false);
    expect(legalPagesConfigured({ SITE_OPERATOR_NAME: "  ", SITE_OPERATOR_ADDRESS: "", SITE_OPERATOR_NAME_HE: "עדה" })).toBe(false);
  });

  it("throws with some but not all, naming what is missing", () => {
    const partial = { ...ENV, SITE_PRIVACY_EMAIL: undefined };
    expect(missingOperatorVariables(partial)).toEqual(["SITE_PRIVACY_EMAIL"]);
    expect(() => legalPagesConfigured(partial)).toThrow(/half configured: SITE_PRIVACY_EMAIL is unset/);
  });
});

describe("operatorValue — a value in a language", () => {
  it("takes the language's own variable first, then the plain one", () => {
    expect(operatorValue(ENV, "OPERATOR_NAME", "he")).toBe("עדה דוגמה");
    expect(operatorValue(ENV, "OPERATOR_NAME", "en")).toBe("Ada Example");
    // No Hebrew address: the English one.
    expect(operatorValue(ENV, "OPERATOR_ADDRESS", "he")).toBe("1 Example Street, Exampletown");
  });

  it("never reads a language variable for English", () => {
    expect(operatorValue({ ...ENV, SITE_OPERATOR_NAME_EN: "Other" }, "OPERATOR_NAME", "en")).toBe("Ada Example");
  });

  it("reads any language the same way — a new one needs no edit", () => {
    const env = { ...ENV, SITE_OPERATOR_NAME_FR: "Ada Exemple", SITE_PRIVACY_EMAIL_FR: "vie-privee@example.org" };
    expect(operatorValue(env, "OPERATOR_NAME", "fr")).toBe("Ada Exemple");
    expect(operatorValue(env, "PRIVACY_EMAIL", "fr")).toBe("vie-privee@example.org");
    expect(operatorValue(env, "OPERATOR_ADDRESS", "fr")).toBe("1 Example Street, Exampletown");
  });
});

describe("unknownSiteVariables — a SITE_* variable the build reads none of", () => {
  it("is none for the three and each language's own, of the languages the app has", () => {
    expect(unknownSiteVariables({ ...ENV, SITE_OPERATOR_ADDRESS_HE: "רחוב", SITE_PRIVACY_EMAIL_HE: "a@b.c" }, ["en", "he"], "en")).toEqual([]);
    expect(unknownSiteVariables({ ...ENV, SITE_OPERATOR_NAME_FR: "Ada" }, ["en", "he", "fr"], "en")).toEqual([]);
  });

  it("names a typo, a language the app has not got, and the default language's own", () => {
    const env = { ...ENV, SITE_OPERATOR_NAME_HEB: "x", SITE_OPERATOR_NAME_FR: "x", SITE_OPERATOR_NAME_EN: "x", SITE_OPERATR_ADDRESS: "x" };
    expect(unknownSiteVariables(env, ["en", "he"], "en")).toEqual([
      "SITE_OPERATOR_NAME_EN",
      "SITE_OPERATOR_NAME_FR",
      "SITE_OPERATOR_NAME_HEB",
      "SITE_OPERATR_ADDRESS",
    ]);
  });

  it("leaves out a blank one, which is unset, and anything not SITE_*", () => {
    expect(unknownSiteVariables({ ...ENV, SITE_OPERATOR_NAME_FR: " ", VITE_DEV_PORT: "5173" }, ["en", "he"], "en")).toEqual([]);
  });
});

describe("fillOperatorPlaceholders — a document as the build compiles it", () => {
  it("fills every placeholder in the file's language", () => {
    const text = "Operated by **%OPERATOR_NAME%**, %OPERATOR_ADDRESS%. Write to **%PRIVACY_EMAIL%**.";
    expect(fillOperatorPlaceholders(text, ENV, "en")).toBe(
      "Operated by **Ada Example**, 1 Example Street, Exampletown. Write to **privacy@example.org**.",
    );
    expect(fillOperatorPlaceholders("**%OPERATOR_NAME%**", ENV, "he")).toBe("**עדה דוגמה**");
  });

  it("leaves a text without placeholders as it is — a 50% or a lone % too", () => {
    expect(fillOperatorPlaceholders("50% of 100%, and 100 % more", ENV, "en")).toBe("50% of 100%, and 100 % more");
  });

  it("puts a value in as text: MDX's { and < escaped, Markdown kept", () => {
    expect(fillOperatorPlaceholders("%OPERATOR_NAME%", { ...ENV, SITE_OPERATOR_NAME: "A {b} <c> \\d *e*" }, "en")).toBe("A \\{b\\} \\<c\\> \\\\d *e*");
  });

  it("throws on a placeholder it does not know, or one with no value", () => {
    expect(() => fillOperatorPlaceholders("%OPERATOR_NAM%", ENV, "en")).toThrow(/%OPERATOR_NAM% is no placeholder/);
    expect(() => fillOperatorPlaceholders("%PRIVACY_EMAIL%", {}, "en")).toThrow(/SITE_PRIVACY_EMAIL is unset/);
  });
});
