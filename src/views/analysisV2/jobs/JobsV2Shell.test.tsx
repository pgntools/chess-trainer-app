import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../lib/computerAnalysis";
import type { JobStatus } from "../../../lib/jobs";
import { jobV2Of, withCheckpointV2, type JobV2 } from "../../../lib/jobsV2";
import { addJobV2, loadJobsV2, updateJobV2 } from "../../../lib/jobV2Store";
import { expectNoAxeViolations } from "../../../test/axe";
import { JobsV2Indicator } from "./JobsV2Shell";

const jobOf = (id: string, status: JobStatus): JobV2 => ({
  ...jobV2Of(id, {
    source: { projectId: "p", caseId: "c", name: "Alice – Bob", pgn: "1. e4 e5 2. Nf3 Nc6 *" },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
    preset: { id: "default", name: "Default", values: {} },
    target: { kind: "case" },
  })!,
  status,
});

const firstDone = (job: JobV2): JobV2 =>
  withCheckpointV2(job, 0, { fen: job.positions[0].fen, lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: [] }] });

const mount = (compact = false) =>
  render(
    <MemoryRouter>
      <JobsV2Indicator compact={compact} />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the shell's Jobs V2 indicator (CTA-188)", () => {
  it("is nothing while no Jobs V2 job runs or waits", async () => {
    await addJobV2(jobOf("over", "done"));
    mount();
    await loadJobsV2();
    expect(screen.queryByTestId("analysis-v2-jobs-indicator")).not.toBeInTheDocument();
  });

  it("links to the Jobs V2 view with the running job's progress — an icon alone, named in full, under the breakpoint", async () => {
    await addJobV2(firstDone(jobOf("live", "running")));
    const { unmount } = mount();
    expect(await screen.findByRole("link", { name: "Jobs V2 1/5, Alice – Bob" })).toHaveAttribute("href", "/analysis/jobs");
    await expectNoAxeViolations();
    unmount();
    mount(true);
    expect(await screen.findByRole("link", { name: "Jobs V2: Alice – Bob, 1 of 5 positions" })).toHaveAttribute("href", "/analysis/jobs");
  });

  it("counts the jobs queued, and announces a job starting and ending — never its progress", async () => {
    await addJobV2(jobOf("a", "queued"));
    mount();
    expect(await screen.findByRole("link", { name: "Jobs V2: 1 queued" })).toBeInTheDocument();
    const status = screen.getByTestId("analysis-v2-jobs-indicator-status");
    expect(status).toHaveTextContent("");
    await updateJobV2("a", (job) => ({ ...job, status: "running" }));
    await waitFor(() => expect(status).toHaveTextContent("Jobs V2 started: Alice – Bob."));
    await updateJobV2("a", (job) => firstDone(job));
    await screen.findByRole("link", { name: /Jobs V2 1\/5/ });
    expect(status).toHaveTextContent("Jobs V2 started: Alice – Bob.");
    await updateJobV2("a", (job) => ({ ...job, status: "done" }));
    await waitFor(() => expect(status).toHaveTextContent("Jobs V2 finished: Alice – Bob."));
  });
});
