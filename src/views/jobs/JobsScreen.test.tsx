import { Chess } from "chess.js";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../i18n";
import { DEFAULT_ANALYSIS_SETTINGS } from "../../lib/analysisSettings";
import {
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  moveVerdicts,
  type PositionResult,
} from "../../lib/computerAnalysis";
import { computerAnalysisTree } from "../../lib/computerAnalysisTree";
import { computerAnalysisJobOf, jobSearchOf, withCheckpoint, type Job, type JobStatus } from "../../lib/jobs";
import { addJob, findJob, loadJobs, updateJob } from "../../lib/jobStore";
import { savedAnalysisOf } from "../../lib/savedAnalyses";
import { saveAnalysis } from "../../lib/savedAnalysisStore";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { expectNoAxeViolations } from "../../test/axe";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";
import JobsScreen from "./JobsScreen";

/*
  The Jobs screen (CTA-173), over the real stores (fake-indexeddb, deleted
  between tests by `src/test/setup.ts`). No runner is started here: the
  screen only reads and writes the store, which is what the runner acts on
  (its own tests are `src/lib/jobRunner.test.ts`).
*/

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const AT = new Date("2026-10-10T12:00:00Z");

const jobOf = (id: string, status: JobStatus, name = "Alice – Bob"): Job => ({
  ...computerAnalysisJobOf(
    id,
    {
      source: { analysisId: `source-${id}`, name, folderId: null, pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
    },
    AT,
  )!,
  status,
});

/** Every position of `job` answered (+0.20, or +4.00 after Black's last move — Black's blunder, White's view), as a run would. */
const finishedResults = (job: Job): PositionResult[] =>
  job.positions.map((position, index) => {
    const move = new Chess(position.fen).moves({ verbose: true })[0];
    const value = index === job.positions.length - 1 ? 400 : 20;
    return { fen: position.fen, lines: [{ score: { kind: "cp", value }, depth: 20, pv: [`${move.from}${move.to}`] }] };
  });

/** A finished job and the Saved analysis it made — the report and the graph are read back from it. */
const seedDone = async (): Promise<Job> => {
  let job = jobOf("done", "running");
  const results = finishedResults(job);
  results.forEach((result, index) => {
    job = withCheckpoint(job, index, result, AT);
  });
  const search = jobSearchOf(job.source, job.options)!;
  const tree = computerAnalysisTree({
    source: search.tree,
    positions: search.positions,
    results,
    verdicts: moveVerdicts(search.positions, results, job.options),
    variant: "light",
    engine: "Stockfish 19 Lite",
    options: job.options,
  });
  await saveAnalysis({ ...savedAnalysisOf("out-light", tree, [], DEFAULT_ANALYSIS_SETTINGS, "white", AT), name: "Alice – Bob — computer analysis (light)" });
  const done: Job = { ...job, status: "done", finishedAt: AT.toISOString(), outputs: [{ variant: "light", analysisId: "out-light" }] };
  await addJob(done);
  return done;
};

/** `job` with its first `count` positions finished, as a run that got that far leaves it. */
const checkpointed = (job: Job, count: number): Job =>
  finishedResults(job)
    .slice(0, count)
    .reduce((current, result, index) => withCheckpoint(current, index, result, AT), job);

/** Where the router is — what a link or a click on the graph led to. */
const Where = () => {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
};

const renderAt = (path: string) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[path]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/jobs" element={<JobsScreen />} />
            <Route path="*" element={null} />
          </Routes>
          <RightPanelOutlet />
          <Where />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the Jobs screen (CTA-173)", () => {
  it("lists the jobs, newest first, each with its status and progress", async () => {
    await addJob(jobOf("old", "interrupted", "Carlsen – Caruana"));
    await addJob(withCheckpoint(jobOf("new", "running"), 0, finishedResults(jobOf("new", "running"))[0], AT));
    renderAt("/jobs");

    const table = await screen.findByRole("table", { name: "Jobs" });
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(3));
    const [, first, second] = within(table).getAllByRole("row");
    expect(first).toHaveTextContent("Alice – Bob");
    expect(first).toHaveTextContent("Running");
    expect(first).toHaveTextContent("1 of 5 positions · 1... e5");
    expect(second).toHaveTextContent("Carlsen – Caruana");
    expect(second).toHaveTextContent("Interrupted");
    expect(screen.getByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByTestId("jobs-count")).toHaveTextContent("Jobs: 2");
  });

  it("says so when there are no jobs, and asks the reader to pick one", async () => {
    renderAt("/jobs");
    expect(await screen.findByText(/No jobs yet/)).toBeInTheDocument();
    expect(screen.getByTestId("jobs-none-selected")).toHaveTextContent("Pick a job");
  });

  it("cancels a job from its row", async () => {
    const user = userEvent.setup();
    await addJob(jobOf("live", "running"));
    renderAt("/jobs");
    await user.click(await screen.findByRole("button", { name: "Cancel Alice – Bob" }));
    await waitFor(() => expect(findJob("live")?.status).toBe("cancelled"));
    expect(screen.getByTestId("jobs-table-status-live")).toHaveTextContent("Cancelled");
    expect(screen.queryByRole("button", { name: "Cancel Alice – Bob" })).not.toBeInTheDocument();
  });

  it("pauses a running job from its panel, and resumes it: its checkpoint kept (CTA-178)", async () => {
    const user = userEvent.setup();
    await addJob(withCheckpoint(jobOf("live", "running"), 0, finishedResults(jobOf("live", "running"))[0], AT));
    renderAt("/jobs?job=live");
    const panel = await screen.findByTestId("jobs-summary");
    await user.click(within(panel).getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(findJob("live")?.status).toBe("paused"));
    expect(within(panel).getByTestId("jobs-summary-status")).toHaveTextContent("Paused");
    expect(screen.getByTestId("jobs-table-status-live")).toHaveTextContent("Paused");
    expect(within(panel).queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(findJob("live")?.status).toBe("queued"));
    expect(findJob("live")?.checkpoint[0]).not.toBeNull();
  });

  it("resumes an interrupted job: queued again, its checkpoint kept", async () => {
    const user = userEvent.setup();
    const cut = withCheckpoint(jobOf("cut", "interrupted"), 0, finishedResults(jobOf("cut", "interrupted"))[0], AT);
    await addJob(cut);
    renderAt("/jobs");
    await user.click(await screen.findByRole("button", { name: "Resume Alice – Bob" }));
    await waitFor(() => expect(findJob("cut")?.status).toBe("queued"));
    expect(findJob("cut")?.checkpoint[0]).not.toBeNull();
  });

  it("deletes a job after asking, and keeps it when the reader keeps it", async () => {
    const user = userEvent.setup();
    await addJob(jobOf("gone", "done"));
    renderAt("/jobs");
    await user.click(await screen.findByRole("button", { name: "Delete Alice – Bob" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this job?" });
    expect(dialog).toHaveTextContent("The analyses it saved stay in Saved analyses.");
    await user.click(within(dialog).getByRole("button", { name: "Keep it" }));
    expect(findJob("gone")).toBeDefined();

    await user.click(await screen.findByRole("button", { name: "Delete Alice – Bob" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(findJob("gone")).toBeUndefined());
    expect(await loadJobs()).toEqual([]);
  });

  it("opens a job's details from its row: its options, its source, its outputs, its report and graph", async () => {
    const user = userEvent.setup();
    await seedDone();
    renderAt("/jobs");
    await user.click(await screen.findByRole("link", { name: "Show the job Alice – Bob" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/jobs?job=done");

    const panel = screen.getByTestId("jobs-summary");
    expect(within(panel).getByRole("heading", { level: 2, name: "Alice – Bob" })).toBeInTheDocument();
    expect(within(panel).getByTestId("jobs-summary-status")).toHaveTextContent("Done");
    expect(within(panel).getByRole("link", { name: "Open the analysed game" })).toHaveAttribute("href", "/tools/analysis?analysis=source-done");
    expect(within(panel).getByRole("link", { name: "Open the Light analysis" })).toHaveAttribute("href", "/tools/analysis?analysis=out-light");

    // The report and the graph, read back from the output.
    const report = await within(panel).findByRole("table", { name: "Computer analysis report" });
    expect(within(report).getByRole("columnheader", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByTestId("jobs-report-table-blunders-b")).toHaveTextContent("1");
    expect(within(panel).getByRole("slider", { name: "Evaluation graph" })).toBeInTheDocument();
  });

  it("opens the output on the Analysis Board at the move chosen on the graph", async () => {
    const user = userEvent.setup();
    await seedDone();
    renderAt("/jobs?job=done");
    const graph = await screen.findByRole("slider", { name: "Evaluation graph" });
    graph.focus();
    await user.keyboard("{Home}{ArrowRight}{ArrowRight}{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/tools/analysis?analysis=out-light&at=e4%2Ce5");
  });

  it("says an output deleted since leaves no report", async () => {
    const job = await seedDone();
    const { removeSavedAnalysis } = await import("../../lib/savedAnalysisStore");
    await removeSavedAnalysis(job.outputs[0].analysisId);
    renderAt("/jobs?job=done");
    expect(await screen.findByTestId("jobs-report-missing")).toHaveTextContent("are gone");
  });

  it("says a job named in the address is not there", async () => {
    renderAt("/jobs?job=nope");
    await screen.findByText(/No jobs yet/);
    expect(screen.getByTestId("jobs-none-selected")).toHaveTextContent("There is no such job");
  });

  it("passes axe, a job open", async () => {
    await seedDone();
    await addJob(jobOf("live", "running"));
    renderAt("/jobs?job=done");
    await screen.findByRole("slider", { name: "Evaluation graph" });
    fireEvent.blur(screen.getByRole("slider"));
    await expectNoAxeViolations();
  });
});

describe("a job's results so far (CTA-178)", () => {
  it("draws a running job's graph, latest position and report over the moves judged so far", async () => {
    await addJob(checkpointed(jobOf("live", "running"), 3));
    renderAt("/jobs?job=live");

    const live = await screen.findByRole("region", { name: "Results so far" });
    expect(within(live).getByRole("slider", { name: "Evaluation graph so far" })).toHaveAttribute("aria-valuemax", "2");
    expect(screen.getByTestId("jobs-live-latest")).toHaveTextContent(/^Latest: after 1\.\.\. e5: \+0\.20 · depth 20 · 2\. /);
    // 1. e4 and 1... e5 are judged (both their positions finished): the report has both sides.
    const report = within(live).getByRole("table", { name: "Computer analysis report" });
    expect(within(report).getByRole("columnheader", { name: "Alice" })).toBeInTheDocument();
    expect(within(report).getByRole("columnheader", { name: "Bob" })).toBeInTheDocument();
    // The summary's status line says the job moved on; nothing here is announced.
    expect(within(live).queryByRole("status")).not.toBeInTheDocument();
    expect(within(live).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fills in as the store changes", async () => {
    const job = checkpointed(jobOf("live", "running"), 3);
    await addJob(job);
    renderAt("/jobs?job=live");
    const graph = await screen.findByRole("slider", { name: "Evaluation graph so far" });
    expect(graph).toHaveAttribute("aria-valuemax", "2");

    await updateJob("live", (current) => withCheckpoint(current, 3, finishedResults(job)[3], AT));
    await waitFor(() => expect(graph).toHaveAttribute("aria-valuemax", "3"));
    expect(screen.getByTestId("jobs-live-latest")).toHaveTextContent(/^Latest: after 2\. Nf3: \+0\.20/);
    expect(screen.getByTestId("jobs-summary-progress")).toHaveTextContent("4 of 5 positions");
  });

  it("opens the source on the Analysis Board at the move chosen on the graph", async () => {
    const user = userEvent.setup();
    await addJob(checkpointed(jobOf("live", "running"), 3));
    renderAt("/jobs?job=live");
    const graph = await screen.findByRole("slider", { name: "Evaluation graph so far" });
    graph.focus();
    await user.keyboard("{Home}{ArrowRight}{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/tools/analysis?analysis=source-live&at=e4");
  });

  it("only reads the graph of a board never saved: no point leads anywhere", async () => {
    const user = userEvent.setup();
    const job = jobOf("board", "running");
    await addJob(checkpointed({ ...job, source: { ...job.source, analysisId: null } }, 3));
    renderAt("/jobs?job=board");
    const graph = await screen.findByRole("slider", { name: "Evaluation graph so far" });
    expect(graph).toHaveAccessibleDescription("Left and right arrows to move through the moves, Home and End to either end.");
    graph.focus();
    await user.keyboard("{Home}{ArrowRight}{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/jobs?job=board");
  });

  it.each(["paused", "interrupted", "failed", "cancelled"] as const)("shows what an %s job's checkpoint holds", async (status) => {
    await addJob(checkpointed({ ...jobOf("cut", status), ...(status === "failed" ? { error: "engine" as const } : {}) }, 2));
    renderAt("/jobs?job=cut");
    const live = await screen.findByRole("region", { name: "Results so far" });
    expect(within(live).getByRole("slider", { name: "Evaluation graph so far" })).toHaveAttribute("aria-valuemax", "1");
    expect(screen.getByTestId("jobs-live-latest")).toHaveTextContent(/^Latest: after 1\. e4: \+0\.20 · depth 20/);
  });

  it("says there are no results before the first position is finished", async () => {
    await addJob(jobOf("waiting", "queued"));
    renderAt("/jobs?job=waiting");
    expect(await screen.findByTestId("jobs-summary-status")).toHaveTextContent("Queued");
    expect(screen.getByRole("tabpanel", { name: "Results" })).toHaveTextContent("No results yet");
    expect(screen.queryByRole("region", { name: "Results so far" })).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("keeps the execution parameters on their own tab, the tab picked kept for the next job opened", async () => {
    const user = userEvent.setup();
    await addJob(checkpointed(jobOf("first", "running", "Carlsen – Caruana"), 3));
    await addJob(jobOf("second", "queued"));
    renderAt("/jobs?job=first");
    await screen.findByRole("region", { name: "Results so far" });
    expect(screen.queryByTestId("jobs-summary-facts")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Parameters" }));
    const params = screen.getByRole("tabpanel", { name: "Parameters" });
    expect(within(params).getByTestId("jobs-summary-facts-engine")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Results so far" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Show the job Alice – Bob" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Alice – Bob" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Parameters", selected: true })).toBeInTheDocument();
  });

  it("passes axe, a running job open", async () => {
    await addJob(checkpointed(jobOf("live", "running"), 3));
    renderAt("/jobs?job=live");
    await screen.findByRole("slider", { name: "Evaluation graph so far" });
    await expectNoAxeViolations();
  });
});
