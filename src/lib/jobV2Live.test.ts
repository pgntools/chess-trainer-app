import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createJobV2LiveFeed,
  JOB_V2_LIVE_CHANNEL,
  JOB_V2_LIVE_STALE_MS,
  jobV2LiveSnapshot,
  subscribeJobV2Live,
  type JobV2Live,
} from "./jobV2Live";

/* A running Jobs V2 job's live progress (CTA-190): the runner's throttled feed, and every other tab's view of it. */

const liveAt = (depth: number): JobV2Live => ({ jobId: "job", index: 3, move: "2. Nf3", depth, elapsedMs: depth * 100, line: [], heardAt: depth });

let otherTab: BroadcastChannel | undefined;

afterEach(() => {
  vi.useRealTimers();
  otherTab?.close();
  otherTab = undefined;
});

describe("the runner's live feed", () => {
  it("publishes the first update at once, then at most one per interval — the interval's last", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const feed = createJobV2LiveFeed({ intervalMs: 250, publish });
    feed.update(liveAt(1));
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenLastCalledWith(liveAt(1));

    for (let depth = 2; depth <= 20; depth += 1) feed.update(liveAt(depth));
    expect(publish).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(250);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenLastCalledWith(liveAt(20));
    feed.clear();
  });

  it("tells the other tabs again while a position is searched, and clears everywhere when it ends", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const feed = createJobV2LiveFeed({ intervalMs: 250, heartbeatMs: 1_000, publish });
    feed.update(liveAt(5));
    vi.advanceTimersByTime(1_000);
    expect(publish).toHaveBeenLastCalledWith(liveAt(5), { local: false });

    feed.clear();
    expect(publish).toHaveBeenLastCalledWith(undefined);
    const calls = publish.mock.calls.length;
    vi.advanceTimersByTime(5_000);
    expect(publish).toHaveBeenCalledTimes(calls);
  });

  it("publishes nothing on a clear when nothing was published", () => {
    const publish = vi.fn();
    createJobV2LiveFeed({ publish }).clear();
    expect(publish).not.toHaveBeenCalled();
  });

  it("is this tab's snapshot by default, its subscribers told", () => {
    const listener = vi.fn();
    const off = subscribeJobV2Live(listener);
    const feed = createJobV2LiveFeed();
    feed.update(liveAt(7));
    expect(jobV2LiveSnapshot()).toEqual(liveAt(7));
    expect(listener).toHaveBeenCalled();
    feed.clear();
    expect(jobV2LiveSnapshot()).toBeUndefined();
    off();
  });
});

describe("every other tab", () => {
  it("hears the runner's tab, and drops a snapshot nothing has followed for a while (the runner's tab closed)", async () => {
    const off = subscribeJobV2Live(() => undefined);
    otherTab = new BroadcastChannel(JOB_V2_LIVE_CHANNEL);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // Heard through a subscriber, not `vi.waitFor` — which would advance the faked clock as it polls.
    const heard = new Promise<void>((resolve) => {
      const once = subscribeJobV2Live(() => {
        once();
        resolve();
      });
    });
    otherTab.postMessage({ live: liveAt(12) });
    await heard;
    expect(jobV2LiveSnapshot()).toEqual(liveAt(12));
    vi.advanceTimersByTime(JOB_V2_LIVE_STALE_MS - 1);
    expect(jobV2LiveSnapshot()).toEqual(liveAt(12));
    vi.advanceTimersByTime(1);
    expect(jobV2LiveSnapshot()).toBeUndefined();
    off();
  });

  it("clears it when the runner's tab says the search ended", async () => {
    const off = subscribeJobV2Live(() => undefined);
    otherTab = new BroadcastChannel(JOB_V2_LIVE_CHANNEL);
    otherTab.postMessage({ live: liveAt(3) });
    await vi.waitFor(() => expect(jobV2LiveSnapshot()).toEqual(liveAt(3)));
    otherTab.postMessage({ live: null });
    await vi.waitFor(() => expect(jobV2LiveSnapshot()).toBeUndefined());
    off();
  });

  it("is told what this tab's runner publishes", async () => {
    subscribeJobV2Live(() => undefined)();
    otherTab = new BroadcastChannel(JOB_V2_LIVE_CHANNEL);
    const heard = vi.fn();
    otherTab.onmessage = (event: MessageEvent) => heard(event.data);
    const feed = createJobV2LiveFeed();
    feed.update(liveAt(9));
    await vi.waitFor(() => expect(heard).toHaveBeenCalledWith({ live: liveAt(9) }));
    feed.clear();
    await vi.waitFor(() => expect(heard).toHaveBeenLastCalledWith({ live: null }));
  });
});
