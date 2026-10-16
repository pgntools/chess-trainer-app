import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { NO_JOB_QUEUE_FILTERS } from "./filterValues";
import { CANCELLED, DONE, FAILED, JOBS, KINDS, MANY, PAUSED, QUEUED, RUNNING, UNKNOWN_KIND } from "./fixtures";
import { JOB_QUEUE_DEFAULT_SORT } from "./jobQueueSort";
import JobQueueTable, { type JobQueueTableProps } from "./JobQueueTable";

const mount = (props: Partial<JobQueueTableProps> = {}) => {
  const handlers = { onPause: vi.fn(), onResume: vi.fn(), onCancel: vi.fn(), onDelete: vi.fn(), onSort: vi.fn() };
  const { unmount } = render(
    <JobQueueTable rows={JOBS} rowLink={(job) => ({ href: `/jobs/${job.id}` })} sort={JOB_QUEUE_DEFAULT_SORT} {...handlers} testId="queue" {...props} />,
  );
  return { ...handlers, unmount };
};

/** The rows' titles, top to bottom. */
const titles = () => screen.getAllByRole("link", { name: /^Open the job/ }).map((link) => link.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobQueueTable (CTA-217)", () => {
  it("lists every job: its title, kind, status in words, progress and when it was created — what it is applied to is its page's (CTA-221)", async () => {
    mount();
    const table = within(screen.getByRole("table", { name: "Jobs" }));
    expect(table.getAllByRole("columnheader").map((head) => head.textContent).slice(0, 5)).toEqual([
      "Title",
      "Kind",
      "Status",
      "Progress",
      "Created",
    ]);
    expect(screen.queryByText("Applied to")).toBeNull();
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

  it("links each title to its job, and draws no subject", () => {
    mount();
    expect(screen.getByRole("link", { name: `Open the job ${QUEUED.title}` })).toHaveAttribute("href", "/jobs/queued");
    expect(screen.queryByTestId("queue-subjects-done")).toBeNull();
  });

  it("sorts by every column from its header, newest first to start (CTA-221)", async () => {
    const user = userEvent.setup();
    const { onSort } = mount();
    expect(screen.getByRole("columnheader", { name: /Created/ })).toHaveAttribute("aria-sort", "descending");
    for (const [header, column, direction] of [
      ["Title", "title", "asc"],
      ["Kind", "kind", "asc"],
      ["Status", "status", "asc"],
      ["Progress", "progress", "desc"],
    ] as const) {
      await user.click(screen.getByTestId(`queue-sort-${column}`));
      expect(onSort, header).toHaveBeenLastCalledWith(column, direction);
    }
  });

  it("puts the rows in the sort's order — by title, by status (running first), by progress", () => {
    const { unmount } = mount({ sort: { column: "title", direction: "asc" } });
    const byTitle = titles();
    expect(byTitle).toEqual([...byTitle].sort((a, b) => (a ?? "").toLocaleLowerCase().localeCompare((b ?? "").toLocaleLowerCase())));
    unmount();
    mount({ sort: { column: "status", direction: "asc" } });
    expect(titles()[0]).toBe(RUNNING.title);
  });

  it("stands each filter over its column — the status's under Status, the kind's under Kind — and Clear above the table while one is on (CTA-221)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClearFilters = vi.fn();
    const { unmount } = mount({ filters: { values: NO_JOB_QUEUE_FILTERS, onChange, kinds: KINDS }, onClearFilters });
    const status = within(screen.getByRole("columnheader", { name: /Status/ })).getByRole("combobox", { name: "Status" });
    expect(status).toHaveTextContent("Any status");
    expect(within(screen.getByRole("columnheader", { name: /Kind/ })).getByRole("combobox", { name: "Kind" })).toHaveTextContent("Any kind");
    expect(screen.queryByTestId("queue-clear-filters")).toBeNull();
    await user.click(status);
    await user.click(screen.getByRole("option", { name: "Failed" }));
    expect(onChange).toHaveBeenLastCalledWith({ status: "failed" });
    await expectNoAxeViolations(screen.getByTestId("queue"));
    unmount();

    mount({ rows: [FAILED], filters: { values: { status: "failed", kind: "" }, onChange, kinds: KINDS }, onClearFilters });
    await user.click(screen.getByTestId("queue-clear-filters"));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("leaves out the kind's filter with one kind to choose — unless it is on", () => {
    const { unmount } = mount({ filters: { values: NO_JOB_QUEUE_FILTERS, onChange: vi.fn(), kinds: KINDS.slice(0, 1) } });
    expect(screen.queryByRole("combobox", { name: "Kind" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    unmount();
    mount({ filters: { values: { status: "", kind: KINDS[0].value }, onChange: vi.fn(), kinds: KINDS.slice(0, 1) } });
    expect(screen.getByRole("combobox", { name: "Kind" })).toBeInTheDocument();
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
      <JobQueueTable
        rows={[]}
        rowLink={() => ({ href: "#" })}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        sort={JOB_QUEUE_DEFAULT_SORT}
        onSort={vi.fn()}
        testId="queue"
      />,
    );
    expect(screen.getByTestId("queue-empty")).toHaveTextContent("No jobs yet");
    unmount();

    const onClearFilters = vi.fn();
    mount({ rows: [], filters: { values: { status: "failed", kind: "" }, onChange: vi.fn(), kinds: KINDS }, onClearFilters });
    expect(screen.getByTestId("queue-no-match")).toHaveTextContent("No job matches the filters.");
    await user.click(screen.getByTestId("queue-no-match-clear"));
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
    expect(screen.getByRole("columnheader", { name: /סוג/ })).toBeInTheDocument();
  });
});
