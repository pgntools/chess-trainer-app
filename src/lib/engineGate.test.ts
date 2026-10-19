import { describe, expect, it } from "vitest";

import { claimingEngineJobOf, ENGINE_JOB_LANE, runningEngineJobOf } from "./engineGate";

type Job = { id: string; lane: string; status: "queued" | "running" | "paused" | "done"; control?: "pause" | "cancel"; title: string };

const job = (id: string, patch: Partial<Job> = {}): Job => ({ id, lane: ENGINE_JOB_LANE, status: "running", title: `Job ${id}`, ...patch });

describe("runningEngineJobOf", () => {
  it("is the engine job running, whatever it is asked", () => {
    expect(runningEngineJobOf([job("a", { status: "queued" }), job("b")])?.id).toBe("b");
    expect(runningEngineJobOf([job("a", { control: "pause" })])?.id).toBe("a");
    expect(runningEngineJobOf([job("a", { control: "cancel" })])?.id).toBe("a");
  });

  it("is none for no records, nothing running, or a job of another lane", () => {
    expect(runningEngineJobOf(undefined)).toBeUndefined();
    expect(runningEngineJobOf([])).toBeUndefined();
    expect(runningEngineJobOf([job("a", { status: "paused" }), job("b", { status: "done" })])).toBeUndefined();
    expect(runningEngineJobOf([job("a", { lane: "cpu" })])).toBeUndefined();
  });
});

describe("claimingEngineJobOf", () => {
  it("is the engine job running and asked nothing", () => {
    expect(claimingEngineJobOf([job("a")])?.id).toBe("a");
  });

  it("leaves out a job asked to pause or cancel, and the one this board is pausing", () => {
    expect(claimingEngineJobOf([job("a", { control: "pause" })])).toBeUndefined();
    expect(claimingEngineJobOf([job("a", { control: "cancel" })])).toBeUndefined();
    expect(claimingEngineJobOf([job("a")], "a")).toBeUndefined();
    expect(claimingEngineJobOf([job("a")], "b")?.id).toBe("a");
  });

  it("is none for no records, a queued job, or a job of another lane", () => {
    expect(claimingEngineJobOf(undefined)).toBeUndefined();
    expect(claimingEngineJobOf([job("a", { status: "queued" })])).toBeUndefined();
    expect(claimingEngineJobOf([job("a", { lane: "cpu" })])).toBeUndefined();
  });
});
