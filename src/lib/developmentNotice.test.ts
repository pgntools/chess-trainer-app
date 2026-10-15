import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEVELOPMENT_NOTICE_DISMISSAL_MS,
  DEVELOPMENT_NOTICE_KEY,
  dismissDevelopmentNotice,
  isDevelopmentNoticeDismissed,
  resetDevelopmentNotice,
  subscribeToDevelopmentNotice,
} from "./developmentNotice";

const NOW = new Date("2026-10-15T12:00:00Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  // The setup's "already dismissed" is taken away: each test meets the notice afresh.
  localStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
  resetDevelopmentNotice();
});

afterEach(() => {
  localStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
  sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
  resetDevelopmentNotice();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the in-development notice's dismissal", () => {
  it("is 30 days, one constant", () => {
    expect(DEVELOPMENT_NOTICE_DISMISSAL_MS).toBe(30 * DAY_MS);
  });

  it("starts undismissed and keeps the time of the dismissal in localStorage, not sessionStorage", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    expect(isDevelopmentNoticeDismissed()).toBe(false);
    dismissDevelopmentNotice();
    expect(isDevelopmentNoticeDismissed()).toBe(true);
    expect(localStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBe(String(NOW));
    expect(sessionStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBeNull();
  });

  it("holds for 30 days, then lapses — and a new dismissal starts a new 30 days", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    dismissDevelopmentNotice();
    vi.setSystemTime(NOW + DEVELOPMENT_NOTICE_DISMISSAL_MS - 1);
    expect(isDevelopmentNoticeDismissed()).toBe(true);
    vi.setSystemTime(NOW + DEVELOPMENT_NOTICE_DISMISSAL_MS);
    expect(isDevelopmentNoticeDismissed()).toBe(false);

    dismissDevelopmentNotice();
    expect(localStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBe(String(NOW + DEVELOPMENT_NOTICE_DISMISSAL_MS));
    vi.setSystemTime(NOW + 2 * DEVELOPMENT_NOTICE_DISMISSAL_MS - 1);
    expect(isDevelopmentNoticeDismissed()).toBe(true);
  });

  it.each([
    ["an unreadable value", "soon"],
    ["a negative number", "-5"],
    ["a fraction", "1.5"],
    ["an empty value", ""],
    ["a future time", String(NOW + DAY_MS)],
    // What `sessionStorage` once held, read as a time: the first instant of 1970.
    ["the old session flag", "1"],
  ])("does not count %s as a dismissal", (_, value) => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    localStorage.setItem(DEVELOPMENT_NOTICE_KEY, value);
    expect(isDevelopmentNoticeDismissed()).toBe(false);
  });

  it("ignores the old sessionStorage flag", () => {
    sessionStorage.setItem(DEVELOPMENT_NOTICE_KEY, "1");
    expect(isDevelopmentNoticeDismissed()).toBe(false);
  });

  it("tells its subscribers, until they unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToDevelopmentNotice(listener);
    dismissDevelopmentNotice();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    dismissDevelopmentNotice();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("wakes its subscribers when another tab dismisses it, and on no other key", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToDevelopmentNotice(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: "chessapp.theme" }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: DEVELOPMENT_NOTICE_KEY, newValue: String(Date.now()) }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: DEVELOPMENT_NOTICE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("holds the dismissal in memory where localStorage refuses it, for the page's life", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    dismissDevelopmentNotice();
    expect(localStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBeNull();
    expect(isDevelopmentNoticeDismissed()).toBe(true);
    resetDevelopmentNotice();
    expect(isDevelopmentNoticeDismissed()).toBe(false);
  });
});
