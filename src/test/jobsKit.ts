import { createJobRuntime, type JobKind, type JobRecord, type JobRuntime, type JobStore } from "@pgntools/jobs-runtime";
import { manualClock, memoryLock, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { JOB_LANES } from "../lib/jobs/runtime";

/*
  **The Jobs module's test kit** (CTA-221) — what the kinds' tests share over
  the runtime's own (`@pgntools/jobs-runtime/testing`): an engine that answers
  every search at once, a store that "crashes" after its Nth write, and a
  runtime over either on a manual clock. A test file mocks
  `lib/engines/builtin` with the harness's `builtinEnginesMock` itself.
*/

// The engine that answers every search at once, in a module of its own (no runtime import).
export { AnsweringEngine, engineDeps, legalMove } from "./answeringEngine";

/**
 * A store whose writes fail from the `after`+1-th on — a tab that died mid-run, its writes never landing.
 * The queue hold's meta (CTA-258) is passed on where the inner store keeps it, its write one of the counted.
 */
export const crashingStore = (inner: JobStore, after: number): { store: JobStore; crashed: () => boolean; writes: () => number } => {
  let writes = 0;
  let crashed = false;
  const gate =
    <A extends unknown[], R>(write: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      if (crashed || writes >= after) {
        crashed = true;
        throw new Error("The tab crashed.");
      }
      writes += 1;
      return write(...args);
    };
  return {
    store: {
      list: () => inner.list(),
      get: (id) => inner.get(id),
      add: gate((job: JobRecord) => inner.add(job)),
      update: gate((id: string, edit: (job: JobRecord) => JobRecord | undefined) => inner.update(id, edit)),
      remove: gate((ids: readonly string[]) => inner.remove(ids)),
      putPart: gate((jobId: string, key: string, seq: number, chunk: string | Uint8Array) => inner.putPart(jobId, key, seq, chunk)),
      sealArtifact: gate((jobId: string, key: string, meta: { name: string; mimeType: string }) => inner.sealArtifact(jobId, key, meta)),
      readArtifact: (artifactId) => inner.readArtifact(artifactId),
      subscribe: (listener) => inner.subscribe(listener),
      ...(inner.getMeta !== undefined && inner.putMeta !== undefined
        ? { getMeta: inner.getMeta.bind(inner), putMeta: gate(inner.putMeta.bind(inner)) }
        : {}),
    },
    crashed: () => crashed,
    writes: () => writes,
  };
};

/** A runtime of the app's lanes over `store`, on `clock` — a tab, in a test. */
export const testRuntime = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the runtime's own option type
  kinds: readonly JobKind<any, any, any>[],
  store: JobStore,
  clock: ReturnType<typeof manualClock>,
  lock = memoryLock(),
): JobRuntime => {
  let next = 0;
  return createJobRuntime({
    namespace: "test.backgroundJobs",
    kinds,
    lanes: JOB_LANES,
    store,
    lock,
    clock,
    newId: () => {
      next += 1;
      return `j${Date.now().toString(36)}${next.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    },
  });
};

/** A real pause — for kind code that yields on the platform's timers (the Library's indexer), which the manual clock does not drive. */
const breath = (ms = 5): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * **Run a job to its end** — settle, then move the manual clock on (and let
 * real time pass a little) while it is not finished; at most `rounds` times.
 */
export const runToEnd = async (runtime: JobRuntime, clock: ReturnType<typeof manualClock>, id: string, rounds = 400): Promise<void> => {
  for (let round = 0; round < rounds; round += 1) {
    await runUntilIdle(runtime);
    const status = runtime.snapshot()?.find((job) => job.id === id)?.status;
    if (status === "done" || status === "failed" || status === "cancelled" || status === undefined) return;
    await clock.advance(1_000);
    await breath();
  }
};

/** The runtime's lease (its default): a stalled job is taken over once this has passed. */
const LEASE_MS = 30_000;

/**
 * **Crash after the Nth write, then recover** — `run` starts a job on a
 * runtime whose store dies after `after` writes (and stops it, as a closed
 * tab would); then a second runtime over the surviving store takes over once
 * the dead one's lease has run out, resumes the job if its kind waits to be
 * asked, and runs everything to its end. Answers the job's record as the
 * second runtime leaves it — `undefined` when the job was never kept.
 */
export const crashThenRecover = async ({
  kinds,
  inner,
  after,
  enqueue,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the runtime's own option type
  kinds: readonly JobKind<any, any, any>[];
  inner: JobStore;
  after: number;
  enqueue: (runtime: JobRuntime) => Promise<{ id: string } | { problem: string }>;
}): Promise<{ job: JobRecord | undefined; crashed: boolean }> => {
  const clock = manualClock();
  const dying = crashingStore(inner, after);
  const first = testRuntime(kinds, dying.store, clock);
  first.start();
  const queued = await enqueue(first);
  // Run as the reference run does — the clock moved on while the job waits — until the tab dies (or the job ends).
  for (let round = 0; round < 400 && "id" in queued && !dying.crashed(); round += 1) {
    await runUntilIdle(first);
    const status = first.snapshot()?.find((job) => job.id === queued.id)?.status;
    if (status === "done" || status === "failed" || status === "cancelled") break;
    await clock.advance(1_000);
    await breath();
  }
  await first.stop();
  if (!("id" in queued)) return { job: undefined, crashed: dying.crashed() };

  const second = testRuntime(kinds, inner, clock);
  second.start();
  await runUntilIdle(second);
  // The dead tab's lease runs out; the job is interrupted (or queued again, a kind that resumes by itself).
  await clock.advance(LEASE_MS + 1_000);
  await runUntilIdle(second);
  const stalled = second.snapshot()?.find((job) => job.id === queued.id);
  if (stalled?.status === "interrupted" || stalled?.status === "paused") {
    await second.resume(queued.id);
  }
  await runToEnd(second, clock, queued.id);
  const job = second.snapshot()?.find((each) => each.id === queued.id);
  await second.stop();
  return { job, crashed: dying.crashed() };
};
