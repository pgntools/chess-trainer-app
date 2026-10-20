import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSearchingTabs,
  SEARCHING_EXPIRY_MS,
  SEARCHING_HEARTBEAT_MS,
  type SearchingChannel,
  type SearchingTabs,
} from "./searchingTabs";

/*
  Which tabs' boards are searching (CTA-242): tabs over one in-memory
  channel — a message reaches every other tab, never its sender — each with
  its own page to hide.
*/

const network = () => {
  const ends: { listener?: (message: unknown) => void }[] = [];
  const sent: unknown[] = [];
  const tab = () => {
    let hide: (() => void) | undefined;
    const tabs: SearchingTabs = createSearchingTabs({
      openChannel: (): SearchingChannel => {
        const end: { listener?: (message: unknown) => void } = {};
        ends.push(end);
        return {
          postMessage: (message) => {
            sent.push(message);
            // Structured-cloned, as a channel's are.
            ends.filter((other) => other !== end).forEach((other) => other.listener?.(structuredClone(message)));
          },
          listen: (listener) => {
            end.listener = listener;
          },
        };
      },
      onPageHide: (handler) => {
        hide = handler;
      },
      now: () => Date.now(),
    });
    return { tabs, hide: () => hide?.() };
  };
  /** A word from a tab with no page here — one that crashed after it. */
  const word = (message: unknown) => ends.forEach((end) => end.listener?.(message));
  return { tab, sent, word };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("which tabs are searching (CTA-242)", () => {
  it("tells another tab this one searches, and that it stopped", () => {
    const { tab } = network();
    const here = tab();
    const there = tab();
    const heard = vi.fn();
    there.tabs.subscribe(heard);
    expect(there.tabs.othersSearching()).toBe(false);

    here.tabs.setSearching(true);
    expect(there.tabs.othersSearching()).toBe(true);
    // A tab is not told about itself.
    expect(here.tabs.othersSearching()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(1);

    here.tabs.setSearching(false);
    expect(there.tabs.othersSearching()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("is told by a tab already searching when it opens", () => {
    const { tab } = network();
    const here = tab();
    here.tabs.setSearching(true);
    const late = tab();
    // Its first subscriber opens the channel, which asks who searches.
    late.tabs.subscribe(() => {});
    expect(late.tabs.othersSearching()).toBe(true);
  });

  it("says it again while it searches, so the others keep it", () => {
    const { tab, sent } = network();
    const here = tab();
    const there = tab();
    there.tabs.subscribe(() => {});
    here.tabs.setSearching(true);
    const told = sent.length;
    vi.advanceTimersByTime(SEARCHING_EXPIRY_MS * 3);
    expect(sent.length).toBeGreaterThanOrEqual(told + Math.floor((SEARCHING_EXPIRY_MS * 3) / SEARCHING_HEARTBEAT_MS));
    expect(there.tabs.othersSearching()).toBe(true);
    // Stopped: no more heartbeats.
    here.tabs.setSearching(false);
    const stopped = sent.length;
    vi.advanceTimersByTime(SEARCHING_HEARTBEAT_MS * 3);
    expect(sent.length).toBe(stopped);
  });

  it("says it stopped when its page hides — a tab closed leaves no one breathing", () => {
    const { tab } = network();
    const here = tab();
    const there = tab();
    there.tabs.subscribe(() => {});
    here.tabs.setSearching(true);
    here.hide();
    expect(there.tabs.othersSearching()).toBe(false);
  });

  it("forgets a tab that went quiet without a word, once its word runs out", () => {
    const { tab, word } = network();
    const there = tab();
    const heard = vi.fn();
    there.tabs.subscribe(heard);
    // A tab that crashed: one word, then nothing.
    word({ tab: "crashed", searching: true });
    expect(there.tabs.othersSearching()).toBe(true);
    vi.advanceTimersByTime(SEARCHING_EXPIRY_MS - 1);
    expect(there.tabs.othersSearching()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(there.tabs.othersSearching()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("counts every searching tab until the last stops", () => {
    const { tab } = network();
    const one = tab();
    const two = tab();
    const watcher = tab();
    watcher.tabs.subscribe(() => {});
    one.tabs.setSearching(true);
    two.tabs.setSearching(true);
    one.tabs.setSearching(false);
    expect(watcher.tabs.othersSearching()).toBe(true);
    two.tabs.setSearching(false);
    expect(watcher.tabs.othersSearching()).toBe(false);
  });

  it("ignores what it cannot read, and keeps to the tab where there is no channel", () => {
    const { tab } = network();
    const there = tab();
    let listener: ((message: unknown) => void) | undefined;
    const odd = createSearchingTabs({
      openChannel: () => ({ postMessage: () => {}, listen: (l) => (listener = l) }),
      onPageHide: () => {},
    });
    odd.subscribe(() => {});
    listener?.("searching");
    listener?.({ tab: 1, searching: "yes" });
    expect(odd.othersSearching()).toBe(false);

    const alone = createSearchingTabs({ openChannel: () => undefined, onPageHide: () => {} });
    alone.setSearching(true);
    alone.setSearching(false);
    expect(alone.othersSearching()).toBe(false);
    expect(there.tabs.othersSearching()).toBe(false);
  });
});
