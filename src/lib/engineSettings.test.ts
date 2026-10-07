import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENGINE_SETTINGS,
  ENGINE_SETTING_BOUNDS,
  LIMIT_STRENGTH_OPTION,
  engineSettingsFrom,
  sameEngineSettings,
  uciOptionsOf,
  usesEloStrength,
  withClampedUciOptions,
} from "./engineSettings";
import type { EngineOption } from "./engineTypes";

/*
  The engine settings' Elo request (CTA-153): carried like every other setting —
  a request, never the last word on what the running engine takes.
*/

const options = (...names: string[]): ReadonlyMap<string, EngineOption> =>
  new Map(names.map((name): [string, EngineOption] => [name, { name, type: name === LIMIT_STRENGTH_OPTION ? "check" : "spin" }]));

describe("the Elo request", () => {
  it("has a default that agrees with the default Skill Level, inside the range Stockfish 19 declares", () => {
    expect(DEFAULT_ENGINE_SETTINGS.elo).toBe(2100);
    expect(ENGINE_SETTING_BOUNDS.elo).toEqual({ min: 1320, max: 3190 });
  });

  it("goes to the engine module with UCI_LimitStrength asked on — both strength controls requested", () => {
    expect(uciOptionsOf({ ...DEFAULT_ENGINE_SETTINGS, elo: 1700 })).toEqual({
      "Skill Level": 10,
      UCI_Elo: 1700,
      UCI_LimitStrength: 1,
      MultiPV: 3,
      Threads: 1,
      Hash: 16,
    });
  });

  it("is re-clamped to the bounds the running engine declared, the same object when nothing moved", () => {
    const current = { ...DEFAULT_ENGINE_SETTINGS, elo: 3500 };
    const clamped = withClampedUciOptions(current, { UCI_Elo: 3190 });
    expect(clamped.elo).toBe(3190);
    expect(clamped).not.toBe(current);

    const same = { ...DEFAULT_ENGINE_SETTINGS, elo: 1800 };
    expect(withClampedUciOptions(same, { UCI_Elo: 1800 })).toBe(same);
    // An engine that declares no UCI_Elo reports none: the request stands.
    expect(withClampedUciOptions(same, {})).toBe(same);
  });

  it("reads back from stored JSON, the default for a record from before it was asked", () => {
    expect(engineSettingsFrom({ skillLevel: 4, depth: 8 }).elo).toBe(DEFAULT_ENGINE_SETTINGS.elo);
    expect(engineSettingsFrom({ elo: 2400 }).elo).toBe(2400);
    expect(engineSettingsFrom({ elo: "strong" }).elo).toBe(DEFAULT_ENGINE_SETTINGS.elo);
    expect(engineSettingsFrom({ elo: -5 }).elo).toBe(DEFAULT_ENGINE_SETTINGS.elo);
  });

  it("makes two settings differ", () => {
    expect(sameEngineSettings(DEFAULT_ENGINE_SETTINGS, { ...DEFAULT_ENGINE_SETTINGS })).toBe(true);
    expect(sameEngineSettings(DEFAULT_ENGINE_SETTINGS, { ...DEFAULT_ENGINE_SETTINGS, elo: 2200 })).toBe(false);
  });
});

describe("usesEloStrength — read off what the engine declared, never its name", () => {
  it("is true for an engine with both UCI_Elo and UCI_LimitStrength (Stockfish 19)", () => {
    expect(usesEloStrength(options("Skill Level", "UCI_Elo", LIMIT_STRENGTH_OPTION))).toBe(true);
  });

  it("is false for the 2019 build, which has neither", () => {
    expect(usesEloStrength(options("Threads", "Hash", "MultiPV", "Skill Level"))).toBe(false);
  });

  it("is false where the Elo has no limit switch to go with it, or the reverse", () => {
    expect(usesEloStrength(options("UCI_Elo"))).toBe(false);
    expect(usesEloStrength(options(LIMIT_STRENGTH_OPTION))).toBe(false);
  });

  it("is false before the handshake, when nothing is declared", () => {
    expect(usesEloStrength(new Map())).toBe(false);
  });
});
