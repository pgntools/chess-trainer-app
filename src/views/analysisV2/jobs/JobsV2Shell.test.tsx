import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";

import i18n from "../../../i18n";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../lib/computerAnalysis";
import { jobV2Of, withCheckpointV2, type JobStatus, type JobV2 } from "../../../lib/jobsV2";
import { createJobV2LiveFeed, type JobV2LiveFeed } from "../../../lib/jobV2Live";
import { addJobV2, loadJobsV2, updateJobV2 } from "../../../lib/jobV2Store";
import { expectNoAxeViolations } from "../../../test/axe";
import { stubReducedMotion } from "../../../test/reducedMotion";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { EVAL_SOURCES, reportEvalSourceUnreachable } from "../../../lib/evalSources";
import { JobsV2Indicator, JobV2Runner } from "./JobsV2Shell";

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
    <AppThemeWithLang>
      <MemoryRouter>
        <JobsV2Indicator compact={compact} />
      </MemoryRouter>
    </AppThemeWithLang>,
  );

let feed: JobV2LiveFeed | undefined;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  feed?.clear();
  feed = undefined;
  vi.restoreAllMocks();
});

/** What this tab's runner would publish while it searches the running job's second position. */
const publishLive = (jobId: string, depth: number, nodes?: number, heardAt = Date.now()) => {
  feed ??= createJobV2LiveFeed({ intervalMs: 0 });
  feed.update({ jobId, index: 1, move: "1... e5", depth, nodes, elapsedMs: 1_000, line: [], heardAt });
};

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

describe("the indicator's live engine progress (CTA-190)", () => {
  it("beats while the engine reports on the running job, its numbers in its name — and stops when the position ends", async () => {
    await addJobV2(firstDone(jobOf("live", "running")));
    mount();
    const link = await screen.findByRole("link", { name: "Jobs V2 1/5, Alice – Bob" });
    const heartbeat = screen.getByTestId("analysis-v2-jobs-indicator-heartbeat");
    expect(heartbeat).toHaveAttribute("data-beating", "false");

    act(() => publishLive("live", 22, 3_141_592));
    expect(link).toHaveAccessibleName("Jobs V2 1/5, Alice – Bob, depth 22, 3.1M nodes");
    expect(heartbeat).toHaveAttribute("data-beating", "true");
    // Never announced: the status region still holds nothing.
    expect(screen.getByTestId("analysis-v2-jobs-indicator-status")).toHaveTextContent("");
    await expectNoAxeViolations();

    act(() => feed?.clear());
    expect(link).toHaveAccessibleName("Jobs V2 1/5, Alice – Bob");
    expect(heartbeat).toHaveAttribute("data-beating", "false");
  });

  it("beats once each time the engine is heard — through a long quiet stretch, on each heartbeat (CTA-194)", async () => {
    await addJobV2(firstDone(jobOf("live", "running")));
    mount();
    await screen.findByRole("link", { name: "Jobs V2 1/5, Alice – Bob" });
    const at = Date.now();
    act(() => publishLive("live", 32, 9_000_000, at));
    const heartbeat = () => screen.getByTestId("analysis-v2-jobs-indicator-heartbeat");
    expect(heartbeat()).toHaveAttribute("data-pulse", "1");
    act(() => publishLive("live", 32, 9_000_000, at + 200)); // within the beat: none started
    expect(heartbeat()).toHaveAttribute("data-pulse", "1");
    // A heartbeat 15 s on, then another: the numbers are the same, the spinner beats again.
    act(() => publishLive("live", 32, 9_000_000, at + 15_000));
    expect(heartbeat()).toHaveAttribute("data-pulse", "2");
    act(() => publishLive("live", 32, 9_000_000, at + 30_000));
    expect(heartbeat()).toHaveAttribute("data-pulse", "3");
    expect(heartbeat()).toHaveAttribute("data-beating", "true");
    expect(screen.getByTestId("analysis-v2-jobs-indicator-status")).toHaveTextContent("");
  });

  it("names the numbers on the icon alone too, under the breakpoint", async () => {
    await addJobV2(firstDone(jobOf("live", "running")));
    mount(true);
    await screen.findByRole("link", { name: "Jobs V2: Alice – Bob, 1 of 5 positions" });
    act(() => publishLive("live", 9));
    expect(screen.getByRole("link", { name: "Jobs V2: Alice – Bob, 1 of 5 positions, depth 9" })).toBeInTheDocument();
  });

  it("stays still under reduced motion, the numbers still in its name", async () => {
    stubReducedMotion();
    await addJobV2(firstDone(jobOf("live", "running")));
    mount();
    await screen.findByRole("link", { name: "Jobs V2 1/5, Alice – Bob" });
    act(() => publishLive("live", 22, 3_141_592));
    expect(screen.getByRole("link", { name: "Jobs V2 1/5, Alice – Bob, depth 22, 3.1M nodes" })).toBeInTheDocument();
    const heartbeat = screen.getByTestId("analysis-v2-jobs-indicator-heartbeat");
    expect(heartbeat).toHaveAttribute("data-live", "true");
    expect(heartbeat).toHaveAttribute("data-beating", "false");
  });

  it("shows nothing live for a snapshot of a job that is not the one running", async () => {
    await addJobV2(firstDone(jobOf("live", "running")));
    await addJobV2(jobOf("other", "paused"));
    mount();
    await screen.findByRole("link", { name: "Jobs V2 1/5, Alice – Bob" });
    act(() => publishLive("other", 30, 1_000));
    expect(screen.getByRole("link", { name: "Jobs V2 1/5, Alice – Bob" })).toBeInTheDocument();
    expect(screen.getByTestId("analysis-v2-jobs-indicator-heartbeat")).toHaveAttribute("data-live", "false");
  });
});

describe("the shell's warning when an eval source did not answer (CTA-193, CTA-196)", () => {
  const lichess = EVAL_SOURCES.find((source) => source.id === "lichess")!;

  function Where() {
    const location = useLocation();
    return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
  }

  it("says so once per word from the runner, naming the source — the job goes on with the engine — and opens Settings → Engine", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <AppThemeWithLang>
        <MemoryRouter initialEntries={["/analysis"]}>
          <JobV2Runner />
          <Where />
        </MemoryRouter>
      </AppThemeWithLang>,
    );
    act(() => reportEvalSourceUnreachable({ jobId: "j1", name: "Alice – Bob", kind: "read", source: lichess }));
    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent(
      "The lichess evaluation API did not answer, so Alice – Bob goes on with the engine. If it is not running, turn it off in Settings → Engine.",
    );
    await expectNoAxeViolations(baseElement);
    await user.click(screen.getByRole("link", { name: "Engine settings" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/settings/engine"));
  });

  it("says when a source did not take the engine's evaluations — the job goes on without sending them", async () => {
    render(
      <AppThemeWithLang>
        <MemoryRouter initialEntries={["/analysis"]}>
          <JobV2Runner />
        </MemoryRouter>
      </AppThemeWithLang>,
    );
    act(() => reportEvalSourceUnreachable({ jobId: "j1", name: "Alice – Bob", kind: "write", source: lichess }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The lichess evaluation API did not take the engine's evaluations, so Alice – Bob goes on without sending them.",
    );
    expect(screen.getByRole("link", { name: "Engine settings" })).toBeInTheDocument();
  });
});
