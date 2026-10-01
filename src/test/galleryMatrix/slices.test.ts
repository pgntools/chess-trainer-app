import { describe, expect, it } from "vitest";

import { MATRIX_SLICES, sliceOf } from "./slices";

/*
  The gallery's axe matrix runs nightly, in slices (CTA-123), so nothing in
  the pull-request gate would notice a slice that never ran. This does: every
  tier has exactly its `MATRIX_SLICES` files, and the slices cover every
  combination once.
*/

/** The slice files on disk — their names only; nothing is loaded. */
const SLICE_FILES = Object.keys(import.meta.glob("./*.matrix.test.tsx")).map((path) => path.replace(/^\.\//, ""));

describe("the gallery matrix's slices", () => {
  it("has one file per slice of each tier, and no other", () => {
    const expected = Object.entries(MATRIX_SLICES).flatMap(([tier, count]) =>
      Array.from({ length: count }, (_, index) => `${tier}.${index + 1}.matrix.test.tsx`),
    );
    expect([...SLICE_FILES].sort()).toEqual(expected.sort());
  });

  it("puts every combination in exactly one slice", () => {
    const combos = Array.from({ length: 23 }, (_, index) => index);
    const slices = Array.from({ length: 6 }, (_, index) => sliceOf(combos, index + 1, 6));
    expect(slices.flat().sort((a, b) => a - b)).toEqual(combos);
    // Consecutive combinations — one page's themes — go to different slices.
    expect(slices[0].slice(0, 2)).toEqual([0, 6]);
  });

  it("refuses a slice outside 1..count", () => {
    expect(() => sliceOf([1, 2], 0, 2)).toThrow(RangeError);
    expect(() => sliceOf([1, 2], 3, 2)).toThrow(RangeError);
  });
});
