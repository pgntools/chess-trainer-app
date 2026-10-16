import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { JobViewStatus } from "../../tables";

/** What the indicator reads of each job to announce its changes. */
export type AnnouncedJob = { id: string; title: string; status: JobViewStatus };

/** The statuses a reader is told a job reached — never queued, never the progress. */
const ANNOUNCED: Partial<Record<JobViewStatus, "started" | "paused" | "done" | "failed" | "cancelled">> = {
  running: "started",
  paused: "paused",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

/**
 * **The header indicator's announcement** (CTA-217, generalised from Jobs
 * V2's) — "Job finished: Carlsen – Nepomniachtchi." when a job reaches a
 * status worth saying, compared with the list last seen; nothing for the
 * first read (`undefined` until the queue is read), nor for a job that only
 * moved on. Adjusted during render (`react-hooks/set-state-in-effect`), so it
 * is the same in every tab. Hand its words to `JobsIndicatorView`'s
 * `announcement`.
 */
export const useJobStatusAnnouncement = (jobs: readonly AnnouncedJob[] | undefined): string => {
  const { t } = useTranslation();
  const [seen, setSeen] = useState<{ jobs: readonly AnnouncedJob[]; statuses: ReadonlyMap<string, JobViewStatus> } | undefined>();
  const [message, setMessage] = useState("");
  if (jobs !== undefined && seen?.jobs !== jobs) {
    if (seen !== undefined) {
      for (const job of jobs) {
        const reached = ANNOUNCED[job.status];
        if (reached !== undefined && seen.statuses.get(job.id) !== job.status) {
          setMessage(t(`jobs.indicator.${reached}`, { name: job.title }));
        }
      }
    }
    setSeen({ jobs, statuses: new Map(jobs.map((job) => [job.id, job.status])) });
  }
  return message;
};
