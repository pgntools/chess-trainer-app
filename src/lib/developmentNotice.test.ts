import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEVELOPMENT_NOTICE_KEY,
  dismissDevelopmentNotice,
  isDevelopmentNoticeDismissed,
  resetDevelopmentNotice,
  subscribeToDevelopmentNotice,
} from "./developmentNotice";

afterEach(() => {
  sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
  resetDevelopmentNotice();
  vi.restoreAllMocks();
});

describe("the in-development notice's dismissal", () => {
  it("starts undismissed and is kept in sessionStorage, not localStorage", () => {
    sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
    expect(isDevelopmentNoticeDismissed()).toBe(false);
    dismissDevelopmentNotice();
    expect(isDevelopmentNoticeDismissed()).toBe(true);
    expect(sessionStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBe("1");
    expect(localStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBeNull();
  });

  it("tells its subscribers, until they unsubscribe", () => {
    sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
    const listener = vi.fn();
    const unsubscribe = subscribeToDevelopmentNotice(listener);
    dismissDevelopmentNotice();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    dismissDevelopmentNotice();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("holds the dismissal in memory where sessionStorage refuses it", () => {
    sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    dismissDevelopmentNotice();
    expect(isDevelopmentNoticeDismissed()).toBe(true);
  });
});
