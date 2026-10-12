import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseJobs from "./CaseJobs";
import { DONE, JOBS, RUNNING } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseJobs (CTA-188)", () => {
  it("lists the Case's jobs, each a link with its status and progress, and opens a new one", async () => {
    const onNewJob = vi.fn();
    render(<CaseJobs jobs={JOBS} jobLink={(job) => ({ href: `#${job.id}` })} onNewJob={onNewJob} testId="jobs" />);
    const list = screen.getByRole("list", { name: "This Case's jobs" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const running = screen.getByTestId(`jobs-job-${RUNNING.id}`);
    expect(within(running).getByRole("link", { name: /into this Case/ })).toHaveAttribute("href", `#${RUNNING.id}`);
    expect(within(running).getByText("Running")).toBeInTheDocument();
    expect(within(running).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "43");
    expect(within(screen.getByTestId(`jobs-job-${DONE.id}`)).getByText("Done")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New job" }));
    expect(onNewJob).toHaveBeenCalled();
    await expectNoAxeViolations();
  });

  it("says when there is none, and while the store is read", () => {
    const { rerender } = render(<CaseJobs jobs={[]} jobLink={() => ({ href: "#" })} onNewJob={() => {}} testId="jobs" />);
    expect(screen.getByTestId("jobs-empty")).toHaveTextContent("No jobs for this Case yet.");
    rerender(<CaseJobs jobs={undefined} jobLink={() => ({ href: "#" })} onNewJob={() => {}} testId="jobs" />);
    expect(screen.getByTestId("jobs-loading")).toBeInTheDocument();
  });
});
