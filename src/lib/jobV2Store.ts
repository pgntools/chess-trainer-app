import { ANALYSIS_PROJECTS_CHANNEL, JOBS_V2_STORE, openAnalysisProjectsDb } from "./analysisProjectsDb";
import { idbRecordStore } from "./idbRecordStore";
import { canCancelJob, canPauseJob, canResumeJob, isFinishedJob, jobV2From, jobV2Of, MAX_JOBS_V2, type JobV2, type JobV2Request } from "./jobsV2";
import { newRecordId } from "./recordId";

/**
 * **Where Jobs V2 are kept** (CTA-188) — the `jobs` object store of Analysis
 * V2's database, `chessapp.analysisProjects` (version 3,
 * `lib/analysisProjectsDb.ts`), one record per {@link JobV2}, newest first,
 * over [`idbRecordStore.ts`](./idbRecordStore.ts); the runner is
 * `lib/jobV2Runner.ts`, the reference `.claude/rules/analysis-v2.md` §6.
 *
 * Every read is the kept snapshot — `undefined` until the first read lands —
 * and every write a promise of `undefined` or a {@link JobV2Problem}; nothing
 * throws, and a write that changes nothing is a no-op. **Every operation is a
 * status change through the store**, never a call into the runner, which
 * acts on what it reads — so one tab's Jobs V2 view pauses another tab's run.
 * A Case or Project deleted takes its jobs with it ({@link removeJobsV2Of}).
 */

export type JobV2Problem = "storage" | "too-many";
export type EnqueueV2Problem = JobV2Problem | "invalid";

const jobs = idbRecordStore<JobV2>({
  db: openAnalysisProjectsDb,
  store: JOBS_V2_STORE,
  normalise: jobV2From,
  order: "newest-first",
  channel: ANALYSIS_PROJECTS_CHANNEL,
});

/** Jobs V2, newest first — `undefined` until the first read lands. Stable between changes. */
export const jobsV2Snapshot = jobs.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeJobsV2 = jobs.subscribe;

/** Jobs V2, read now if they have not been. */
export const loadJobsV2 = jobs.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledJobsV2 = jobs.settled;

/** **For tests**: forget what was read (the database is `deleteAnalysisProjectsDb`'s). */
export const resetJobV2Store = jobs.reset;

const write = jobs.write;

/**
 * Keep a new job at the top. Past {@link MAX_JOBS_V2} the oldest **finished**
 * jobs go to make room; when every job kept is unfinished it is refused,
 * `"too-many"`, nothing written.
 */
export const addJobV2 = async (job: JobV2): Promise<JobV2Problem | undefined> => {
  let tooMany = false;
  const problem = await write((current) => {
    const next = [job, ...current.filter((row) => row.id !== job.id)];
    let over = next.length - MAX_JOBS_V2;
    if (over <= 0) return next;
    const kept: JobV2[] = [];
    for (let index = next.length - 1; index >= 0; index -= 1) {
      const row = next[index];
      if (over > 0 && row !== job && isFinishedJob(row)) {
        over -= 1;
        continue;
      }
      kept.unshift(row);
    }
    if (over > 0) {
      tooMany = true;
      return current;
    }
    return kept;
  });
  return tooMany ? "too-many" : problem;
};

/**
 * **Queue a Case's computer analysis** — the New Job V2 popup's one call: the
 * job's id once kept, or why not (`"invalid"`: nothing to run). The runner
 * picks it up by itself.
 */
export const enqueueJobV2 = async (request: JobV2Request, now: Date = new Date()): Promise<string | EnqueueV2Problem> => {
  const job = jobV2Of(newRecordId(now), request, now);
  if (job === undefined) return "invalid";
  return (await addJobV2(job)) ?? job.id;
};

/** Change one job in place, its place in the list kept. `edit` answering the same record (or the job gone) is a no-op. */
export const updateJobV2 = (id: string, edit: (job: JobV2) => JobV2): Promise<JobV2Problem | undefined> =>
  write((current) => {
    const index = current.findIndex((row) => row.id === id);
    if (index < 0) return current;
    const next = edit(current[index]);
    return next === current[index] ? current : current.map((row, at) => (at === index ? next : row));
  });

/** **Cancel** a job that has not ended — the runner stops a running one. */
export const cancelJobV2 = (id: string, now: Date = new Date()): Promise<JobV2Problem | undefined> =>
  updateJobV2(id, (job) =>
    canCancelJob(job) ? { ...job, status: "cancelled", finishedAt: now.toISOString(), updatedAt: now.toISOString() } : job,
  );

/** **Pause** a job waiting or being run, its checkpoint kept — the runner stops a running one. */
export const pauseJobV2 = (id: string, now: Date = new Date()): Promise<JobV2Problem | undefined> =>
  updateJobV2(id, (job) => (canPauseJob(job) ? { ...job, status: "paused", updatedAt: now.toISOString() } : job));

/** **Resume** a paused, interrupted or failed job: queued again, from its checkpoint. */
export const resumeJobV2 = (id: string, now: Date = new Date()): Promise<JobV2Problem | undefined> =>
  updateJobV2(id, (job) =>
    canResumeJob(job) ? { ...job, status: "queued", error: null, finishedAt: null, updatedAt: now.toISOString() } : job,
  );

/** Forget one. Unknown ids are a no-op. A job being run is stopped by the runner, which reads it gone. */
export const removeJobV2 = (id: string): Promise<JobV2Problem | undefined> =>
  write((current) => (current.some((row) => row.id === id) ? current.filter((row) => row.id !== id) : current));

/**
 * **The jobs of Cases and Projects being deleted** — every job whose source
 * Case is one of `caseIds` or whose source Project is one of `projectIds`. A
 * running one is stopped by the runner, which reads it gone.
 */
export const removeJobsV2Of = ({
  projectIds = [],
  caseIds = [],
}: {
  projectIds?: readonly string[];
  caseIds?: readonly string[];
}): Promise<JobV2Problem | undefined> => {
  if (projectIds.length === 0 && caseIds.length === 0) return Promise.resolve(undefined);
  const projects = new Set(projectIds);
  const cases = new Set(caseIds);
  return write((current) => {
    const next = current.filter((row) => !projects.has(row.source.projectId) && !cases.has(row.source.caseId));
    return next.length === current.length ? current : next;
  });
};

/** **A reload's recovery**: every job read as `running` becomes `interrupted`, to be resumed by hand. */
export const interruptRunningJobsV2 = (now: Date = new Date()): Promise<JobV2Problem | undefined> =>
  write((current) =>
    current.some((row) => row.status === "running")
      ? current.map((row) => (row.status === "running" ? { ...row, status: "interrupted", updatedAt: now.toISOString() } : row))
      : current,
  );

/** One job by id, out of what has been read. */
export const findJobV2 = (id: string | null | undefined): JobV2 | undefined =>
  id === null || id === undefined ? undefined : jobsV2Snapshot()?.find((row) => row.id === id);
