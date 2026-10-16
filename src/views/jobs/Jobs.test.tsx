import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router";

import i18n from "../../i18n";
import { addAnalysisCases } from "../../lib/analysisCaseStore";
import { createAnalysisProject } from "../../lib/analysisProjectStore";
import { gameCaseOf } from "../../lib/analysisProjects";
import { indexedRowOf } from "../../lib/collectionIndex";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../lib/computerAnalysis";
import { addCollection, resetLibraryCollectionStore } from "../../lib/libraryCollectionStore";
import { COLLECTION_MERGE_KIND, mergedCollectionId } from "../../lib/jobs/kinds/collectionMerge/core";
import { COMPUTER_ANALYSIS_KIND } from "../../lib/jobs/kinds/computerAnalysis/core";
import { jobRuntime, startJobRuntime } from "../../lib/jobs/runtime";
import { JOBS_SETTINGS_STORAGE_KEY } from "../../lib/jobsSettings";
import { parsePgnTree } from "../../lib/pgn";
import { addRepertoires } from "../../lib/savedRepertoireStore";
import { savedRepertoireOf } from "../../lib/savedRepertoires";
import { REPERTOIRE_EVALUATION_KIND } from "../../lib/jobs/kinds/repertoireEvaluation/core";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

import { appRoutes } from "../../routes";

/*
  **The Jobs screens** (CTA-221) — `/jobs`, `/jobs/<id>`, `/jobs/settings`,
  the header's indicator and the Library's *Merge collections…*, inside the
  real shell over the page's real runtime (`lib/jobs/runtime.ts`, IndexedDB
  through fake-indexeddb). A job seeded to wait an hour (`runAfter`) stays
  queued; a merge of two small uploads runs to its end for real.
*/

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const game = (n: number) => `[Event "Club"]\n[White "White ${n}"]\n[Black "Black ${n}"]\n[Result "*"]\n\n1. e4 e5 *`;

const mountAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <AppThemeWithLang>
      <RouterProvider router={router} />
    </AppThemeWithLang>,
  );
  return router;
};

/** A Case's computer analysis, queued to run in an hour — it stays queued here. */
const queueAnalysis = async () => {
  const project = (await createAnalysisProject("Openings", null))!;
  await addAnalysisCases([gameCaseOf({ id: "case", projectId: project.id, name: "Alice – Bob" }, parsePgnTree(PGN))]);
  const queued = await jobRuntime().enqueue(
    COMPUTER_ANALYSIS_KIND,
    {
      source: { projectId: project.id, caseId: "case", name: "Alice – Bob", pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
      preset: { id: "", name: "Default", values: {} },
      target: { kind: "project", projectId: project.id },
    },
    { runAfter: new Date(Date.now() + 3_600_000) },
  );
  if (!("id" in queued)) throw new Error("not queued");
  return queued.id;
};

/** Two uploads, kept in the Library. */
const keepTwo = async () => {
  const added = [];
  for (const [name, games] of [
    ["Tata Steel", [game(1), game(2)]],
    ["Wijk", [game(2), game(3)]],
  ] as const) {
    const made = await addCollection(name, [...games], games.map((pgn) => indexedRowOf(pgn)));
    if (!("collection" in made)) throw new Error("not added");
    added.push(made.collection);
  }
  return added;
};

/** A merge of the two, run to its end — its file, its summary and a Library collection of it. */
const mergeDone = async () => {
  const [a, b] = await keepTwo();
  startJobRuntime();
  const queued = await jobRuntime().enqueue(COLLECTION_MERGE_KIND, {
    sources: [
      { id: a.id, name: a.name },
      { id: b.id, name: b.name },
    ],
    dedupe: "identical-pgn",
    name: "Merged",
    outputs: { collection: true },
  });
  if (!("id" in queued)) throw new Error("not queued");
  await vi.waitFor(() => expect(jobRuntime().snapshot()?.find((job) => job.id === queued.id)?.status).toBe("done"), { timeout: 20_000 });
  return queued.id;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
  await resetLibraryCollectionStore();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetLibraryCollectionStore();
});

describe("the Jobs screen — /jobs (CTA-221)", () => {
  it("lists every job with its kind, what it is applied to and its status — and pauses, resumes and deletes one, asking first", async () => {
    const id = await queueAnalysis();
    mountAt("/jobs");
    const table = await screen.findByTestId("jobs-table");
    const link = await within(table).findByRole("link", { name: "Open the job Alice – Bob" });
    expect(link).toHaveAttribute("href", `/jobs/${id}`);
    expect(within(table).getByTestId(`jobs-table-kind-${id}`)).toHaveTextContent("Computer analysis");
    expect(within(table).getByTestId(`jobs-table-subjects-${id}`)).toHaveTextContent("Alice – Bob");
    expect(within(table).getByTestId(`jobs-table-status-${id}`)).toHaveTextContent("Queued");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Pause Alice – Bob" }));
    await waitFor(() => expect(screen.getByTestId(`jobs-table-status-${id}`)).toHaveTextContent("Paused"));
    await user.click(screen.getByRole("button", { name: "Resume Alice – Bob" }));
    await waitFor(() => expect(screen.getByTestId(`jobs-table-status-${id}`)).toHaveTextContent("Queued"));

    await user.click(screen.getByRole("button", { name: "Delete Alice – Bob" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Alice – Bob");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByTestId(`jobs-table-status-${id}`)).toBeNull());
    expect(jobRuntime().snapshot()).toEqual([]);
  });

  it("filters by kind, and passes axe", async () => {
    await queueAnalysis();
    mountAt("/jobs");
    await screen.findByRole("link", { name: "Open the job Alice – Bob" });
    expect(screen.getByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("is reached from the sidebar's own Jobs folder, and Jobs V2's address is no route", async () => {
    mountAt("/jobs");
    expect(await screen.findByRole("link", { name: "Jobs settings" })).toHaveAttribute("href", "/jobs/settings");
    expect(matchRoutes(appRoutes, "/analysis/jobs")?.at(-1)?.route.path).not.toBe("/analysis/jobs");
  });
});

describe("one job — /jobs/<id> (CTA-221)", () => {
  it("shows a finished merge whole: its outputs — the collection a link, the file downloaded through an object URL, the summary drawn — and its history", async () => {
    const id = await mergeDone();
    const created = vi.fn((blob: Blob) => (void blob, "blob:merged"));
    vi.stubGlobal("URL", Object.assign(Object.create(URL), URL, { createObjectURL: created, revokeObjectURL: vi.fn() }));
    mountAt(`/jobs/${id}`);

    expect(await screen.findByRole("heading", { level: 1, name: "Merged" })).toBeInTheDocument();
    expect(screen.getByTestId("job-details-status")).toHaveTextContent("Done");
    const outputs = screen.getByTestId("job-outputs");
    expect(within(outputs).getByRole("link", { name: "Merged" })).toHaveAttribute("href", `/library/${mergedCollectionId(id)}`);
    expect(within(screen.getByTestId("job-data-summary")).getByTestId("job-data-summary-totals")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(within(outputs).getByRole("button", { name: "Download Merged.pgn" }));
    await waitFor(() => expect(created).toHaveBeenCalled());
    const blob = created.mock.calls[0][0];
    expect((await blob.text()).match(/\[Event/g)).toHaveLength(3);

    await user.click(within(screen.getByTestId("job-history")).getByRole("button", { name: "History" }));
    expect(within(screen.getByTestId("job-history")).getAllByText("Done").length).toBeGreaterThan(0);
  });

  it("says so for a job that is not there", async () => {
    startJobRuntime();
    mountAt("/jobs/nothing");
    expect(await screen.findByText("There is no such job — it may have been deleted.")).toBeInTheDocument();
  });

  it("passes axe, a queued job's page", async () => {
    const id = await queueAnalysis();
    mountAt(`/jobs/${id}`);
    expect(await screen.findByRole("heading", { level: 1, name: "Alice – Bob" })).toBeInTheDocument();
    expect(screen.getByTestId("job-parameters")).toHaveTextContent("Results go to");
    await expectNoAxeViolations();
  });
});

describe("the Jobs settings — /jobs/settings (CTA-193, CTA-221)", () => {
  it("keeps the default engine and preset for new jobs under its old key", async () => {
    mountAt("/jobs/settings");
    expect(await screen.findByRole("heading", { level: 1, name: "Jobs settings" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Use a default engine and preset" }));
    await waitFor(() => expect(localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY)).toContain("defaultPreset"));
    expect(screen.getByRole("link", { name: "Settings → Engine" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });
});

describe("the header's indicator (CTA-221)", () => {
  it("counts the jobs queued, a link to /jobs", async () => {
    await queueAnalysis();
    mountAt("/engine/games");
    const indicator = await screen.findByTestId("jobs-indicator");
    expect(indicator).toHaveAttribute("href", "/jobs");
    expect(indicator).toHaveTextContent("Jobs: 1 queued");
  });
});

describe("Merge collections… from the Library's picks (CTA-221)", () => {
  it("offers the merge with two collections picked, queues it, and leads to the job", async () => {
    const [a, b] = await keepTwo();
    const router = mountAt("/library");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("checkbox", { name: `Pick ${a.name}` }));
    expect(screen.getByRole("button", { name: "Merge collections…" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: `Pick ${b.name}` }));
    await user.click(screen.getByRole("button", { name: "Merge collections…" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: /Merge collections/ })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Start" }));
    const open = await screen.findByRole("link", { name: "Open job" });
    const job = jobRuntime().snapshot()?.find((each) => each.kind === COLLECTION_MERGE_KIND);
    expect(job?.subjects.map((subject) => subject.id)).toEqual([a.id, b.id]);
    expect(open).toHaveAttribute("href", `/jobs/${job?.id}`);
    expect(router.state.location.pathname).toBe("/library");
  });
});

describe("New job from an entity's screen (CTA-221)", () => {
  it("starts a Case's computer analysis from its Jobs tab — the tree on its board — and lists it there", async () => {
    const project = (await createAnalysisProject("Openings", null))!;
    await addAnalysisCases([gameCaseOf({ id: "case", projectId: project.id, name: "Alice – Bob" }, parsePgnTree(PGN))]);
    mountAt(`/analysis/projects/${project.id}/cases/case`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "Jobs" }));
    expect(await screen.findByText("No jobs for this Case yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New job" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: /Computer analysis/ })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("link", { name: "Open job" })).toBeInTheDocument();
    const job = jobRuntime().snapshot()?.find((each) => each.kind === COMPUTER_ANALYSIS_KIND);
    expect(job?.subjects).toEqual([{ type: "analysis-case", id: "case" }]);
    expect(await screen.findByRole("link", { name: "Alice – Bob" })).toHaveAttribute("href", `/jobs/${job?.id}`);
  });

  it("evaluates a repertoire from its Jobs tab — Evaluate with engine…", async () => {
    const pgn = "1. d4 d5 2. c4 e6 *";
    await addRepertoires([savedRepertoireOf("rep1", { index: 0, name: "QGD", pgn, tree: parsePgnTree(pgn) }, "QGD", undefined)]);
    mountAt("/repertoires/rep1");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "Jobs" }));
    await user.click(await screen.findByRole("button", { name: "Evaluate with engine…" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: /Repertoire evaluation/ })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("link", { name: "Open job" })).toBeInTheDocument();
    expect(jobRuntime().snapshot()?.find((each) => each.kind === REPERTOIRE_EVALUATION_KIND)?.subjects).toEqual([{ type: "repertoire", id: "rep1" }]);
  });
});
