import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CANCELLED, DONE, FAILED, FAILED_UNKNOWN, INTERRUPTED, PAUSED, QUEUED, RETRYING, RUNNING } from "./fixtures";
import JobDetailsPanel, { type JobDetailsPanelProps } from "./JobDetailsPanel";

const handlers = () => ({ onPause: vi.fn(), onResume: vi.fn(), onCancel: vi.fn(), onDelete: vi.fn() });

const mount = (props: Partial<JobDetailsPanelProps> = {}) => {
  const on = handlers();
  const view = render(<JobDetailsPanel job={RUNNING} {...on} testId="job" {...props} />);
  return { ...on, ...view };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobDetailsPanel (CTA-217)", () => {
  it("heads the job with its title, kind and status, and shows its progress, subjects and times", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: RUNNING.title })).toBeInTheDocument();
    expect(screen.getByTestId("job-kind")).toHaveTextContent("Kind: Computer analysis");
    expect(screen.getByTestId("job-status")).toHaveTextContent("Running");
    expect(screen.getByRole("progressbar", { name: `Progress of ${RUNNING.title}` })).toHaveAttribute("aria-valuenow", "15");
    expect(screen.getByTestId("job-progress")).toHaveTextContent("12 of 80 · 7. Nf3");
    expect(screen.getByRole("heading", { level: 3, name: "Applied to" })).toBeInTheDocument();
    expect(within(screen.getByTestId("job-subjects")).getByRole("link", { name: RUNNING.title })).toHaveAttribute("href", "#case-1");
    expect(screen.getByTestId("job-times-created")).toHaveTextContent(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(screen.getByTestId("job-times-started")).toBeInTheDocument();
    expect(screen.queryByTestId("job-times-finished")).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("job"));
  });

  it("offers the actions the job allows, and reports each", async () => {
    const user = userEvent.setup();
    const running = mount();
    const actions = within(screen.getByRole("group", { name: "Job actions" }));
    expect(actions.getAllByRole("button").map((button) => button.textContent)).toEqual(["Pause", "Cancel", "Delete"]);
    await user.click(actions.getByRole("button", { name: "Pause" }));
    expect(running.onPause).toHaveBeenCalledTimes(1);
    await user.click(actions.getByRole("button", { name: "Cancel" }));
    expect(running.onCancel).toHaveBeenCalledTimes(1);
    running.unmount();

    const failed = mount({ job: FAILED });
    const failedActions = within(screen.getByRole("group", { name: "Job actions" }));
    expect(failedActions.getAllByRole("button").map((button) => button.textContent)).toEqual(["Resume", "Cancel", "Delete"]);
    failedActions.getByRole("button", { name: "Resume" }).focus();
    await user.keyboard("{Enter}");
    expect(failed.onResume).toHaveBeenCalledTimes(1);
    await user.click(failedActions.getByRole("button", { name: "Delete" }));
    expect(failed.onDelete).toHaveBeenCalledTimes(1);
    failed.unmount();

    mount({ job: DONE });
    expect(within(screen.getByRole("group", { name: "Job actions" })).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Delete",
    ]);
  });

  it("says what a job not running waits on — a scheduled retry above all", () => {
    const retry = mount({ job: RETRYING });
    expect(screen.getByTestId("job-waiting")).toHaveTextContent("Retrying in 40 s — attempt 2 of 3.");
    retry.unmount();
    const now = mount({ job: { ...RETRYING, retry: { inSeconds: 0, attempt: 3, maxAttempts: 3 } } });
    expect(screen.getByTestId("job-waiting")).toHaveTextContent("Retrying now — attempt 3 of 3.");
    now.unmount();
    const queued = mount({ job: QUEUED });
    expect(screen.getByTestId("job-waiting")).toHaveTextContent("Waiting for its turn.");
    expect(screen.getByTestId("job-progress")).toHaveTextContent("Not started");
    queued.unmount();
    const paused = mount({ job: PAUSED });
    expect(screen.getByTestId("job-waiting")).toHaveTextContent(/^Paused — Resume continues/);
    paused.unmount();
    const interrupted = mount({ job: INTERRUPTED });
    expect(screen.getByTestId("job-waiting")).toHaveTextContent(/tab running it closed/);
    interrupted.unmount();
    mount({ job: CANCELLED });
    expect(screen.queryByTestId("job-waiting")).toBeNull();
  });

  it("says why it failed — its message, its code under it", async () => {
    const failed = mount({ job: FAILED });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Why it failed");
    expect(alert).toHaveTextContent("The engine stopped answering.");
    expect(screen.getByTestId("job-error-detail")).toHaveTextContent("Code: engine");
    await expectNoAxeViolations(screen.getByTestId("job"));
    failed.unmount();
    mount({ job: FAILED_UNKNOWN });
    expect(screen.getByRole("alert")).toHaveTextContent("The job failed.");
    expect(screen.getByTestId("job-error-detail")).toHaveTextContent("Code: unknown");
  });

  it("says a deleted subject, unlinked", () => {
    mount({ job: DONE });
    expect(within(screen.getByTestId("job-subjects")).getAllByRole("link")).toHaveLength(1);
    expect(screen.getByTestId("job-subjects-1")).toHaveTextContent("Wijk 2025 (deleted)");
    expect(screen.getByTestId("job-times-finished")).toBeInTheDocument();
  });

  it("draws the kind's live view, details and parameters in their slots, each section headed", () => {
    mount({ live: <p>depth 22</p>, details: <p>the report</p>, parameters: <p>the options</p> });
    expect(screen.getByTestId("job-live")).toHaveTextContent("depth 22");
    expect(screen.getByRole("heading", { level: 3, name: "Details" })).toBeInTheDocument();
    expect(screen.getByTestId("job-details")).toHaveTextContent("the report");
    expect(screen.getByRole("heading", { level: 3, name: "Parameters" })).toBeInTheDocument();
    expect(screen.getByTestId("job-parameters")).toHaveTextContent("the options");
  });

  it("leaves out the slots it is not given", () => {
    mount();
    expect(screen.queryByTestId("job-live")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Details" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Parameters" })).toBeNull();
  });

  it("is the page's h1 when asked, its sections h2", () => {
    mount({ headingLevel: 1 });
    expect(screen.getByRole("heading", { level: 1, name: RUNNING.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Progress" })).toBeInTheDocument();
  });

  it("announces a change of status politely — not the first one, not the progress, not another job", () => {
    const on = handlers();
    const { rerender } = render(<JobDetailsPanel job={RUNNING} {...on} testId="job" />);
    const announcer = screen.getByRole("status");
    expect(announcer).toBeEmptyDOMElement();
    rerender(<JobDetailsPanel job={{ ...RUNNING, progress: { done: 13, total: 80 } }} {...on} testId="job" />);
    expect(announcer).toBeEmptyDOMElement();
    rerender(<JobDetailsPanel job={{ ...RUNNING, status: "done" }} {...on} testId="job" />);
    expect(announcer).toHaveTextContent(`${RUNNING.title}: Done.`);
    rerender(<JobDetailsPanel job={DONE} {...on} testId="job" />);
    expect(announcer).toBeEmptyDOMElement();
  });

  it("takes the reader's words in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ job: RETRYING });
    expect(screen.getByTestId("job-status")).toHaveTextContent("בתור");
    expect(screen.getByTestId("job-waiting")).toHaveTextContent("ניסיון 2 מתוך 3");
  });
});
