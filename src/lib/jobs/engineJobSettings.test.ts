import { describe, expect, it } from "vitest";

import { COMPUTER_ANALYSIS_BOUNDS } from "../computerAnalysis";
import { DEFAULT_ENGINE_ID } from "../engines";
import {
  currentJobEngineSettings,
  jobContinuationFrom,
  jobEngineChanges,
  recordedJobEngineSettingsFrom,
  type JobEngineSettings,
} from "./engineJobSettings";

/*
  **An engine job's settings against the ones in effect** (CTA-236) — what
  Resume compares: the engine, the preset's option values, depth, move time,
  Threads and Hash; a field the job does not carry never different.
*/

const CURRENT: JobEngineSettings = {
  engine: DEFAULT_ENGINE_ID,
  preset: { id: "default", name: "Default", values: {} },
  depth: 20,
  moveTimeMs: 0,
  threads: 1,
  hashMb: 16,
};

describe("jobEngineChanges (CTA-236)", () => {
  it("finds nothing when the job runs with the current settings", () => {
    expect(jobEngineChanges(CURRENT, CURRENT)).toEqual([]);
    // Another preset sending the same values is no difference: the values are what the engine gets.
    expect(jobEngineChanges({ ...CURRENT, preset: { id: "", name: "Mine", values: {} } }, CURRENT)).toEqual([]);
  });

  it("lists each field that differs, the job's value then the current one, in the dialog's order", () => {
    const job: JobEngineSettings = {
      engine: "hosted:stockfish",
      preset: { id: "deep", name: "Deep", values: { Contempt: 20, UCI_ShowWDL: true, "Move Overhead": 300 } },
      depth: 30,
      moveTimeMs: 5_000,
      threads: 8,
      hashMb: 1_024,
    };
    const current = { ...CURRENT, preset: { id: "fast", name: "Fast", values: { "Move Overhead": 300, UCI_ShowWDL: false, Ponder: false } } };
    expect(jobEngineChanges(job, current)).toEqual([
      { field: "engine", job: "hosted:stockfish", current: DEFAULT_ENGINE_ID },
      { field: "preset", job: "Deep", current: "Fast" },
      { field: "option", name: "Contempt", job: 20, current: undefined },
      { field: "option", name: "UCI_ShowWDL", job: true, current: false },
      { field: "option", name: "Ponder", job: undefined, current: false },
      { field: "depth", job: 30, current: 20 },
      { field: "moveTimeMs", job: 5_000, current: 0 },
      { field: "threads", job: 8, current: 1 },
      { field: "hashMb", job: 1_024, current: 16 },
    ]);
  });

  it("lists a preset edited since by its options alone — its name is the same", () => {
    const job = { preset: { id: "deep", name: "Deep", values: { Contempt: 20 } } };
    const current = { ...CURRENT, preset: { id: "deep", name: "Deep", values: { Contempt: 0 } } };
    expect(jobEngineChanges(job, current)).toEqual([{ field: "option", name: "Contempt", job: 20, current: 0 }]);
  });

  it("never calls a field the job does not carry different — an older record's", () => {
    expect(jobEngineChanges({}, CURRENT)).toEqual([]);
    expect(jobEngineChanges({ depth: 24 }, CURRENT)).toEqual([{ field: "depth", job: 24, current: 20 }]);
  });
});

describe("recordedJobEngineSettingsFrom (CTA-236)", () => {
  it("reads what a stored input carries, and leaves out what it does not or what will not read", () => {
    expect(
      recordedJobEngineSettingsFrom(DEFAULT_ENGINE_ID, { id: "deep", name: "Deep", values: { Contempt: 20, Bad: { no: 1 } } }, { depth: 18, moveTimeMs: 0, threads: "2", hashMb: Number.NaN }),
    ).toEqual({ engine: DEFAULT_ENGINE_ID, preset: { id: "deep", name: "Deep", values: { Contempt: 20 } }, depth: 18, moveTimeMs: 0 });
    expect(recordedJobEngineSettingsFrom("", null, undefined)).toEqual({});
    expect(recordedJobEngineSettingsFrom(undefined, { name: "No id" }, [])).toEqual({});
    // A preset with no name or values reads as named nothing and sending nothing.
    expect(recordedJobEngineSettingsFrom(undefined, { id: "" }, {})).toEqual({ preset: { id: "", name: "", values: {} } });
  });
});

describe("currentJobEngineSettings (CTA-236)", () => {
  it("is what the New-job forms would give a job — every number held to the engine's bounds", () => {
    const preset = { id: "fast", name: "Fast", values: { Contempt: 10 } };
    expect(currentJobEngineSettings({ engine: DEFAULT_ENGINE_ID, preset, search: { depth: 22, moveTimeMs: 3_000 }, threads: 1, hashMb: 32 })).toEqual({
      engine: DEFAULT_ENGINE_ID,
      preset,
      depth: 22,
      moveTimeMs: 3_000,
      threads: 1,
      hashMb: 32,
    });
    const held = currentJobEngineSettings({ engine: DEFAULT_ENGINE_ID, preset, search: { depth: 9_999, moveTimeMs: 0 }, threads: 1, hashMb: 1_000_000 });
    // A computer analysis's own top depth, which a deeper preset is held to.
    expect(held.depth).toBe(COMPUTER_ANALYSIS_BOUNDS.depth.max);
    expect(held.hashMb).toBeLessThan(1_000_000);
  });
});

describe("jobContinuationFrom (CTA-236)", () => {
  it("reads the job a new one continues, and nothing without its id", () => {
    expect(jobContinuationFrom({ jobId: "j1", title: "Alice – Bob", createdAt: "2026-10-01T10:00:00.000Z" })).toEqual({
      jobId: "j1",
      title: "Alice – Bob",
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    expect(jobContinuationFrom({ jobId: "j1" })).toEqual({ jobId: "j1", title: "", createdAt: "" });
    expect(jobContinuationFrom({ jobId: "" })).toBeUndefined();
    expect(jobContinuationFrom("j1")).toBeUndefined();
  });
});
