import type { AnnouncedJob } from "./jobStatusAnnouncement";
import type { JobsIndicatorViewProps } from "./JobsIndicatorView";

/*
  What the header's Jobs indicator shows (CTA-217): a job running, with and
  without its engine heard, the queue alone, nothing. Imported only by the
  block's gallery and its test.
*/

export const RUNNING: JobsIndicatorViewProps["running"] = { title: "Carlsen – Nepomniachtchi", progress: { done: 12, total: 80 } };
export const HEBREW_RUNNING: JobsIndicatorViewProps["running"] = { title: "גלפנד – סמירין", progress: { done: 4, total: 60 } };
export const LIVE_WORDS = "depth 22, 3.1M nodes";

export const JOBS_BEFORE: readonly AnnouncedJob[] = [
  { id: "a", title: "Carlsen – Nepomniachtchi", status: "running" },
  { id: "b", title: "Ding – Gukesh", status: "queued" },
];
export const JOBS_PROGRESSED: readonly AnnouncedJob[] = [...JOBS_BEFORE];
export const JOBS_AFTER: readonly AnnouncedJob[] = [
  { id: "a", title: "Carlsen – Nepomniachtchi", status: "done" },
  { id: "b", title: "Ding – Gukesh", status: "queued" },
];
