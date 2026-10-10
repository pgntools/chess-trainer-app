import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "./computerAnalysis";
import { done } from "./idb";
import { computerAnalysisJobOf, MAX_JOBS, type ComputerAnalysisRequest, type Job, type JobStatus } from "./jobs";
import {
  addJob,
  cancelJob,
  enqueueComputerAnalysis,
  findJob,
  interruptRunningJobs,
  JOBS_DB_NAME,
  jobsSnapshot,
  loadJobs,
  removeJob,
  resetJobStore,
  pauseJob,
  resumeJob,
  updateJob,
} from "./jobStore";

const PGN = "1. e4 e5 2. Nf3 Nc6 *";

const request: ComputerAnalysisRequest = {
  source: { analysisId: null, name: "A game", folderId: null, pgn: PGN },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
};

const jobOf = (id: string, status: JobStatus = "queued", at = new Date("2026-10-10T12:00:00Z")): Job => ({
  ...computerAnalysisJobOf(id, request, at)!,
  status,
});

/** A reload: what was kept is forgotten, and read back from IndexedDB itself. */
const reload = async () => {
  resetJobStore();
  return loadJobs();
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the jobs store (CTA-173)", () => {
  it("keeps a job, newest first, and reads it back after a reload", async () => {
    expect(await addJob(jobOf("one"))).toBeUndefined();
    expect(await addJob(jobOf("two"))).toBeUndefined();
    expect(jobsSnapshot()?.map((job) => job.id)).toEqual(["two", "one"]);

    const read = await reload();
    expect(read.map((job) => job.id)).toEqual(["two", "one"]);
    expect(read[0]).toEqual(jobOf("two"));
  });

  it("enqueues a computer analysis: its id once kept, or why not", async () => {
    const id = await enqueueComputerAnalysis(request);
    expect(typeof id).toBe("string");
    expect(findJob(id as string)).toMatchObject({ status: "queued", source: { name: "A game" } });
    expect(await enqueueComputerAnalysis({ ...request, options: { ...request.options, outputs: [] } })).toBe("invalid");
  });

  it("drops a stored record the normaliser refuses, and reads the rest", async () => {
    await addJob(jobOf("good"));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(JOBS_DB_NAME);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction("jobs", "readwrite");
    await done(tx.objectStore("jobs").put({ id: "bad", seq: 99, value: { id: "bad", kind: "mystery" } }));
    db.close();

    expect((await reload()).map((job) => job.id)).toEqual(["good"]);
  });

  it("changes a job in place, and a change of nothing writes nothing", async () => {
    await addJob(jobOf("one"));
    await addJob(jobOf("two"));
    await updateJob("one", (job) => ({ ...job, status: "running" }));
    expect(jobsSnapshot()?.map((job) => [job.id, job.status])).toEqual([
      ["two", "queued"],
      ["one", "running"],
    ]);

    const before = jobsSnapshot();
    await updateJob("one", (job) => job);
    await updateJob("unknown", (job) => ({ ...job, status: "done" }));
    expect(jobsSnapshot()).toBe(before);
  });

  it("cancels a job that has not ended, and resumes one a reload or a failure stopped", async () => {
    await addJob(jobOf("live", "running"));
    await addJob(jobOf("over", "done"));
    await addJob(jobOf("cut", "interrupted"));
    await cancelJob("live", new Date("2026-10-10T13:00:00Z"));
    expect(findJob("live")).toMatchObject({ status: "cancelled", finishedAt: "2026-10-10T13:00:00.000Z" });

    const before = jobsSnapshot();
    await cancelJob("over");
    await resumeJob("over");
    expect(jobsSnapshot()).toBe(before);

    await resumeJob("cut");
    expect(findJob("cut")?.status).toBe("queued");
  });

  it("pauses a job waiting or being run, its checkpoint kept, and resumes it (CTA-178)", async () => {
    await addJob(jobOf("live", "running"));
    await addJob(jobOf("waiting", "queued"));
    await addJob(jobOf("over", "done"));
    await pauseJob("live", new Date("2026-10-10T13:00:00Z"));
    await pauseJob("waiting");
    expect(findJob("live")).toMatchObject({ status: "paused", updatedAt: "2026-10-10T13:00:00.000Z", finishedAt: null });
    expect(findJob("waiting")?.status).toBe("paused");

    const before = jobsSnapshot();
    await pauseJob("over");
    await pauseJob("live");
    expect(jobsSnapshot()).toBe(before);

    await resumeJob("live");
    expect(findJob("live")?.status).toBe("queued");
    expect((await reload()).find((job) => job.id === "waiting")?.status).toBe("paused");
  });

  it("turns every running job into an interrupted one — a reload's recovery", async () => {
    await addJob(jobOf("a", "running"));
    await addJob(jobOf("b", "queued"));
    await interruptRunningJobs();
    expect((await reload()).map((job) => [job.id, job.status])).toEqual([
      ["b", "queued"],
      ["a", "interrupted"],
    ]);
  });

  it("forgets a job", async () => {
    await addJob(jobOf("a"));
    await removeJob("a");
    await removeJob("never");
    expect(jobsSnapshot()).toEqual([]);
  });

  it("past the cap drops the oldest finished jobs, never an unfinished one", async () => {
    // The oldest finished first, then unfinished ones up to the cap.
    for (let index = 0; index < MAX_JOBS; index += 1) {
      expect(await addJob(jobOf(`j${index}`, index < 2 ? "done" : "interrupted"))).toBeUndefined();
    }
    expect(await addJob(jobOf("new"))).toBeUndefined();
    const ids = jobsSnapshot()!.map((job) => job.id);
    expect(ids).toHaveLength(MAX_JOBS);
    expect(ids[0]).toBe("new");
    expect(ids).not.toContain("j0");
    expect(ids).toContain("j1");

    await addJob(jobOf("newer"));
    // Every finished job is gone: the next one is refused rather than drop unfinished work.
    expect(jobsSnapshot()!.some((job) => job.status === "done")).toBe(false);
    const before = jobsSnapshot();
    expect(await addJob(jobOf("one too many"))).toBe("too-many");
    expect(jobsSnapshot()).toBe(before);
  });

  it("answers storage when IndexedDB refuses the write, and keeps the list as it was", async () => {
    await addJob(jobOf("kept"));
    const before = jobsSnapshot();
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(await addJob(jobOf("refused"))).toBe("storage");
    expect(await enqueueComputerAnalysis(request)).toBe("storage");
    expect(jobsSnapshot()).toBe(before);
  });
});
