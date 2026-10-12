import { describe, expect, it } from "vitest";

import { hashLabelledStops, hashStopsOf } from "./hashSlots";

describe("the Hash slider's marks (CTA-185)", () => {
  it("stops at the powers of two from 16 MB up to the slider's top", () => {
    expect(hashStopsOf(1024)).toEqual([16, 32, 64, 128, 256, 512, 1024]);
    expect(hashStopsOf(16384)).toHaveLength(11);
  });

  it("ends at a top that is no power of two, and is never empty", () => {
    expect(hashStopsOf(1000)).toEqual([16, 32, 64, 128, 256, 512, 1000]);
    expect(hashStopsOf(8)).toEqual([8]);
  });

  it("labels the whole gigabytes where three fit", () => {
    expect(hashLabelledStops(hashStopsOf(8192), 1)).toEqual([1024, 2048, 4096, 8192]);
  });

  it("labels the sizes from 128 MB on an in-browser build's slider", () => {
    expect(hashLabelledStops(hashStopsOf(1024), 1)).toEqual([128, 256, 512, 1024]);
    expect(hashLabelledStops(hashStopsOf(512), 1)).toEqual([128, 256, 512]);
  });

  it("drops a label too close to the one before — the top always kept", () => {
    // 2 GB sits 1/16 of the way past 1 GB on a 16 GB slider: the two would meet.
    expect(hashLabelledStops(hashStopsOf(16384), 1)).toEqual([1024, 4096, 8192, 16384]);
    // An engine's own enormous top: the small sizes crowd at the start, one label for them.
    const huge = hashLabelledStops(hashStopsOf(33554432), 1);
    expect(huge[0]).toBe(1024);
    expect(huge[huge.length - 1]).toBe(33554432);
    expect(huge.length).toBeLessThanOrEqual(6);
  });
});
