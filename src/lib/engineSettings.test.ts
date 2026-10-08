import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENGINE_SETTINGS,
  deviceEngineLimits,
  ENGINE_SETTING_BOUNDS,
  LIMIT_STRENGTH_OPTION,
  MOVE_TIME_INSTANT_MS,
  MOVE_TIME_MARKS_S,
  MOVE_TIME_UNLIMITED_SLOT,
  engineSettingsFrom,
  moveTimeOfSliderValue,
  moveTimeSliderMarks,
  moveTimeSliderValueOf,
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

  it("is false for an engine that has neither — Skill Level alone", () => {
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

describe("deviceEngineLimits — what this device can give the engine (CTA-160)", () => {
  it("offers one thread fewer than the cores, at most 8, and 4 where the browser does not say", () => {
    expect(deviceEngineLimits({ hardwareConcurrency: 4 }).threads).toBe(3);
    expect(deviceEngineLimits({ hardwareConcurrency: 1 }).threads).toBe(1);
    expect(deviceEngineLimits({ hardwareConcurrency: 20 }).threads).toBe(8);
    expect(deviceEngineLimits({}).threads).toBe(4);
  });

  it("offers Hash by the device's memory, never past the 1024 MB that held", () => {
    expect(deviceEngineLimits({ deviceMemory: 8 }).hashMb).toBe(1024);
    expect(deviceEngineLimits({ deviceMemory: 4 }).hashMb).toBe(512);
    expect(deviceEngineLimits({ deviceMemory: 2 }).hashMb).toBe(128);
    expect(deviceEngineLimits({}).hashMb).toBe(256);
    expect(ENGINE_SETTING_BOUNDS.hashMb.max).toBe(1024);
  });
});

describe("uciOptionsOf — the ceilings hold whatever a record says", () => {
  it("never asks for more Hash or Threads than the bounds, which a stored or imported game could carry", () => {
    const options = uciOptionsOf({ ...DEFAULT_ENGINE_SETTINGS, hashMb: 4096, threads: 128 });
    expect(options.Hash).toBe(1024);
    expect(options.Threads).toBe(32);
  });
});

describe("the move-time slider — lichess's snap marks (CTA-163)", () => {
  it("offers the marks 0, 5, 10 … 300 seconds and an ∞ slot past them", () => {
    expect(MOVE_TIME_MARKS_S).toEqual([0, 5, 10, 20, 30, 60, 120, 300]);
    expect(moveTimeSliderMarks()).toEqual([
      { value: 0, label: "0" },
      { value: 1, label: "5" },
      { value: 2, label: "10" },
      { value: 3, label: "20" },
      { value: 4, label: "30" },
      { value: 5, label: "60" },
      { value: 6, label: "120" },
      { value: 7, label: "300" },
      { value: 8, label: "∞" },
    ]);
    expect(MOVE_TIME_UNLIMITED_SLOT).toBe(8);
  });

  it("keeps moveTimeMs 0 the meaning of the ∞ mark — unlimited, depth alone deciding", () => {
    expect(moveTimeSliderValueOf(0)).toBe(MOVE_TIME_UNLIMITED_SLOT);
    expect(moveTimeOfSliderValue(MOVE_TIME_UNLIMITED_SLOT)).toBe(0);
  });

  it("gives the 0-seconds mark its own encoding — the instant reply, 1 ms", () => {
    expect(moveTimeSliderValueOf(MOVE_TIME_INSTANT_MS)).toBe(0);
    expect(moveTimeOfSliderValue(0)).toBe(MOVE_TIME_INSTANT_MS);
  });

  it("maps each slot to its mark's seconds and back", () => {
    expect(moveTimeOfSliderValue(1)).toBe(5000);
    expect(moveTimeOfSliderValue(5)).toBe(60000);
    expect(moveTimeOfSliderValue(7)).toBe(300000);
    for (let slot = 0; slot <= MOVE_TIME_UNLIMITED_SLOT; slot += 1) {
      expect(moveTimeSliderValueOf(moveTimeOfSliderValue(slot))).toBe(slot);
    }
  });

  it("shows a stored value off the marks where it falls between them, never past the last mark", () => {
    // The default's 1000 ms — a fifth of the way from "0" to "5".
    expect(moveTimeSliderValueOf(DEFAULT_ENGINE_SETTINGS.moveTimeMs)).toBeCloseTo(0.2);
    // An older record's 250 ms step, and half a minute between "20" and "30".
    expect(moveTimeSliderValueOf(250)).toBeCloseTo(0.05);
    expect(moveTimeSliderValueOf(25000)).toBeCloseTo(3.5);
    // Whatever a record carries beyond the bounds' top: the 300 s mark.
    expect(moveTimeSliderValueOf(400000)).toBe(7);
  });

  it("rounds a stray slot to the mark under the thumb — a value off the marks snaps on the next drag", () => {
    expect(moveTimeOfSliderValue(0.2)).toBe(MOVE_TIME_INSTANT_MS);
    expect(moveTimeOfSliderValue(1.2)).toBe(5000);
  });

  it("raises the bounds' top to the 300 s mark — what a new-game link clamps to", () => {
    expect(ENGINE_SETTING_BOUNDS.moveTimeMs).toEqual({ min: 0, max: 300000 });
  });
});
