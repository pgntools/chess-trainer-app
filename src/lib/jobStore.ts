import { idbDatabase } from "./idb";
import { idbRecordStore } from "./idbRecordStore";
import {
  canCancelJob,
  canResumeJob,
  computerAnalysisJobOf,
  isFinishedJob,
  jobFrom,
  MAX_JOBS,
  type ComputerAnalysisRequest,
  type Job,
} from "./jobs";
import { newRecordId } from "./recordId";

/**
 * Where the background jobs are kept (CTA-173): **IndexedDB** —
 * `chessapp.jobs`, its `jobs` object store, one record per {@link Job},
 * newest first — over the shared [`idbRecordStore.ts`](./idbRecordStore.ts).
 * One store, one database, in one file (as `playedGameStore.ts`). The runner
 * that works through them is `lib/jobRunner.ts`; the reference is
 * `.claude/rules/jobs.md`, the app's storage as a whole `database.md`.
 *
 * Every read is the kept snapshot — `undefined` until the first read lands —
 * and every write a promise of `undefined` or a {@link JobProblem}. Nothing
 * here throws. A write that changes nothing is a no-op (the same array), so a
 * checkpoint the job already has, or a cancel of a job that has ended, writes
 * nothing.
 *
 * **Every operation is a status change through the store**, never a call into
 * the runner: Cancel, Resume and Delete write the record, and the runner —
 * subscribed, in whichever tab holds it — acts on what it reads. So the Jobs
 * screen in one tab cancels a job another tab is running.
 */

/** The database the background jobs live in. */
export const JOBS_DB_NAME = "chessapp.jobs";
const DB_VERSION = 1;
const JOBS_STORE = "jobs";

const jobsDb = idbDatabase(JOBS_DB_NAME, DB_VERSION, [JOBS_STORE]);

/** **For tests**: close the connection and delete the database. */
export const deleteJobsDb = jobsDb.remove;

/**
 * What went wrong: storage refused the write, the store is full of jobs that
 * have not ended ({@link MAX_JOBS}), or — enqueuing — there was nothing to
 * run (a PGN that does not read, no analysed move, no variant ticked).
 */
export type JobProblem = "storage" | "too-many";
export type EnqueueProblem = JobProblem | "invalid";

const jobs = idbRecordStore<Job>({
  db: jobsDb.open,
  store: JOBS_STORE,
  normalise: jobFrom,
  order: "newest-first",
  channel: JOBS_DB_NAME,
});

/** The jobs, newest first — `undefined` until the first read lands. Stable between changes. */
export const jobsSnapshot = jobs.snapshot;

/** Subscribe to changes — this tab's writes, and other tabs'. The first subscriber starts the read. */
export const subscribeJobs = jobs.subscribe;

/** The jobs, read now if they have not been. */
export const loadJobs = jobs.load;

/** Resolves once every write issued so far has landed — what a test waits on before it resets. */
export const settledJobs = jobs.settled;

/** **For tests**: forget what was read (the database is {@link deleteJobsDb}'s). */
export const resetJobStore = jobs.reset;

const write = jobs.write;

/**
 * Keep a new job at the top. Past {@link MAX_JOBS} the oldest **finished**
 * jobs go to make room; when every job kept is unfinished it is refused,
 * `"too-many"`, nothing written.
 */
export const addJob = async (job: Job): Promise<JobProblem | undefined> => {
  let tooMany = false;
  const problem = await write((current) => {
    const next = [job, ...current.filter((row) => row.id !== job.id)];
    let over = next.length - MAX_JOBS;
    if (over <= 0) return next;
    const kept: Job[] = [];
    // From the oldest end: drop finished jobs while the list is over the cap.
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
 * **Queue a game's computer analysis** — the board's one call (CTA-174): the
 * job's id once it is kept, or why not. The runner picks it up by itself.
 */
export const enqueueComputerAnalysis = async (
  request: ComputerAnalysisRequest,
  now: Date = new Date(),
): Promise<string | EnqueueProblem> => {
  const job = computerAnalysisJobOf(newRecordId(now), request, now);
  if (job === undefined) return "invalid";
  return (await addJob(job)) ?? job.id;
};

/**
 * Change one job in place — its place in the list kept. `edit` answering the
 * same record (or the job gone) is a no-op.
 */
export const updateJob = (id: string, edit: (job: Job) => Job): Promise<JobProblem | undefined> =>
  write((current) => {
    const index = current.findIndex((row) => row.id === id);
    if (index < 0) return current;
    const next = edit(current[index]);
    return next === current[index] ? current : current.map((row, at) => (at === index ? next : row));
  });

/**
 * **Cancel** a job that has not ended: `cancelled`, for good. A running one is
 * stopped by the runner, which reads the status and stops its search.
 */
export const cancelJob = (id: string, now: Date = new Date()): Promise<JobProblem | undefined> =>
  updateJob(id, (job) =>
    canCancelJob(job)
      ? { ...job, status: "cancelled", finishedAt: now.toISOString(), updatedAt: now.toISOString() }
      : job,
  );

/**
 * **Resume** an interrupted or failed job: queued again, its checkpoint kept,
 * so the runner goes on from the first position with no result.
 */
export const resumeJob = (id: string, now: Date = new Date()): Promise<JobProblem | undefined> =>
  updateJob(id, (job) =>
    canResumeJob(job)
      ? { ...job, status: "queued", error: null, finishedAt: null, updatedAt: now.toISOString() }
      : job,
  );

/** Forget one. Unknown ids are a no-op. A job being run is stopped by the runner, which reads it gone. */
export const removeJob = (id: string): Promise<JobProblem | undefined> =>
  write((current) => (current.some((row) => row.id === id) ? current.filter((row) => row.id !== id) : current));

/**
 * **A reload's recovery**: every job read as `running` — a run this page no
 * longer has, since it is the runner's to say — becomes `interrupted`, to be
 * resumed by hand and never on its own (an engine run is heavy on CPU).
 */
export const interruptRunningJobs = (now: Date = new Date()): Promise<JobProblem | undefined> =>
  write((current) =>
    current.some((row) => row.status === "running")
      ? current.map((row) =>
          row.status === "running" ? { ...row, status: "interrupted", updatedAt: now.toISOString() } : row,
        )
      : current,
  );

/** One job by id, out of what has been read — `undefined` for an unknown id, and before the first read. */
export const findJob = (id: string | null | undefined): Job | undefined =>
  id === null || id === undefined ? undefined : jobsSnapshot()?.find((row) => row.id === id);
