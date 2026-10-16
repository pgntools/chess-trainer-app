import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { ATTEMPTS, EVENTS, FAILED, UNDER_WAY, describeEvent, describeEventHebrew } from "./fixtures";
import JobHistory, { type JobHistoryProps } from "./JobHistory";

const mount = (props: Partial<JobHistoryProps> = {}) =>
  render(<JobHistory attempts={ATTEMPTS} events={EVENTS} describe={describeEvent} testId="history" {...props} />);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobHistory (CTA-217)", () => {
  it("is closed by default, and its heading's button opens and closes it from the keyboard", async () => {
    const user = userEvent.setup();
    mount();
    const toggle = screen.getByRole("button", { name: "History" });
    expect(screen.getByRole("heading", { level: 3, name: "History" })).toContainElement(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "Attempts" })).toBeNull();
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toContainElement(screen.getByRole("list", { name: "Attempts" }));
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "Attempts" })).toBeNull();
  });

  it("lists the attempts newest first — how each ended, when, and the error that ended it", async () => {
    mount({ defaultOpen: true });
    const attempts = within(screen.getByRole("list", { name: "Attempts" })).getAllByRole("listitem");
    expect(attempts.map((item) => item.querySelector("p")?.textContent)).toEqual([
      "Attempt 3 · Done",
      "Attempt 2 · Paused",
      "Attempt 1 · Retry scheduled",
    ]);
    expect(screen.getByTestId("history-attempt-1")).toHaveTextContent("engine-unreachable — The engine server did not answer.");
    expect(screen.getByTestId("history-attempt-1").querySelectorAll("time")).toHaveLength(2);
    await expectNoAxeViolations(screen.getByTestId("history"));
  });

  it("says an attempt under way, and one that failed with a code alone", () => {
    const { unmount } = mount({ attempts: UNDER_WAY, defaultOpen: true });
    expect(screen.getByTestId("history-attempt-3")).toHaveTextContent("Attempt 3 · Under way");
    expect(screen.getByTestId("history-attempt-3").querySelectorAll("time")).toHaveLength(1);
    unmount();
    mount({ attempts: FAILED, defaultOpen: true });
    expect(screen.getByTestId("history-attempt-1")).toHaveTextContent("Attempt 1 · Failed");
    expect(screen.getByTestId("history-attempt-1")).toHaveTextContent(/engine$/);
  });

  it("lists the events newest first, each when and what in the screen's words", () => {
    mount({ defaultOpen: true });
    const events = within(screen.getByRole("list", { name: "Events" })).getAllByRole("listitem");
    expect(events).toHaveLength(EVENTS.length);
    expect(events[0]).toHaveTextContent("Done — every output applied");
    expect(events[events.length - 1]).toHaveTextContent("Queued");
    expect(events[0].querySelector("time")).toHaveAttribute("dateTime", "2026-10-10T12:20:00.000Z");
  });

  it("keeps events written at the same time last first", () => {
    mount({ defaultOpen: true, events: [{ at: "2026-10-10T12:00:00.000Z", type: "enqueued" }, { at: "2026-10-10T12:00:00.000Z", type: "claimed" }] });
    expect(screen.getByTestId("history-event-0")).toHaveTextContent("Started");
    expect(screen.getByTestId("history-event-1")).toHaveTextContent("Queued");
  });

  it("says when nothing has happened yet, and takes the heading level it is given", () => {
    mount({ attempts: [], events: [], defaultOpen: true, headingLevel: 2 });
    expect(screen.getByRole("heading", { level: 2, name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Attempts" })).toBeInTheDocument();
    expect(screen.getByTestId("history-attempts")).toHaveTextContent("Not run yet.");
    expect(screen.getByTestId("history-events")).toHaveTextContent("Nothing recorded yet.");
  });

  it("takes the reader's words in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ defaultOpen: true, describe: describeEventHebrew });
    expect(screen.getByRole("button", { name: "היסטוריה" })).toBeInTheDocument();
    expect(screen.getByTestId("history-attempt-3")).toHaveTextContent("ניסיון 3 · הסתיים");
    expect(screen.getByTestId("history-event-0")).toHaveTextContent("הסתיימה");
  });
});
