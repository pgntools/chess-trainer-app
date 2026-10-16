import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EntityJobs from "./EntityJobs";
import { CASE_JOBS } from "./fixtures";

const mount = (jobs: Parameters<typeof EntityJobs>[0]["jobs"], onNewJob = () => {}) =>
  render(
    <EntityJobs
      jobs={jobs}
      jobLink={(job) => ({ href: `#${job.id}` })}
      onNewJob={onNewJob}
      label="This Case's jobs"
      emptyText="No jobs for this Case yet."
      testId="jobs"
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EntityJobs (CTA-221)", () => {
  it("lists the entity's jobs — each a link to its page, its kind, its status and its progress — and opens a new one", async () => {
    const onNewJob = vi.fn();
    mount(CASE_JOBS, onNewJob);
    const list = screen.getByRole("list", { name: "This Case's jobs" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const running = screen.getByTestId("jobs-job-running");
    expect(within(running).getByRole("link", { name: "Carlsen – Nepomniachtchi" })).toHaveAttribute("href", "#running");
    expect(within(running).getByTestId("jobs-job-running-kind")).toHaveTextContent("Computer analysis");
    expect(within(running).getByText("Running")).toBeInTheDocument();
    expect(within(running).getByRole("progressbar", { name: "Progress of Carlsen – Nepomniachtchi" })).toHaveAttribute("aria-valuenow", "15");
    expect(within(screen.getByTestId("jobs-job-done")).getByText("Done")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New job" }));
    expect(onNewJob).toHaveBeenCalled();
    await expectNoAxeViolations();
  });

  it("says when there is none, and while the queue is read", () => {
    const { unmount } = mount([]);
    expect(screen.getByTestId("jobs-empty")).toHaveTextContent("No jobs for this Case yet.");
    unmount();
    mount(undefined);
    expect(screen.getByTestId("jobs-loading")).toBeInTheDocument();
  });

  it("reads in Hebrew, a Hebrew title kept in its own direction", async () => {
    await i18n.changeLanguage("he");
    mount(CASE_JOBS);
    expect(screen.getByRole("button", { name: i18n.t("jobs.newJob.title") })).toBeInTheDocument();
    expect(within(screen.getByTestId("jobs-job-failed")).getByRole("link")).toHaveAttribute("dir", "auto");
    await expectNoAxeViolations();
  });
});
