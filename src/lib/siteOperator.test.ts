import { describe, expect, it } from "vitest";

import { fillOperatorPlaceholders, legalPagesConfigured, missingOperatorVariables, operatorValue } from "./siteOperator";

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
