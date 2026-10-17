import { describe, expect, it } from "vitest";

import { DEFAULT_ENGINE_SETTINGS } from "./engineSettings";
import { newGameParams, newGameRequestOf } from "./newGameLink";

const params = (query: string) => new URLSearchParams(query);

describe("newGameParams — the Lobby's Start link (CTA-82)", () => {
  it("writes the strength, the side, the eval bar and the lines' start — the search settings are the top bar's (CTA-181)", () => {
    const written = newGameParams({ skillLevel: 5, elo: 2100 }, "black", false, false);
    expect(Object.fromEntries(written)).toEqual({
      side: "black",
      skill: "5",
      elo: "2100",
      evalbar: "0",
      variations: "0",
    });
  });

  it("reads back what it wrote", () => {
    expect(newGameRequestOf(newGameParams({ skillLevel: 3, elo: 1800 }, "white", true, false))).toEqual({
      settings: { skillLevel: 3, elo: 1800 },
      side: "white",
      evalBar: true,
      variations: false,
    });
  });
});

describe("newGameParams — a starting position (CTA-83)", () => {
  const FEN = "4k3/8/8/8/8/8/8/4K2R b K - 0 1";

  it("carries a position when given one, beside the other fields", () => {
    const written = newGameParams(DEFAULT_ENGINE_SETTINGS, "white", true, true, FEN);
    expect(written.get("fen")).toBe(FEN);
    expect(written.get("side")).toBe("white");
    // And it survives the URL: spaces and slashes intact.
    expect(new URLSearchParams(written.toString()).get("fen")).toBe(FEN);
  });

  it("carries none when given none", () => {
    expect(newGameParams(DEFAULT_ENGINE_SETTINGS, "white", true, true).has("fen")).toBe(false);
  });
});

describe("newGameRequestOf — reading a link", () => {
  it("asks for nothing when the link carries nothing", () => {
    expect(newGameRequestOf(params(""))).toEqual({ settings: {} });
    expect(newGameRequestOf(params("fen=whatever&saved=x"))).toEqual({ settings: {} });
  });

  it("drops an unreadable field and keeps the others", () => {
    expect(newGameRequestOf(params("skill=abc&elo=1900&side=purple&evalbar=yes"))).toEqual({
      settings: { elo: 1900 },
    });
  });

  it("clamps a number out of range and rounds a fraction", () => {
    expect(newGameRequestOf(params("skill=99")).settings).toEqual({ skillLevel: 20 });
    expect(newGameRequestOf(params("skill=7.6")).settings).toEqual({ skillLevel: 8 });
  });

  it("reads an older link's search settings as nothing — they are the reader's global ones (CTA-181)", () => {
    expect(newGameRequestOf(params("depth=8&movetime=2500&lines=5&threads=12&hash=4096")).settings).toEqual({});
  });

  it("carries the Elo an Elo-driven engine is asked for (CTA-153), clamped into its range", () => {
    expect(newGameRequestOf(params("elo=1800")).settings).toEqual({ elo: 1800 });
    expect(newGameRequestOf(params("elo=100")).settings).toEqual({ elo: 1320 });
    expect(newGameRequestOf(params("elo=9999")).settings).toEqual({ elo: 3190 });
    expect(newGameRequestOf(params("elo=strong")).settings).toEqual({});
    expect(newGameParams({ ...DEFAULT_ENGINE_SETTINGS, elo: 2500 }, "white", true, true).get("elo")).toBe("2500");
  });

  it("reads ?side=random as no side at all (CTA-90)", () => {
    expect(newGameRequestOf(params("side=random&skill=4"))).toEqual({
      settings: { skillLevel: 4 },
    });
  });

  it("reads the eval bar as 1 or 0", () => {
    expect(newGameRequestOf(params("evalbar=0")).evalBar).toBe(false);
    expect(newGameRequestOf(params("evalbar=1")).evalBar).toBe(true);
  });

  it("reads the lines' start as 1 or 0 (CTA-90)", () => {
    expect(newGameRequestOf(params("variations=0")).variations).toBe(false);
    expect(newGameRequestOf(params("variations=1")).variations).toBe(true);
    // Absent or unreadable: the default, like every field.
    expect(newGameRequestOf(params("")).variations).toBeUndefined();
    expect(newGameRequestOf(params("variations=x")).variations).toBeUndefined();
  });
});
