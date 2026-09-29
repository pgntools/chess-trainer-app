import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { ALLOWLIST } from "./allowlist";

/*
  The allowlist's promise (CTA-116): every entry names its gap in
  ACCESSIBILITY.md → Known gaps. (No browser: this reads the two files.) That an
  entry *keeps occurring* is `summaryReporter.ts`'s, after the run.
*/

const knownGaps = (): string => {
  const text = readFileSync("ACCESSIBILITY.md", "utf8");
  const start = text.indexOf("## Known gaps");
  expect(start, "ACCESSIBILITY.md has a Known gaps section").toBeGreaterThan(-1);
  const next = text.indexOf("\n## ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
};

test("every entry names a gap that ACCESSIBILITY.md lists", () => {
  const gaps = knownGaps();
  expect(ALLOWLIST.length).toBeGreaterThan(0);
  for (const entry of ALLOWLIST) {
    expect(entry.gap.length, `${entry.id}: the gap it names`).toBeGreaterThan(10);
    expect(gaps, `${entry.id}: "${entry.gap}" is in ACCESSIBILITY.md's Known gaps`).toContain(entry.gap);
    expect(entry.why.length, `${entry.id}: why`).toBeGreaterThan(20);
  }
});

test("entries have unique ids", () => {
  const ids = ALLOWLIST.map((entry) => entry.id);
  expect(new Set(ids).size).toBe(ids.length);
});
