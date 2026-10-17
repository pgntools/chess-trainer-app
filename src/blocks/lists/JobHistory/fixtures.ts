import type { JobAttemptView, JobEventView } from "./JobHistory";

/*
  A job's attempts and events (CTA-217) — a failure, a scheduled retry and
  a success, written oldest first as the runtime keeps them. Imported only by
  the block's gallery and its test.
*/

export const ATTEMPTS: readonly JobAttemptView[] = [
  {
    n: 1,
    startedAt: "2026-10-10T12:01:00.000Z",
    endedAt: "2026-10-10T12:03:00.000Z",
    outcome: "retry-scheduled",
    error: { code: "engine-unreachable", message: "The engine server did not answer." },
  },
  { n: 2, startedAt: "2026-10-10T12:03:40.000Z", endedAt: "2026-10-10T12:05:00.000Z", outcome: "paused" },
  { n: 3, startedAt: "2026-10-10T12:10:00.000Z", endedAt: "2026-10-10T12:20:00.000Z", outcome: "done" },
];

/** A job's attempts while its third is under way. */
export const UNDER_WAY: readonly JobAttemptView[] = [...ATTEMPTS.slice(0, 2), { n: 3, startedAt: "2026-10-10T12:10:00.000Z" }];

/** A failure, its attempts spent. */
export const FAILED: readonly JobAttemptView[] = [
  { n: 1, startedAt: "2026-10-10T12:01:00.000Z", endedAt: "2026-10-10T12:02:00.000Z", outcome: "failed", error: { code: "engine" } },
];

export const EVENTS: readonly JobEventView[] = [
  { at: "2026-10-10T12:00:00.000Z", type: "enqueued" },
  { at: "2026-10-10T12:01:00.000Z", type: "claimed", data: { attempt: 1 } },
  { at: "2026-10-10T12:03:00.000Z", type: "retry-scheduled", data: { inMs: 40_000 } },
  { at: "2026-10-10T12:03:40.000Z", type: "claimed", data: { attempt: 2 } },
  { at: "2026-10-10T12:05:00.000Z", type: "paused" },
  { at: "2026-10-10T12:10:00.000Z", type: "resumed" },
  { at: "2026-10-10T12:20:00.000Z", type: "done" },
];

/** The fixtures' events in words, as a screen would word them. */
export const describeEvent = (event: JobEventView): string => {
  const words: Record<string, string> = {
    enqueued: "Queued",
    claimed: "Started",
    "retry-scheduled": "A retry scheduled in 40 s",
    paused: "Paused by the reader",
    resumed: "Resumed",
    done: "Done — every output applied",
  };
  return words[event.type] ?? event.type;
};

/** The same, in Hebrew. */
export const describeEventHebrew = (event: JobEventView): string => {
  const words: Record<string, string> = {
    enqueued: "נכנסה לתור",
    claimed: "התחילה",
    "retry-scheduled": "ניסיון חוזר נקבע בעוד 40 ש׳",
    paused: "הושהתה",
    resumed: "חודשה",
    done: "הסתיימה",
  };
  return words[event.type] ?? event.type;
};
