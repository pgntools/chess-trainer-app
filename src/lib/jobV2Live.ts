import type { Score } from "./engineAnalysis";

/**
 * **A running Jobs V2 job's live engine progress** (CTA-190) — what the
 * engine is saying about the position it is searching now, read off its own
 * `info` lines by the runner (`lib/jobV2Runner.ts`) and **never stored**: the
 * jobs store is still written once per position (its checkpoint), and this is
 * an in-memory channel beside it, a few updates a second.
 *
 * - **The runner's tab** publishes it ({@link createJobV2LiveFeed}, throttled)
 *   and clears it when the position ends or the job stops, pauses, fails or
 *   finishes.
 * - **Every other tab** hears it on {@link JOB_V2_LIVE_CHANNEL} — the runner
 *   lives in the one tab holding the Web Lock — and drops it when nothing has
 *   come for {@link JOB_V2_LIVE_STALE_MS} (the runner's tab closed); the feed
 *   re-sends the last snapshot every {@link JOB_V2_LIVE_HEARTBEAT_MS} so a
 *   long silent depth is not taken for that.
 *
 * Read with {@link jobV2LiveSnapshot} / {@link subscribeJobV2Live}
 * (`views/analysisV2/jobs/useJobV2Live.ts`). Nothing runs at import.
 */
export type JobV2Live = {
  jobId: string;
  /** The position being searched — its index in the job's `positions`. */
  index: number;
  /** The move judged from that position ("7. Nf3"), as the panel's progress caption names it — `undefined` at the game's last position. */
  move?: string;
  depth: number;
  seldepth?: number;
  nodes?: number;
  nps?: number;
  /** How full the engine's hash table is, in permille, where it says. */
  hashfull?: number;
  /** Milliseconds spent on this position — the engine's own `time`, else the runner's clock. */
  elapsedMs: number;
  /** The best line so far: its score (White's view) and its first moves in SAN. */
  score?: Score;
  line: readonly string[];
  /**
   * When the engine was last heard about this position (ms since the epoch) —
   * an `info` line, or an engine server's heartbeat through a long silence
   * (CTA-194), each published, so every tab sees it. The panel's pulse and
   * "heard 3 s ago" read it.
   */
  heardAt: number;
};

/** The `BroadcastChannel` the snapshot crosses tabs on. */
export const JOB_V2_LIVE_CHANNEL = "chessapp.analysisProjects.jobs.live";
/** At most one snapshot per this many milliseconds. */
export const JOB_V2_LIVE_INTERVAL_MS = 250;
/** The runner's tab re-sends the last snapshot this often while a position is searched. */
export const JOB_V2_LIVE_HEARTBEAT_MS = 1_000;
/** Another tab drops a snapshot it has heard nothing after for this long. */
export const JOB_V2_LIVE_STALE_MS = 4_000;

type LiveMessage = { live: JobV2Live | null };

let snapshot: JobV2Live | undefined;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let staleTimer: ReturnType<typeof setTimeout> | undefined;

const set = (next: JobV2Live | undefined) => {
  if (next === snapshot) return;
  snapshot = next;
  for (const listener of listeners) listener();
};

const onChannelMessage = (event: MessageEvent<LiveMessage>) => {
  const live = event.data?.live ?? undefined;
  clearTimeout(staleTimer);
  staleTimer = undefined;
  set(live);
  if (live !== undefined) staleTimer = setTimeout(() => set(undefined), JOB_V2_LIVE_STALE_MS);
};

/** The channel, opened on first use — never at import (the pre-render imports this). */
const openChannel = (): BroadcastChannel | undefined => {
  if (channel === undefined && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(JOB_V2_LIVE_CHANNEL);
    channel.onmessage = onChannelMessage;
    // Node's channel would hold a test run open; a browser's has no `unref`.
    (channel as unknown as { unref?: () => void }).unref?.();
  }
  return channel;
};

/** The running job's live progress — `undefined` while no position is being searched (or none heard of lately). */
export const jobV2LiveSnapshot = (): JobV2Live | undefined => snapshot;

/** Subscribe to changes; the first subscriber starts listening to other tabs. */
export const subscribeJobV2Live = (listener: () => void): (() => void) => {
  listeners.add(listener);
  openChannel();
  return () => {
    listeners.delete(listener);
  };
};

/** Tell this tab and every other one — `undefined` clears it. */
const publishJobV2Live = (next: JobV2Live | undefined, { local = true }: { local?: boolean } = {}) => {
  if (local) {
    clearTimeout(staleTimer);
    staleTimer = undefined;
    set(next);
  }
  openChannel()?.postMessage({ live: next ?? null } satisfies LiveMessage);
};

export type JobV2LiveFeed = {
  /** The latest snapshot — published at once, or at the end of the current interval. */
  update: (next: JobV2Live) => void;
  /** Nothing is being searched: cancel what is pending and clear it everywhere. */
  clear: () => void;
};

export type JobV2LiveFeedDeps = {
  intervalMs?: number;
  heartbeatMs?: number;
  /** Where a snapshot goes — this tab and the channel by default. */
  publish?: (next: JobV2Live | undefined, options?: { local?: boolean }) => void;
  clock?: () => number;
};

/**
 * **The runner's side: a throttled feed.** Each `info` line is an
 * {@link JobV2LiveFeed.update}; at most one snapshot goes out per
 * `intervalMs` (the last one of an interval always does), and while one is
 * live the channel hears it again every `heartbeatMs`.
 */
export const createJobV2LiveFeed = ({
  intervalMs = JOB_V2_LIVE_INTERVAL_MS,
  heartbeatMs = JOB_V2_LIVE_HEARTBEAT_MS,
  publish = publishJobV2Live,
  clock = () => Date.now(),
}: JobV2LiveFeedDeps = {}): JobV2LiveFeed => {
  let latest: JobV2Live | undefined;
  let sentAt = Number.NEGATIVE_INFINITY;
  let pending: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const send = () => {
    pending = undefined;
    if (latest === undefined) return;
    sentAt = clock();
    publish(latest);
    if (heartbeat === undefined) {
      heartbeat = setInterval(() => {
        if (latest !== undefined) publish(latest, { local: false });
      }, heartbeatMs);
    }
  };

  return {
    update: (next) => {
      latest = next;
      if (pending !== undefined) return;
      const wait = sentAt + intervalMs - clock();
      if (wait <= 0) send();
      else pending = setTimeout(send, wait);
    },
    clear: () => {
      clearTimeout(pending);
      pending = undefined;
      clearInterval(heartbeat);
      heartbeat = undefined;
      const had = latest !== undefined || sentAt !== Number.NEGATIVE_INFINITY;
      latest = undefined;
      sentAt = Number.NEGATIVE_INFINITY;
      if (had) publish(undefined);
    },
  };
};
