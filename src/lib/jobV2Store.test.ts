import { afterEach, describe, expect, it, vi } from "vitest";

import { ANALYSIS_PROJECTS_DB_NAME } from "./analysisProjectsDb";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "./computerAnalysis";
import { done } from "./idb";
import { jobV2Of, type JobStatus, MAX_JOBS_V2, type JobV2, type JobV2Request } from "./jobsV2";
import {
  addJobV2,
  cancelJobV2,
  enqueueJobV2,
  findJobV2,
  interruptRunningJobsV2,
  jobsV2Snapshot,
  loadJobsV2,
  pauseJobV2,
  removeJobsV2Of,
  removeJobV2,
  resetJobV2Store,
  resumeJobV2,
  updateJobV2,
} from "./jobV2Store";

const PGN = "1. e4 e5 2. Nf3 Nc6 *";

const request: JobV2Request = {
  source: { projectId: "p", caseId: "c", name: "A case", pgn: PGN },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
  preset: { id: "default", name: "Default", values: {} },
  target: { kind: "project", projectId: "p" },
};

const jobOf = (id: string, status: JobStatus = "queued", source: Partial<JobV2["source"]> = {}): JobV2 => {
  const job = jobV2Of(id, request, new Date("2026-10-12T12:00:00Z"))!;
  return { ...job, status, source: { ...job.source, ...source } };
};

const reload = async () => {
  resetJobV2Store();
  return loadJobsV2();
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the Jobs V2 store (CTA-188)", () => {
  it("keeps a job in Analysis V2's database, newest first, and reads it back after a reload", async () => {
    await addJobV2(jobOf("one"));
    await addJobV2(jobOf("two"));
    expect(jobsV2Snapshot()?.map((job) => job.id)).toEqual(["two", "one"]);
    const read = await reload();
    expect(read.map((job) => job.id)).toEqual(["two", "one"]);
    expect(read[0]).toEqual(jobOf("two"));
  });

  it("enqueues a Case's computer analysis: its id once kept, or why not", async () => {
    const id = await enqueueJobV2(request);
    expect(findJobV2(id as string)).toMatchObject({ status: "queued", source: { caseId: "c" } });
    expect(await enqueueJobV2({ ...request, options: { ...request.options, outputs: [] } })).toBe("invalid");
  });

  it("drops a stored record the normaliser refuses", async () => {
    await addJobV2(jobOf("good"));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(ANALYSIS_PROJECTS_DB_NAME);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await done(db.transaction("jobs", "readwrite").objectStore("jobs").put({ id: "bad", seq: 99, value: { id: "bad" } }));
    db.close();
    expect((await reload()).map((job) => job.id)).toEqual(["good"]);
  });

  it("changes a job in place; pauses, cancels and resumes as V1's do, a change of nothing writing nothing", async () => {
    await addJobV2(jobOf("live", "running"));
    await addJobV2(jobOf("over", "done"));
    await addJobV2(jobOf("cut", "interrupted"));
    await updateJobV2("live", (job) => ({ ...job, updatedAt: "2026-10-12T12:30:00.000Z" }));
    await pauseJobV2("live");
    expect(findJobV2("live")?.status).toBe("paused");

    const before = jobsV2Snapshot();
    await cancelJobV2("over");
    await resumeJobV2("over");
    await pauseJobV2("over");
    await updateJobV2("unknown", (job) => ({ ...job, status: "done" }));
    expect(jobsV2Snapshot()).toBe(before);

    await resumeJobV2("cut");
    expect(findJobV2("cut")?.status).toBe("queued");
    await cancelJobV2("cut", new Date("2026-10-12T13:00:00Z"));
    expect(findJobV2("cut")).toMatchObject({ status: "cancelled", finishedAt: "2026-10-12T13:00:00.000Z" });
  });

  it("turns every running job into an interrupted one", async () => {
    await addJobV2(jobOf("a", "running"));
    await addJobV2(jobOf("b"));
    await interruptRunningJobsV2();
    expect((await reload()).map((job) => [job.id, job.status])).toEqual([
      ["b", "queued"],
      ["a", "interrupted"],
    ]);
  });

  it("forgets a job, and the jobs of Cases and Projects deleted", async () => {
    await addJobV2(jobOf("a"));
    await addJobV2(jobOf("b", "queued", { caseId: "c2" }));
    await addJobV2(jobOf("c", "queued", { projectId: "p2", caseId: "c3" }));
    await addJobV2(jobOf("d", "queued", { projectId: "p3", caseId: "c4" }));
    await removeJobV2("a");
    await removeJobV2("never");
    await removeJobsV2Of({ caseIds: ["c2"] });
    await removeJobsV2Of({ projectIds: ["p2"] });
    expect(jobsV2Snapshot()?.map((job) => job.id)).toEqual(["d"]);
    const before = jobsV2Snapshot();
    await removeJobsV2Of({});
    await removeJobsV2Of({ caseIds: ["none"] });
    expect(jobsV2Snapshot()).toBe(before);
  });

  it("past the cap drops the oldest finished jobs, never an unfinished one", async () => {
    for (let index = 0; index < MAX_JOBS_V2; index += 1) {
      await addJobV2(jobOf(`j${index}`, index < 1 ? "done" : "interrupted"));
    }
    expect(await addJobV2(jobOf("new"))).toBeUndefined();
    expect(jobsV2Snapshot()!.map((job) => job.id)).not.toContain("j0");
    const before = jobsV2Snapshot();
    expect(await addJobV2(jobOf("one too many"))).toBe("too-many");
    expect(jobsV2Snapshot()).toBe(before);
  });

  it("answers storage when IndexedDB refuses the write", async () => {
    await addJobV2(jobOf("kept"));
    const before = jobsV2Snapshot();
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(await enqueueJobV2(request)).toBe("storage");
    expect(jobsV2Snapshot()).toBe(before);
  });
});
