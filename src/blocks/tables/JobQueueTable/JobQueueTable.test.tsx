import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CANCELLED, DONE, FAILED, JOBS, MANY, PAUSED, QUEUED, RUNNING, UNKNOWN_KIND } from "./fixtures";
import JobQueueTable, { type JobQueueTableProps } from "./JobQueueTable";

const mount = (props: Partial<JobQueueTableProps> = {}) => {
  const handlers = { onPause: vi.fn(), onResume: vi.fn(), onCancel: vi.fn(), onDelete: vi.fn() };
  render(<JobQueueTable rows={JOBS} rowLink={(job) => ({ href: `/jobs/${job.id}` })} {...handlers} testId="queue" {...props} />);
  return handlers;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobQueueTable (CTA-217)", () => {
  it("lists every job: its title, kind, subjects, status in words, progress and when it was created", async () => {
    mount();
    const table = within(screen.getByRole("table", { name: "Jobs" }));
    expect(table.getAllByRole("columnheader").map((head) => head.textContent).slice(0, 6)).toEqual([
      "Title",
      "Kind",
      "Applied to",
      "Status",
      "Progress",
      "Created",
    ]);
    expect(table.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByTestId("queue-kind-paused")).toHaveTextContent("Repertoire evaluation");
    expect(screen.getByTestId("queue-status-running")).toHaveTextContent("Running");
    expect(screen.getByTestId("queue-status-cancelled")).toHaveTextContent("Cancelled");
    expect(screen.getByRole("progressbar", { name: `Progress of ${RUNNING.title}` })).toHaveAttribute("aria-valuenow", "15");
    expect(screen.getByTestId("queue-progress-running")).toHaveTextContent("12 of 80 · 7. Nf3");
    expect(screen.getByTestId("queue-progress-queued")).toHaveTextContent("Not started");
    expect(screen.getByRole("progressbar", { name: `Progress of ${DONE.title}` })).toHaveAttribute("aria-valuenow", "100");
    await expectNoAxeViolations(screen.getByTestId("queue"));
  });

  it("links each title to its job, each subject to its entity, and says a deleted subject", () => {
    mount();
    expect(screen.getByRole("link", { name: `Open the job ${QUEUED.title}` })).toHaveAttribute("href", "/jobs/queued");
    expect(within(screen.getByTestId("queue-subjects-done")).getByRole("link", { name: "Tata Steel 2026" })).toHaveAttribute(
      "href",
      "#collection-1",
    );
    expect(within(screen.getByTestId("queue-subjects-done")).queryByRole("link", { name: /Wijk/ })).toBeNull();
    expect(screen.getByTestId("queue-subjects-done-1")).toHaveTextContent("Wijk 2025 (deleted)");
  });

  it("offers each action only where the job allows it, named for the job, and reports it", async () => {
    const user = userEvent.setup();
    const handlers = mount();
    expect(screen.getByRole("button", { name: `Pause ${RUNNING.title}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Resume ${RUNNING.title}` })).toBeNull();
    expect(screen.getByRole("button", { name: `Resume ${FAILED.title}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Cancel ${CANCELLED.title}` })).toBeNull();
    // A kind no longer registered can only be deleted.
    expect(screen.queryByRole("button", { name: `Resume ${UNKNOWN_KIND.title}` })).toBeNull();
    expect(screen.getByRole("button", { name: `Delete ${UNKNOWN_KIND.title}` })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Pause ${RUNNING.title}` }));
    expect(handlers.onPause).toHaveBeenCalledWith(RUNNING);
    await user.click(screen.getByRole("button", { name: `Resume ${PAUSED.title}` }));
    expect(handlers.onResume).toHaveBeenCalledWith(PAUSED);
    screen.getByRole("button", { name: `Cancel ${QUEUED.title}` }).focus();
    await user.keyboard("{Enter}");
    expect(handlers.onCancel).toHaveBeenCalledWith(QUEUED);
    await user.click(screen.getByRole("button", { name: `Delete ${DONE.title}` }));
    expect(handlers.onDelete).toHaveBeenCalledWith(DONE);
  });

  it("picks rows, and its bar deletes the picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onDeletePicked = vi.fn();
    mount({ picks: { picked: new Set(["failed", "done"]), onChange, onDeletePicked } });
    expect(screen.getByRole("table", { name: "Jobs" })).toHaveAccessibleDescription(/Tick a job to pick it/);
    await user.click(screen.getByRole("checkbox", { name: `Pick ${RUNNING.title}` }));
    expect(onChange).toHaveBeenLastCalledWith(new Set(["failed", "done", "running"]));
    await user.click(screen.getByRole("button", { name: "Delete 2 picked jobs" }));
    expect(onDeletePicked).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("queue-selection")).toHaveTextContent("2 picked");
    await expectNoAxeViolations(screen.getByTestId("queue"));
  });

  it("takes picks only with their Delete picked", () => {
    // @ts-expect-error — picks come with the action their bar offers.
    const picks: JobQueueTableProps["picks"] = { picked: new Set<string>(), onChange: () => {} };
    expect(picks).toBeDefined();
  });

  it("shows no bar while nothing is picked", () => {
    mount({ picks: { picked: new Set(), onChange: vi.fn(), onDeletePicked: vi.fn() } });
    expect(screen.queryByTestId("queue-selection")).toBeNull();
  });

  it("pages its rows", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    mount({ rows: MANY, paging: { page: 0, rowsPerPage: 25, onPageChange, onRowsPerPageChange: vi.fn() } });
    expect(screen.getAllByRole("link", { name: /^Open the job/ })).toHaveLength(25);
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("says when there are no jobs, when a filter leaves none (with its clear), and while it reads", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <JobQueueTable rows={[]} rowLink={() => ({ href: "#" })} onPause={vi.fn()} onResume={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} testId="queue" />,
    );
    expect(screen.getByTestId("queue-empty")).toHaveTextContent("No jobs yet");
    unmount();

    const onClearFilters = vi.fn();
    mount({ rows: [], filtered: true, onClearFilters });
    expect(screen.getByTestId("queue-no-match")).toHaveTextContent("No job matches the filters.");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("is busy while the queue is read", () => {
    mount({ rows: [], loading: true });
    expect(screen.getByTestId("queue-loading")).toHaveTextContent("Reading your jobs…");
  });

  it("takes the reader's words in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("table", { name: "משימות" })).toBeInTheDocument();
    expect(screen.getByTestId("queue-subjects-done-1")).toHaveTextContent("(נמחק)");
  });
});
