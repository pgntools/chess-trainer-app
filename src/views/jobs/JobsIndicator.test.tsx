import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../i18n";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type PositionResult } from "../../lib/computerAnalysis";
import { computerAnalysisJobOf, withCheckpoint, type Job, type JobStatus } from "../../lib/jobs";
import { addJob, loadJobs, updateJob } from "../../lib/jobStore";
import { expectNoAxeViolations } from "../../test/axe";
import { JobsIndicator } from "./JobsIndicator";

const jobOf = (id: string, status: JobStatus): Job => ({
  ...computerAnalysisJobOf(id, {
    source: { analysisId: null, name: "Alice – Bob", folderId: null, pgn: "1. e4 e5 2. Nf3 Nc6 *" },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
  })!,
  status,
});

const result = (job: Job, index: number): PositionResult => ({
  fen: job.positions[index].fen,
  lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: [] }],
});

const mount = (compact = false) =>
  render(
    <MemoryRouter>
      <JobsIndicator compact={compact} />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the shell's jobs indicator (CTA-173)", () => {
  it("is nothing while no job runs or waits", async () => {
    await addJob(jobOf("over", "done"));
    mount();
    await loadJobs();
    expect(screen.queryByTestId("jobs-indicator")).not.toBeInTheDocument();
  });

  it("links to the Jobs screen with the running job's progress, its name for a screen reader", async () => {
    await addJob(withCheckpoint(jobOf("live", "running"), 0, result(jobOf("live", "running"), 0)));
    mount();
    const link = await screen.findByRole("link", { name: "Analysing 1/5, Alice – Bob" });
    expect(link).toHaveAttribute("href", "/jobs");
  });

  it("is an icon alone under the breakpoint, named in full", async () => {
    await addJob(jobOf("live", "running"));
    mount(true);
    expect(await screen.findByRole("link", { name: "Jobs: Alice – Bob, 0 of 5 positions" })).toHaveAttribute("href", "/jobs");
  });

  it("counts the jobs queued while none runs", async () => {
    await addJob(jobOf("a", "queued"));
    await addJob(jobOf("b", "queued"));
    mount();
    expect(await screen.findByRole("link", { name: "2 queued" })).toBeInTheDocument();
  });

  it("announces a job starting and ending — never its progress, nor what the first read finds", async () => {
    await addJob(jobOf("live", "running"));
    mount();
    await screen.findByRole("link", { name: /Analysing 0\/5/ });
    const status = screen.getByTestId("jobs-indicator-status");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveTextContent("");

    // A position finished: the link's words change, the announcement does not.
    await updateJob("live", (job) => withCheckpoint(job, 0, result(job, 0)));
    await screen.findByRole("link", { name: /Analysing 1\/5/ });
    expect(status).toHaveTextContent("");

    await updateJob("live", (job) => ({ ...job, status: "done" }));
    await waitFor(() => expect(status).toHaveTextContent("Computer analysis finished: Alice – Bob."));
    expect(screen.queryByTestId("jobs-indicator")).not.toBeInTheDocument();

    await addJob(jobOf("next", "queued"));
    await updateJob("next", (job) => ({ ...job, status: "running" }));
    await waitFor(() => expect(status).toHaveTextContent("Computer analysis started: Alice – Bob."));
  });

  it("passes axe", async () => {
    await addJob(jobOf("live", "running"));
    mount();
    await screen.findByTestId("jobs-indicator");
    await expectNoAxeViolations();
  });
});
