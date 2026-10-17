import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";

import i18n from "../../i18n";
import { DEVELOPMENT_NOTICE_DISMISSAL_MS, DEVELOPMENT_NOTICE_KEY, resetDevelopmentNotice } from "../../lib/developmentNotice";
import { expectNoAxeViolations } from "../../test/axe";
import { stubReducedMotion } from "../../test/reducedMotion";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { DevelopmentNotice } from "./DevelopmentNotice";

const TITLE = "chessapp.dev is still in development";

const mount = () =>
  render(
    <AppThemeWithLang>
      <DevelopmentNotice />
    </AppThemeWithLang>,
  );

const DAY_MS = 24 * 60 * 60 * 1000;

/** A new session — another tab, or the browser restarted: what was kept in memory is gone, `localStorage` is not. */
const newSession = () => {
  sessionStorage.clear();
  resetDevelopmentNotice();
};

beforeEach(async () => {
  // A first visit: the setup's "already dismissed" is taken away.
  localStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
  resetDevelopmentNotice();
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DevelopmentNotice", () => {
  it("is shown the first time, as a named modal dialog", () => {
    mount();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("is closed by Dismiss, and the time of the dismissal is kept in localStorage", async () => {
    const user = userEvent.setup();
    mount();
    const before = Date.now();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const stored = Number(localStorage.getItem(DEVELOPMENT_NOTICE_KEY));
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(Date.now());
  });

  it("stays closed after the page is mounted again in the same session", async () => {
    const user = userEvent.setup();
    const first = mount();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    first.unmount();
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays closed through a change of language", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await i18n.changeLanguage("he");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is still closed in a new session within 30 days", async () => {
    const now = Date.now();
    vi.useFakeTimers({ toFake: ["Date"], now });
    const user = userEvent.setup();
    const first = mount();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    first.unmount();
    newSession();
    vi.setSystemTime(now + 29 * DAY_MS);
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is shown again after 30 days", () => {
    const now = Date.now();
    vi.useFakeTimers({ toFake: ["Date"], now });
    localStorage.setItem(DEVELOPMENT_NOTICE_KEY, String(now - DEVELOPMENT_NOTICE_DISMISSAL_MS));
    mount();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("is shown once more to a reader who dismissed it under the old session flag", () => {
    sessionStorage.setItem(DEVELOPMENT_NOTICE_KEY, "1");
    mount();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("closes when another tab dismisses it", async () => {
    mount();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
    act(() => {
      const value = String(Date.now());
      localStorage.setItem(DEVELOPMENT_NOTICE_KEY, value);
      window.dispatchEvent(new StorageEvent("storage", { key: DEVELOPMENT_NOTICE_KEY, newValue: value }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("reads in Hebrew, under the reader's language", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("dialog", { name: "chessapp.dev עדיין בפיתוח" })).toBeInTheDocument();
  });

  it("opens under reduced motion too, and has no accessibility violations", async () => {
    stubReducedMotion();
    mount();
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("draws nothing in the server's render — the pre-rendered pages carry no dialog", () => {
    const html = renderToString(
      <AppThemeWithLang>
        <DevelopmentNotice />
      </AppThemeWithLang>,
    );
    expect(html).not.toContain("development-notice");
    expect(html).not.toContain("role=\"dialog\"");
  });
});
