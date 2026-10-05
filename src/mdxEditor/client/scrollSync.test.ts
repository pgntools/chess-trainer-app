import { describe, expect, it } from "vitest";

import { mapHeight, reversed, syncedScrollTop, usableAnchors, type Anchor } from "./scrollSync";

/*
  The MDX editor's panes scrolling together: a scroll position in one pane
  mapped to the other through the document's blocks — level at every block,
  linear between, and the start and the end of one always those of the other.
*/

/** A source of 1,000 px whose blocks sit at 200 and 600; a preview of 3,000 px where they sit at 1,000 and 2,000. */
const ANCHORS: Anchor[] = [
  { from: 200, to: 1000 },
  { from: 600, to: 2000 },
];

describe("usableAnchors", () => {
  it("runs from the top of both contents to the bottom of both", () => {
    expect(usableAnchors(ANCHORS, 1000, 3000)).toEqual([{ from: 0, to: 0 }, ...ANCHORS, { from: 1000, to: 3000 }]);
  });

  it("drops a block that does not rise on both sides, and puts them in order", () => {
    const anchors = [{ from: 600, to: 2000 }, { from: 200, to: 1000 }, { from: 300, to: 1000 }, { from: 700, to: 1500 }];
    expect(usableAnchors(anchors, 1000, 3000)).toEqual([{ from: 0, to: 0 }, ...ANCHORS, { from: 1000, to: 3000 }]);
  });
});

describe("mapHeight", () => {
  const anchors = usableAnchors(ANCHORS, 1000, 3000);

  it("is level at every block", () => {
    expect(mapHeight(anchors, 200)).toBe(1000);
    expect(mapHeight(anchors, 600)).toBe(2000);
  });

  it("is linear between two blocks, and clamped outside them", () => {
    expect(mapHeight(anchors, 100)).toBe(500);
    expect(mapHeight(anchors, 400)).toBe(1500);
    expect(mapHeight(anchors, 800)).toBe(2500);
    expect(mapHeight(anchors, -10)).toBe(0);
    expect(mapHeight(anchors, 5000)).toBe(3000);
  });
});

describe("syncedScrollTop", () => {
  const source = (scrollTop: number) => ({ scrollTop, scrollHeight: 1000, clientHeight: 400 });
  const preview = (scrollTop: number) => ({ scrollTop, scrollHeight: 3000, clientHeight: 500 });

  it("takes the top to the top and the bottom to the bottom", () => {
    expect(syncedScrollTop(ANCHORS, source(0), preview(123))).toBe(0);
    expect(syncedScrollTop(ANCHORS, source(600), preview(0))).toBe(2500);
  });

  it("keeps a block level with its markup, at the point sliding down the pane", () => {
    // Half way down the source, its probe is at 300 + 200 = 500 — between the blocks, three quarters on: 1,750 in the preview.
    expect(syncedScrollTop(ANCHORS, source(300), preview(0))).toBe(1750 - 250);
  });

  it("maps back the other way", () => {
    // Half way down the preview, its probe is at 1,250 + 250 = 1,500 — half way between the blocks: 400 in the source.
    expect(syncedScrollTop(reversed(ANCHORS), preview(1250), source(0))).toBe(400 - 200);
  });

  it("leaves a pane with nothing to scroll at its top", () => {
    expect(syncedScrollTop(ANCHORS, source(300), { scrollTop: 0, scrollHeight: 500, clientHeight: 500 })).toBe(0);
  });
});
