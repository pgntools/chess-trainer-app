import { createJobRuntime, type JobRuntime } from "@pgntools/jobs-runtime";
import { broadcastBus, indexedDbJobStore, webLocksLeader } from "@pgntools/jobs-runtime/browser";

import { newRecordId } from "../recordId";
import { jobKinds } from "./kinds";
import { registerSubjectRemover } from "./subjectDeletion";

/**
 * **The page's job runtime** (CTA-221) — the one `JobRuntime` of
 * `@pgntools/jobs-runtime` per page, the whole of the Jobs module's
 * execution: the durable queue (IndexedDB, {@link JOBS_NAMESPACE}), one tab
 * running jobs (a Web Lock; lease-only where there is none), leases,
 * retries, the outbox and the live feed — none of it re-implemented here.
 * The reference is `.claude/rules/jobs.md`.
 *
 * - **Namespace `chessapp.backgroundJobs`** — its database, lock and channel
 *   names. (`chessapp.jobs` is the legacy Jobs' database, removed in CTA-192
 *   and deleted on load by `lib/retiredDatabases.ts`.)
 * - **One lane, one job at a time**: `engine` (the computer analysis, the
 *   repertoire evaluation). The `cpu` lane went with the collection merge, its
 *   one kind (CTA-232): a stored job of an unregistered kind has no lane and
 *   is never claimed.
 * - **At most 200 jobs**: past it the oldest finished go, with their files;
 *   an enqueue is refused when every one is unfinished.
 * - **Made lazily, started by the shell in an effect** (`views/jobs/JobsShell.tsx`)
 *   — never at import, never during the pre-render, never stopped by an
 *   effect cleanup (a StrictMode remount must not leave a job half run).
 *   Making it touches nothing; a screen reading it before the shell starts
 *   it reads the store as any call does.
 */

const JOBS_NAMESPACE = "chessapp.backgroundJobs";

/** Its database — the namespace's name. */
export const JOBS_DB: string = JOBS_NAMESPACE;

/** The lanes and their concurrency. */
export const JOB_LANES = { engine: { concurrency: 1 } } as const;

/** How many jobs are kept. */
const MAX_JOBS = 200;

let runtime: JobRuntime | undefined;

/** **The page's runtime** — made on the first call, never started by it. */
export const jobRuntime = (): JobRuntime => {
  if (runtime === undefined) {
    const made: JobRuntime = createJobRuntime({
      namespace: JOBS_NAMESPACE,
      kinds: jobKinds(),
      lanes: JOB_LANES,
      store: indexedDbJobStore({ name: JOBS_DB }),
      lock: webLocksLeader(),
      bus: broadcastBus({ name: `${JOBS_NAMESPACE}.bus` }),
      newId: () => newRecordId(),
      retention: { maxJobs: MAX_JOBS },
    });
    runtime = made;
    // The deletion rule's hook: a Case, Project, repertoire or collection deleted takes its unfinished jobs.
    void registerSubjectRemover((subjects) => made.removeUnfinishedOf(subjects));
  }
  return runtime;
};

/** **Start the page's runtime** — idempotent; the shell's effect. */
export const startJobRuntime = (): JobRuntime => {
  const made = jobRuntime();
  made.start();
  return made;
};

/** **For tests**: stop the page's runtime and forget it — its database is {@link deleteJobsDb}'s. */
export const stopJobRuntime = async (): Promise<void> => {
  const stopping = runtime;
  runtime = undefined;
  await registerSubjectRemover(undefined);
  await stopping?.stop();
};

/** **For tests**: delete the jobs' database. Resolves once it is gone (or could not be). */
export const deleteJobsDb = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(JOBS_DB);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
