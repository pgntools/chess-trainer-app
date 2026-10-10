import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { DONE, INTERRUPTED, JOBS, RUNNING } from "./fixtures";
import JobsTable, { type JobsTableProps } from "./JobsTable";

const mount = (props: Partial<JobsTableProps> = {}) => {
  const handlers = { onCancel: vi.fn(), onResume: vi.fn(), onDelete: vi.fn() };
  render(<JobsTable rows={JOBS} rowLink={(job) => ({ href: `/jobs?job=${job.id}` })} {...handlers} testId="jobs" {...props} />);
  return handlers;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobsTable (CTA-173)", () => {
  it("lists every job: its game, its status in words, its progress and its times", () => {
    mount();
    const table = within(screen.getByRole("table", { name: "Jobs" }));
    expect(table.getAllByRole("columnheader").map((head) => head.textContent).slice(0, 5)).toEqual([
      "Game",
      "Status",
      "Progress",
      "Started",
      "Finished",
    ]);
    expect(table.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByTestId("jobs-status-running")).toHaveTextContent("Running");
    expect(screen.getByTestId("jobs-status-interrupted")).toHaveTextContent("Interrupted");
    expect(screen.getAllByRole("progressbar", { name: `Progress of ${RUNNING.source.name}` })[0]).toHaveAttribute("aria-valuenow", "33");
    // The move being searched: the fourth position's, Black's second.
    expect(screen.getByTestId("jobs-progress-running")).toHaveTextContent("3 of 9 positions · 2... Nc6");
    expect(screen.getByTestId("jobs-progress-done")).toHaveTextContent("9 of 9 positions");
  });

  it("links each game to its details", () => {
    mount();
    expect(screen.getByRole("link", { name: "Show the job Ding – Gukesh" })).toHaveAttribute("href", "/jobs?job=queued");
  });

  it("offers Cancel on the unfinished jobs, Resume on the stopped ones, Delete on all — each named for its job", async () => {
    const user = userEvent.setup();
    const handlers = mount();
    const name = RUNNING.source.name;
    expect(screen.getAllByRole("button", { name: `Cancel ${name}` })).toHaveLength(2); // running, interrupted
    expect(screen.getAllByRole("button", { name: `Resume ${name}` })).toHaveLength(2); // interrupted, failed
    expect(screen.getAllByRole("button", { name: `Delete ${name}` })).toHaveLength(5);
    expect(screen.queryByTestId("jobs-cancel-done")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("jobs-cancel-running"));
    expect(handlers.onCancel).toHaveBeenCalledWith(RUNNING);
    await user.click(screen.getByTestId("jobs-resume-interrupted"));
    expect(handlers.onResume).toHaveBeenCalledWith(INTERRUPTED);
    await user.click(screen.getByTestId("jobs-delete-done"));
    expect(handlers.onDelete).toHaveBeenCalledWith(DONE);
  });

  it("says when there are no jobs, and while they are read", () => {
    const { rerender } = render(
      <JobsTable rows={[]} rowLink={() => ({ href: "/" })} onCancel={() => {}} onResume={() => {}} onDelete={() => {}} testId="jobs" />,
    );
    expect(screen.getByTestId("jobs-empty")).toHaveTextContent("No jobs yet");
    rerender(<JobsTable rows={[]} rowLink={() => ({ href: "/" })} onCancel={() => {}} onResume={() => {}} onDelete={() => {}} loading testId="jobs" />);
    expect(screen.getByTestId("jobs-loading")).toBeInTheDocument();
  });

  it("passes axe", async () => {
    mount({ selectedId: "done" });
    await expectNoAxeViolations();
  });
});
