import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../../i18n";
import { addAnalysisCases, loadAnalysisCases, mergeIntoAnalysisCase } from "../../../lib/analysisCaseStore";
import { linkAnalysisProjects, loadProjectLinks } from "../../../lib/analysisProjectLinkStore";
import { createProjectFolder } from "../../../lib/analysisProjectFolderStore";
import { createAnalysisProject, loadAnalysisProjects } from "../../../lib/analysisProjectStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../lib/computerAnalysis";
import { createEnginePreset, selectEnginePreset, setEnginePresetSearch } from "../../../lib/enginePresetStore";
import { resolveEngine } from "../../../lib/engines";
import { jobV2MergedPgn, jobV2Of, withCheckpointV2, type JobV2, type JobV2Target } from "../../../lib/jobsV2";
import { addJobV2, findJobV2, jobsV2Snapshot, loadJobsV2 } from "../../../lib/jobV2Store";
import { parsePgnTree } from "../../../lib/pgn";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { BoardLeftPanelOutlet, BoardLeftPanelProvider } from "../../main/boardLeftPanel";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";

vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});
vi.mock("../../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../../board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../../lib/openings")>);
});

import CaseWorkspace from "../CaseWorkspace";
import ProjectScreen from "../ProjectScreen";
import JobsV2Screen from "./JobsV2Screen";

/*
  Jobs V2 (CTA-188) over the real stores (fake-indexeddb): the Case view's
  Jobs tab and the New Job V2 popup — each place the results may go — an
  open board taking a merge into its Case, a Project's links, and the Jobs V2
  view. No runner runs here: a job's progress is seeded as the runner would
  write it.
*/

const GAME = `[Event "Club Championship"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 e5 2. Nf3 {A plan} Nc6 1-0`;

function Where() {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
}

const mount = (entry: string) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <BoardLeftPanelProvider>
            <Routes>
              <Route path="/analysis/projects/:projectId" element={<ProjectScreen />} />
              <Route path="/analysis/projects/:projectId/cases/:caseId" element={<CaseWorkspace />} />
              <Route path="/analysis/jobs" element={<JobsV2Screen />} />
            </Routes>
            <Where />
            <BoardLeftPanelOutlet compact={false} />
            <RightPanelOutlet />
          </BoardLeftPanelProvider>
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const where = () => screen.getByTestId("where").textContent;

/** A Project in a folder, and a Game Case in it. */
const seed = async () => {
  const folder = (await createProjectFolder("Openings", null))!;
  const project = (await createAnalysisProject("Club", folder.id))!;
  await addAnalysisCases([gameCaseOf({ id: "cgame", projectId: project.id, name: "" }, parsePgnTree(GAME))]);
  return { project, folder };
};

/** A Jobs V2 job of the Case, every position checkpointed at +0.20 — as the runner leaves one done. */
const finishedJob = (projectId: string, target: JobV2Target, id = "job"): JobV2 => {
  const job = jobV2Of(id, {
    source: { projectId, caseId: "cgame", name: "Carlsen – Caruana", pgn: GAME },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
    preset: { id: "deep", name: "Deep analysis", values: {} },
    target,
  })!;
  const done = job.positions.reduce<JobV2>(
    (row, position, index) => withCheckpointV2(row, index, { fen: position.fen, lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: [] }] }),
    job,
  );
  return { ...done, engine: { id: "sf", name: "Stockfish 19 Lite", version: "19" } };
};

/** The Case's own view, on its Jobs tab. */
const openJobsTab = async (projectId: string) => {
  const user = userEvent.setup();
  mount(`/analysis/projects/${projectId}/cases/cgame?view=case`);
  await screen.findByTestId("board");
  await user.click(screen.getByRole("tab", { name: "Jobs" }));
  return user;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("a Case's Jobs tab and the New Job V2 popup (CTA-188)", () => {
  it("queues the Case's computer analysis as new Cases in its Project — the preset's depth, Start saying so", async () => {
    const { project } = await seed();
    // The engine's selected preset searches to depth 14.
    const deep = await createEnginePreset("Deep analysis");
    if (!("id" in deep)) throw new Error("no preset");
    await setEnginePresetSearch(deep.id, { depth: 14 });
    await selectEnginePreset(resolveEngine().id, deep.id);
    const user = await openJobsTab(project.id);
    expect(screen.getByTestId("analysis-case-jobs-empty")).toHaveTextContent("No jobs for this Case yet.");

    await user.click(screen.getByRole("button", { name: "New job" }));
    const dialog = await screen.findByRole("dialog", { name: "New job — Jobs V2" });
    expect(within(dialog).getByRole("combobox", { name: "Preset" })).toHaveTextContent("Deep analysis");
    expect(within(dialog).getByRole("slider", { name: "Depth" })).toHaveValue("14");
    expect(within(dialog).getByRole("radio", { name: "New Cases in this project (Club)" })).toBeChecked();
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole("button", { name: "Start computer analysis" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByTestId("analysis-case-new-job-notice")).toHaveTextContent("Jobs V2: the computer analysis of Carlsen – Caruana, Club Championship is queued.");
    const [job] = jobsV2Snapshot()!;
    expect(job).toMatchObject({
      status: "queued",
      source: { projectId: project.id, caseId: "cgame", name: "Carlsen – Caruana, Club Championship" },
      options: { depth: 14, engine: resolveEngine().id },
      preset: { id: deep.id, name: "Deep analysis" },
      target: { kind: "project", projectId: project.id },
    });
    const listed = await screen.findByTestId(`analysis-case-jobs-job-${job.id}`);
    expect(within(listed).getByText("Queued")).toBeInTheDocument();
    expect(within(listed).getByRole("link", { name: /new Cases in its project/ })).toHaveAttribute("href", `/analysis/jobs?job=${job.id}`);
  });

  it("asks first when the Case has a job — Check existing opens it on Jobs V2", async () => {
    const { project } = await seed();
    await addJobV2({ ...finishedJob(project.id, { kind: "project", projectId: project.id }), status: "running" });
    const user = await openJobsTab(project.id);
    await user.click(screen.getByRole("button", { name: "New job" }));
    const dialog = await screen.findByRole("dialog", { name: "New job — Jobs V2" });
    expect(within(dialog).getByTestId("analysis-case-new-job-existing")).toHaveTextContent("Running");
    await user.click(within(dialog).getByRole("button", { name: "Check existing" }));
    expect(where()).toBe("/analysis/jobs?job=job");
  });

  it("files the results in a new linked project — made beside the source's, and linked from it, on Start", async () => {
    const { project, folder } = await seed();
    const user = await openJobsTab(project.id);
    await user.click(screen.getByRole("button", { name: "New job" }));
    const dialog = await screen.findByRole("dialog", { name: "New job — Jobs V2" });
    await user.click(within(dialog).getByRole("radio", { name: "A linked project" }));
    const name = within(dialog).getByRole("textbox", { name: "The new project's name" });
    expect(name).toHaveValue("Club — analysis");
    await user.clear(name);
    expect(within(dialog).getByRole("button", { name: "Start computer analysis" })).toBeDisabled();
    expect(within(dialog).getByText("Name the new project to start.")).toBeInTheDocument();
    await user.type(name, "Club lines");
    await user.click(within(dialog).getByRole("button", { name: "Start computer analysis" }));
    await waitFor(() => expect(jobsV2Snapshot()).toHaveLength(1));

    const made = (await loadAnalysisProjects()).find((each) => each.name === "Club lines")!;
    expect(made.folderId).toBe(folder.id);
    expect((await loadProjectLinks()).map(({ fromId, toId }) => [fromId, toId])).toEqual([[project.id, made.id]]);
    expect(jobsV2Snapshot()![0].target).toEqual({ kind: "linked", projectId: made.id });
  });

  it("merges into the Case itself — one variant", async () => {
    const { project } = await seed();
    const user = await openJobsTab(project.id);
    await user.click(screen.getByRole("button", { name: "New job" }));
    const dialog = await screen.findByRole("dialog", { name: "New job — Jobs V2" });
    await user.click(within(dialog).getByRole("radio", { name: "Into this Case" }));
    expect(within(dialog).queryByRole("checkbox", { name: /Light/ })).toBeNull();
    await user.click(within(dialog).getByRole("radio", { name: "Medium" }));
    await user.click(within(dialog).getByRole("button", { name: "Start computer analysis" }));
    await waitFor(() => expect(jobsV2Snapshot()).toHaveLength(1));
    expect(jobsV2Snapshot()![0]).toMatchObject({ target: { kind: "case" }, options: { outputs: ["medium"] } });
  });
});

describe("a merge into an open Case (CTA-188)", () => {
  it("is taken in by its board — the evaluations there at once — and its autosave never writes the older tree back", async () => {
    const { project } = await seed();
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}/cases/cgame?view=case`);
    await screen.findByTestId("board");
    expect(screen.getByRole("tab", { name: "Graph" })).toBeDisabled();

    // The runner's end: the job done, its analysis merged into the Case as stored.
    const job = finishedJob(project.id, { kind: "case" });
    await addJobV2(job);
    await mergeIntoAnalysisCase("cgame", job.id, (pgn) => jobV2MergedPgn(job, pgn));

    await waitFor(() => expect(screen.getByRole("tab", { name: "Graph" })).toBeEnabled());
    // A step on the board autosaves its place — the merged tree kept.
    await user.keyboard("{ArrowRight}");
    await waitFor(async () => {
      const record = (await loadAnalysisCases()).find((each) => each.id === "cgame")!;
      expect(record.merges).toEqual([job.id]);
      expect(record.pgn).toContain("[%eval");
      expect(record.pgn).toContain("A plan");
    });
  });
});

describe("a Project's links (CTA-188)", () => {
  it("lists the Projects it links to and is linked from — each a link there — and unlinks", async () => {
    const { project } = await seed();
    const lines = (await createAnalysisProject("Lines", null))!;
    const sicilian = (await createAnalysisProject("Sicilian", null))!;
    await linkAnalysisProjects(project.id, lines.id);
    await linkAnalysisProjects(sicilian.id, project.id);
    const user = userEvent.setup();
    const { baseElement } = mount(`/analysis/projects/${project.id}`);

    const to = await screen.findByRole("region", { name: "Links to" });
    expect(within(to).getByRole("link", { name: "Lines" })).toHaveAttribute("href", `/analysis/projects/${lines.id}`);
    const from = screen.getByRole("region", { name: "Linked from" });
    expect(within(from).getByRole("link", { name: "Sicilian" })).toBeInTheDocument();
    await expectNoAxeViolations(baseElement);

    await user.click(within(to).getByRole("button", { name: "Unlink Lines" }));
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Links to" })).getByText("None")).toBeInTheDocument());
    expect((await loadProjectLinks()).map(({ fromId }) => fromId)).toEqual([sicilian.id]);
  });
});

describe("the Jobs V2 view (CTA-188)", () => {
  it("lists the jobs and opens one: its results, where they went, the engine and the preset", async () => {
    const { project } = await seed();
    const job = finishedJob(project.id, { kind: "project", projectId: project.id });
    const output = gameCaseOf({ id: "cout", projectId: project.id, name: "Carlsen – Caruana - computer analysis (light)" }, parsePgnTree(jobV2MergedPgn(job, GAME)!));
    await addAnalysisCases([output]);
    await addJobV2({ ...job, status: "done", outputs: [{ variant: "light", projectId: project.id, caseId: "cout" }] });
    await addJobV2({ ...finishedJob(project.id, { kind: "case" }, "live"), status: "running" });
    const user = userEvent.setup();
    const { baseElement } = mount("/analysis/jobs?job=job");

    const table = await screen.findByRole("table", { name: "Jobs" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    const summary = await screen.findByTestId("analysis-v2-jobs-summary");
    expect(within(summary).getByTestId("analysis-v2-jobs-summary-status")).toHaveTextContent("Done");
    expect(within(summary).getByRole("link", { name: "Open the Case" })).toHaveAttribute("href", `/analysis/projects/${project.id}/cases/cgame`);
    expect(within(summary).getByRole("link", { name: "Open the Light Case" })).toHaveAttribute("href", `/analysis/projects/${project.id}/cases/cout`);
    expect(await within(summary).findByTestId("analysis-v2-jobs-report-table")).toBeInTheDocument();
    await user.click(within(summary).getByRole("tab", { name: "Parameters" }));
    const facts = within(summary).getByTestId("analysis-v2-jobs-summary-facts");
    expect(facts).toHaveTextContent("PresetDeep analysis");
    expect(facts).toHaveTextContent("Results go toNew Cases in Club");
    await expectNoAxeViolations(baseElement);

    // Another job, running: Pause from the list; Delete asks first.
    await user.click(within(table).getByRole("button", { name: "Pause Carlsen – Caruana" }));
    await waitFor(() => expect(findJobV2("live")?.status).toBe("paused"));
    await user.click(within(table).getAllByRole("button", { name: "Delete Carlsen – Caruana" })[0]);
    const confirm = await screen.findByRole("dialog", { name: "Delete this job?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(async () => expect((await loadJobsV2()).map((each) => each.id)).toEqual(["job"]));
  });
});
