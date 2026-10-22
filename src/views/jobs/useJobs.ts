import { useEffect, useSyncExternalStore } from "react";
import type { JobRecord } from "@pgntools/jobs-runtime";
import { useJob, useJobLive, useJobs } from "@pgntools/jobs-runtime/react";

import { jobEntitiesVersion, subscribeJobEntities } from "../../lib/jobs/entities";
import { jobRuntime, startJobRuntime } from "../../lib/jobs/runtime";

/*
  **The Jobs module's React bindings** (CTA-221) — the runtime's own hooks
  (`@pgntools/jobs-runtime/react`) over the page's runtime (`lib/jobs/runtime.ts`),
  and the entity registry's stores. Every list is `undefined` until the first
  read lands; the pre-render reads none.

  A screen reading jobs makes sure the runtime is started — from an effect,
  as the shell does (`JobRuntimeStarter`); starting is idempotent, and the
  runtime's records are read only once it is.
*/

const useStartedRuntime = () =>
  useEffect(() => {
    startJobRuntime();
  }, []);

/** Every job, as the runtime lists them — `undefined` until the first read. */
export const useJobRecords = (): readonly JobRecord[] | undefined => {
  useStartedRuntime();
  return useJobs(jobRuntime());
};

/** One job — `undefined` while loading or once it is gone. */
export const useJobRecord = (id: string): JobRecord | undefined => {
  useStartedRuntime();
  return useJob(jobRuntime(), id);
};

const subscribeRuntime = (listener: () => void) => jobRuntime().subscribe(listener);
const runtimeHeld = () => jobRuntime().held();

/**
 * **Is the queue held** (CTA-258) — the runtime's queue hold (`hold()` /
 * `release()`, durable and shared by every tab): while it is, no queued job
 * starts and a running one goes back to the queue from its checkpoint.
 * `undefined` until the first read lands; the pre-render reads none.
 */
export const useJobQueueHeld = (): boolean | undefined => {
  useStartedRuntime();
  return useSyncExternalStore(subscribeRuntime, runtimeHeld, () => undefined);
};

/** A running job's live telemetry, from whichever tab runs it. */
export const useJobLiveOf = (id: string): unknown => useJobLive(jobRuntime(), id);

/**
 * **The subjects' stores, subscribed** — a version that changes when a Case,
 * Project, repertoire or collection is renamed or deleted, so a screen
 * naming subjects re-renders. Read the registry (`JOB_ENTITIES`) after it.
 */
export const useJobEntitiesVersion = (): string => useSyncExternalStore(subscribeJobEntities, jobEntitiesVersion, () => "");
