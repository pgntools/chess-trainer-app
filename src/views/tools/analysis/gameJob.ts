import { isFinishedJob, type Job } from "../../../lib/jobs";

/**
 * The job a game's Analyse leads to when it has one (CTA-177): the one this
 * board sent; else, of the jobs sent from the same saved analysis, the newest
 * unfinished one, else the newest done one, else the newest of any — so a
 * board or a list row reopened later still leads to its results. A game never
 * saved and never sent has none.
 */
export const jobOfGame = (
  jobs: readonly Job[] | undefined,
  sentJobId: string | null,
  analysisId: string | null,
): Job | undefined => {
  if (jobs === undefined) return undefined;
  const sent = sentJobId === null ? undefined : jobs.find((job) => job.id === sentJobId);
  if (sent !== undefined || analysisId === null) return sent;
  // The store keeps the newest first.
  const ofRecord = jobs.filter((job) => job.source.analysisId === analysisId);
  return ofRecord.find((job) => !isFinishedJob(job)) ?? ofRecord.find((job) => job.status === "done") ?? ofRecord[0];
};

/** The Jobs screen at one job. */
export const jobPath = (jobId: string): string => `/jobs?job=${encodeURIComponent(jobId)}`;
