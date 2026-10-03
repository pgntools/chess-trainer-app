import { describe, expect, it } from "vitest";

import { collectionPathOf, libraryGamePathOf, repertoirePathOf } from "./paths";

describe("the front page's addresses (CTA-126)", () => {
  it("reads a Library game's address, with or without its slashes", () => {
    expect(libraryGamePathOf("/library/fischer/50")).toEqual({ collectionId: "fischer", number: 50 });
    expect(libraryGamePathOf("library/fischer/50/")).toEqual({ collectionId: "fischer", number: 50 });
    expect(libraryGamePathOf("/library/fischer/0")).toBeUndefined();
    expect(libraryGamePathOf("/library/fischer")).toBeUndefined();
    expect(libraryGamePathOf("/repertoires/abc/1")).toBeUndefined();
  });

  it("reads a collection's address", () => {
    expect(collectionPathOf("/library/capablanca")).toBe("capablanca");
    expect(collectionPathOf("/library/capablanca/2")).toBeUndefined();
    expect(collectionPathOf("/library/")).toBeUndefined();
  });

  it("reads a repertoire's address", () => {
    expect(repertoirePathOf("/repertoires/k3j2")).toBe("k3j2");
    expect(repertoirePathOf("/repertoires/k3j2/settings")).toBeUndefined();
    expect(repertoirePathOf("/library/k3j2")).toBeUndefined();
  });
});
