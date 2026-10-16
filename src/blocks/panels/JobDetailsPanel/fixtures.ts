import type { JobRowView, JobViewStatus } from "../../tables";
import type { JobDetailsView } from "./JobDetailsPanel";

/*
  One job's details in every status (CTA-217), typed with the blocks' own
  view models — a scheduled retry, a failure with its code, a deleted
  subject, a Hebrew title. Imported only by the block's gallery and its test.
*/

const CONTROLS: Record<JobViewStatus, Pick<JobRowView, "canPause" | "canResume" | "canCancel">> = {
  queued: { canPause: true, canResume: false, canCancel: true },
  running: { canPause: true, canResume: false, canCancel: true },
  paused: { canPause: false, canResume: true, canCancel: true },
  interrupted: { canPause: false, canResume: true, canCancel: true },
  failed: { canPause: false, canResume: true, canCancel: true },
  cancelled: { canPause: false, canResume: false, canCancel: false },
  done: { canPause: false, canResume: false, canCancel: false },
};

export const jobDetails = (status: JobViewStatus, patch: Partial<JobDetailsView> = {}): JobDetailsView => ({
  id: `job-${status}`,
  title: "Carlsen – Nepomniachtchi",
  kindLabel: "Computer analysis",
  status,
  progress: { done: status === "done" ? 80 : 12, total: 80, label: status === "done" ? undefined : "7. Nf3" },
  subjects: [{ label: "Carlsen – Nepomniachtchi", link: { href: "#case-1" } }],
  createdAt: "2026-10-10T12:00:00.000Z",
  startedAt: status === "queued" ? undefined : "2026-10-10T12:01:00.000Z",
  finishedAt: status === "done" || status === "failed" || status === "cancelled" ? "2026-10-10T12:20:00.000Z" : undefined,
  ...CONTROLS[status],
  ...patch,
});

export const RUNNING = jobDetails("running");
export const QUEUED = jobDetails("queued", { progress: { done: 0, total: 0 } });
/** A scheduled retry: the engine server did not answer. */
export const RETRYING = jobDetails("queued", {
  retry: { inSeconds: 40, attempt: 2, maxAttempts: 3 },
  error: { code: "engine-unreachable", message: "The engine server did not answer." },
});
export const PAUSED = jobDetails("paused");
export const INTERRUPTED = jobDetails("interrupted");
export const FAILED = jobDetails("failed", { error: { code: "engine", message: "The engine stopped answering." } });
/** A failure with no words of its kind's — the code alone. */
export const FAILED_UNKNOWN = jobDetails("failed", { error: { code: "unknown" } });
export const CANCELLED = jobDetails("cancelled", { progress: { done: 3, total: 80 } });
export const DONE = jobDetails("done", {
  title: "Merge: Tata Steel 2026 + Wijk 2025",
  kindLabel: "Collection merge",
  subjects: [
    { label: "Tata Steel 2026", link: { href: "#collection-1" } },
    { label: "Wijk 2025", deleted: true },
  ],
  progress: { done: 1680, total: 1680 },
});

/** Every status, for the gallery. */
export const EVERY_STATUS: readonly { name: string; job: JobDetailsView }[] = [
  { name: "Running, with the kind's live view", job: RUNNING },
  { name: "Queued — waiting for its turn", job: QUEUED },
  { name: "A scheduled retry — attempt 2 of 3 in 40 s", job: RETRYING },
  { name: "Paused", job: PAUSED },
  { name: "Interrupted — its tab closed", job: INTERRUPTED },
  { name: "Failed — its message and code", job: FAILED },
  { name: "Failed — a code alone", job: FAILED_UNKNOWN },
  { name: "Cancelled", job: CANCELLED },
  { name: "Done — a deleted subject", job: DONE },
];

export const HEBREW = jobDetails("running", {
  title: "גלפנד – סמירין",
  kindLabel: "ניתוח ממוחשב",
  subjects: [{ label: "גלפנד – סמירין", link: { href: "#case-he" } }],
});
