import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";

import i18n from "../../i18n";
import { DEVELOPMENT_NOTICE_KEY, resetDevelopmentNotice } from "../../lib/developmentNotice";
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

beforeEach(async () => {
  // A new session: the setup's "already dismissed" is taken away.
  sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
  resetDevelopmentNotice();
  await i18n.changeLanguage("en");
});

describe("DevelopmentNotice", () => {
  it("is shown the first time, as a named modal dialog", () => {
    mount();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("is closed by Dismiss, and the dismissal is kept for the session", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sessionStorage.getItem(DEVELOPMENT_NOTICE_KEY)).toBe("1");
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

  it("is shown again in a new session", () => {
    sessionStorage.setItem(DEVELOPMENT_NOTICE_KEY, "1");
    const first = mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    sessionStorage.removeItem(DEVELOPMENT_NOTICE_KEY);
    resetDevelopmentNotice();
    mount();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
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
