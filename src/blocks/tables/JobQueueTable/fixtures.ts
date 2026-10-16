import type { JobRowView, JobViewStatus } from "./jobView";

/*
  The Jobs queue's rows (CTA-217), typed with the block's own view models —
  a job of every status, of each of the three kinds, a deleted subject and a
  Hebrew title. Imported only by the block's gallery and its test.
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

/** A job of `status`, its controls as the runtime's state machine allows them. */
export const jobRow = (id: string, status: JobViewStatus, patch: Partial<JobRowView> = {}): JobRowView => ({
  id,
  title: "Carlsen – Nepomniachtchi",
  kindLabel: "Computer analysis",
  status,
  progress: { done: status === "done" ? 80 : 12, total: 80, label: status === "done" ? undefined : "7. Nf3" },
  subjects: [{ label: "Carlsen – Nepomniachtchi", link: { href: "#case-1" } }],
  createdAt: "2026-10-10T12:00:00.000Z",
  ...CONTROLS[status],
  ...patch,
});

export const RUNNING = jobRow("running", "running");
export const QUEUED = jobRow("queued", "queued", { title: "Ding – Gukesh", progress: { done: 0, total: 0 } });
export const RETRYING = jobRow("retrying", "queued", { title: "Caruana – Nakamura" });
export const PAUSED = jobRow("paused", "paused", {
  title: "My Caro-Kann — evaluation",
  kindLabel: "Repertoire evaluation",
  subjects: [{ label: "My Caro-Kann", link: { href: "#repertoire-1" } }],
  progress: { done: 140, total: 412, label: "1. e4 c6 2. d4" },
});
export const INTERRUPTED = jobRow("interrupted", "interrupted", { title: "Firouzja – So" });
export const FAILED = jobRow("failed", "failed", { title: "Anand – Kramnik" });
export const CANCELLED = jobRow("cancelled", "cancelled", { title: "Topalov – Svidler", progress: { done: 3, total: 80 } });
export const DONE = jobRow("done", "done", {
  title: "Merge: Tata Steel 2026 + Wijk 2025",
  kindLabel: "Collection merge",
  subjects: [
    { label: "Tata Steel 2026", link: { href: "#collection-1" } },
    { label: "Wijk 2025", deleted: true },
  ],
  progress: { done: 1680, total: 1680 },
});
/** A job whose kind is no longer registered — it can only be deleted. */
export const UNKNOWN_KIND = jobRow("unknown", "interrupted", {
  title: "An old job",
  kindLabel: "Unknown kind (old.kind)",
  subjects: [],
  canResume: false,
  canCancel: false,
});

/** One of each status, newest first. */
export const JOBS: readonly JobRowView[] = [RUNNING, QUEUED, RETRYING, PAUSED, INTERRUPTED, FAILED, CANCELLED, DONE, UNKNOWN_KIND];

/** A Hebrew title and subject, and a long one. */
export const HEBREW: readonly JobRowView[] = [
  jobRow("hebrew", "running", {
    title: "גלפנד – סמירין",
    subjects: [{ label: "גלפנד – סמירין", link: { href: "#case-he" } }],
  }),
  jobRow("long", "queued", {
    title: "A very long title for a merge of many collections whose names go on and on — Candidates 2024, Candidates 2022",
    subjects: [
      { label: "Candidates 2024", link: { href: "#c-2024" } },
      { label: "Candidates 2022", link: { href: "#c-2022" } },
      { label: "Candidates 2020–21", link: { href: "#c-2020" } },
    ],
  }),
];

/** Sixty jobs, for paging. */
export const MANY: readonly JobRowView[] = Array.from({ length: 60 }, (_, index) =>
  jobRow(`many-${index}`, index % 3 === 0 ? "done" : "queued", { title: `Job ${index + 1}` }),
);
