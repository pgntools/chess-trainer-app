import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router";
import { createJobRuntime, type JobKind, type JobOutput } from "@pgntools/jobs-runtime";
import { indexedDbJobStore } from "@pgntools/jobs-runtime/browser";
import { manualClock, memoryLock } from "@pgntools/jobs-runtime/testing";

import i18n from "../../i18n";
import { addAnalysisCases } from "../../lib/analysisCaseStore";
import { createAnalysisProject } from "../../lib/analysisProjectStore";
import { gameCaseOf } from "../../lib/analysisProjects";
import { indexedRowOf } from "../../lib/collectionIndex";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "../../lib/computerAnalysis";
import { addCollection, resetLibraryCollectionStore } from "../../lib/libraryCollectionStore";
import { COMPUTER_ANALYSIS_KIND } from "../../lib/jobs/kinds/computerAnalysis/core";
import { JOBS_DB, jobRuntime, startJobRuntime } from "../../lib/jobs/runtime";
import { JOBS_SETTINGS_STORAGE_KEY } from "../../lib/jobsSettings";
import { parsePgnTree } from "../../lib/pgn";
import { addRepertoires } from "../../lib/savedRepertoireStore";
import { savedRepertoireOf } from "../../lib/savedRepertoires";
import { REPERTOIRE_EVALUATION_KIND } from "../../lib/jobs/kinds/repertoireEvaluation/core";
import { expectNoAxeViolations } from "../../test/axe";
import { runToEnd } from "../../test/jobsKit";
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
  the header's indicator and New job from an entity's screen, inside the
  real shell over the page's real runtime (`lib/jobs/runtime.ts`, IndexedDB
  through fake-indexeddb). A job seeded to wait an hour (`runAfter`) stays
  queued. A reader's jobs of the retired collection merge (CTA-232) are
  seeded by a runtime that still knows the kind, then read by the page's,
  which does not.
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

/**
 * A Case's computer analysis, queued to run in an hour — it stays queued
 * here — with the settings a new job is given now (the Default preset's
 * depth and move time, the Engine menu's Threads and Hash), unless `options`
 * says otherwise.
 */
const queueAnalysis = async (options: Partial<ComputerAnalysisOptions> = {}) => {
  const project = (await createAnalysisProject("Openings", null))!;
  await addAnalysisCases([gameCaseOf({ id: "case", projectId: project.id, name: "Alice – Bob" }, parsePgnTree(PGN))]);
  const queued = await jobRuntime().enqueue(
    COMPUTER_ANALYSIS_KIND,
    {
      source: { projectId: project.id, caseId: "case", name: "Alice – Bob", pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"], moveTimeMs: 0, hashMb: 16, ...options },
      preset: { id: "default", name: "Default", values: {} },
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

/** The retired kind's id (CTA-232) — the collection merge, a job until merging became the Library's own action. */
const RETIRED_MERGE = "library.collection-merge";

type RetiredMergeInput = { name: string; sources: { id: string; name: string }[] };

/** The merge kind as it was registered — enough of it to leave a reader's stored jobs behind: its file, its summary. */
const retiredMergeKind: JobKind<RetiredMergeInput, { written: boolean }> = {
  id: RETIRED_MERGE,
  version: 1,
  lane: "cpu",
  appliesTo: ["library-collection"],
  resumable: true,
  autoResume: true,
  retry: { maxAttempts: 1, backoff: { initialMs: 1_000, factor: 2, maxMs: 1_000, jitter: false } },
  parseInput: (value) => value as RetiredMergeInput,
  parseState: (value) => value as { written: boolean },
  title: (input) => input.name,
  subjects: (input) => input.sources.map((source) => ({ type: "library-collection", id: source.id })),
  plan: async () => ({ state: { written: false }, progress: { done: 0, total: 2 } }),
  step: async (_state, _input, ctx) => {
    await ctx.artifacts.writePart("pgn", 0, `${game(1)}\n\n${game(2)}\n\n`);
    return { state: { written: true }, progress: { done: 2, total: 2 }, done: true };
  },
  finalize: async (_state, input, ctx) => {
    const name = `${input.name}.pgn`;
    const sealed = await ctx.artifacts.seal("pgn", { name, mimeType: "application/x-chess-pgn" });
    return [
      { key: "pgn-file", kind: "artifact", artifactId: sealed.artifactId, name, mimeType: "application/x-chess-pgn", size: sealed.size },
      { key: "summary", kind: "data", schema: "library.collection-merge.summary@1", value: { name: input.name } },
    ];
  },
  applyOutput: async (plan) => plan as unknown as JobOutput,
};

/**
 * **A reader's merge job from before CTA-232**: two uploads, and a job of
 * the retired kind over them, written by a runtime that still knows it —
 * left queued, or run to its end (its file and its summary) — then that
 * runtime gone. The page's runtime reads it as any record.
 */
const seedRetiredMerge = async (finished: boolean) => {
  const [a, b] = await keepTwo();
  const clock = manualClock();
  const before = createJobRuntime({
    namespace: "test.beforeCta232",
    kinds: [retiredMergeKind],
    lanes: { cpu: { concurrency: 1 } },
    store: indexedDbJobStore({ name: JOBS_DB }),
    lock: memoryLock(),
    clock,
  });
  const queued = await before.enqueue(RETIRED_MERGE, { name: "Merged", sources: [{ id: a.id, name: a.name }, { id: b.id, name: b.name }] });
  if (!("id" in queued)) throw new Error("not queued");
  if (finished) {
    before.start();
    await runToEnd(before, clock, queued.id);
    expect(before.snapshot()?.find((job) => job.id === queued.id)?.status).toBe("done");
  }
  await before.stop();
  return { id: queued.id, a, b };
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
  it("lists every job with its kind and its status — and pauses, resumes and deletes one, asking first", async () => {
    const id = await queueAnalysis();
    mountAt("/jobs");
    const table = await screen.findByTestId("jobs-table");
    const link = await within(table).findByRole("link", { name: "Open the job Alice – Bob" });
    expect(link).toHaveAttribute("href", `/jobs/${id}`);
    expect(within(table).getByTestId(`jobs-table-kind-${id}`)).toHaveTextContent("Computer analysis");
    expect(screen.queryByRole("columnheader", { name: /Applied to/ })).toBeNull();
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

  it("filters by status from over its column, sorts and pages — and passes axe", async () => {
    await queueAnalysis();
    mountAt("/jobs");
    await screen.findByRole("link", { name: "Open the job Alice – Bob" });
    const user = userEvent.setup();
    // The status's filter stands under the Status header.
    const status = within(screen.getByRole("columnheader", { name: /Status/ })).getByRole("combobox", { name: "Status" });
    await user.click(status);
    await user.click(await screen.findByRole("option", { name: "Done" }));
    expect(await screen.findByTestId("jobs-table-no-match")).toHaveTextContent("No job matches the filters.");
    await user.click(screen.getByTestId("jobs-table-clear-filters"));
    expect(await screen.findByRole("link", { name: "Open the job Alice – Bob" })).toBeInTheDocument();
    // Sorted newest first to start; a header turns it; the pager is always there.
    expect(screen.getByRole("columnheader", { name: /Created/ })).toHaveAttribute("aria-sort", "descending");
    await user.click(screen.getByTestId("jobs-table-sort-title"));
    expect(screen.getByRole("columnheader", { name: /Title/ })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("combobox", { name: /Jobs per page/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("is reached from the sidebar's own Jobs folder, and Jobs V2's address is no route", async () => {
    mountAt("/jobs");
    expect(await screen.findByRole("link", { name: "Jobs settings" })).toHaveAttribute("href", "/jobs/settings");
    expect(matchRoutes(appRoutes, "/analysis/jobs")?.at(-1)?.route.path).not.toBe("/analysis/jobs");
  });
});

describe("Resume against the settings in effect (CTA-236)", () => {
  /** A job queued deeper than the current settings, then paused. */
  const pausedDeeper = async () => {
    const id = await queueAnalysis({ depth: 30, minDepth: 30 });
    expect(await jobRuntime().pause(id)).toBeUndefined();
    return id;
  };

  it("asks first on /jobs when the job's settings differ — Cancel leaves it, the job's settings resume it as it is", async () => {
    const id = await pausedDeeper();
    mountAt("/jobs");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByTestId(`jobs-table-status-${id}`)).toHaveTextContent("Paused"));
    await user.click(screen.getByRole("button", { name: "Resume Alice – Bob" }));
    const dialog = await screen.findByRole("dialog", { name: "Engine settings changed" });
    expect(within(dialog).getAllByRole("listitem").map((row) => row.textContent)).toEqual(["Depth: 30 → 20"]);
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(jobRuntime().snapshot()?.find((job) => job.id === id)?.status).toBe("paused");

    await user.click(screen.getByRole("button", { name: "Resume Alice – Bob" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Continue with the job's settings" }));
    await waitFor(() => expect(screen.getByTestId(`jobs-table-status-${id}`)).toHaveTextContent("Queued"));
    expect(jobRuntime().snapshot()?.map((job) => job.id)).toEqual([id]);
  });

  it("continues with the current settings from the job's page: a new job, the old one gone, the page following to it", async () => {
    const id = await pausedDeeper();
    const router = mountAt(`/jobs/${id}`);
    expect(await screen.findByRole("heading", { level: 1, name: "Alice – Bob" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^Resume/ }));
    const dialog = await screen.findByRole("dialog", { name: "Engine settings changed" });
    await user.click(within(dialog).getByRole("button", { name: "Continue with current settings" }));

    await waitFor(() => expect(router.state.location.pathname).not.toBe(`/jobs/${id}`));
    const jobs = jobRuntime().snapshot() ?? [];
    expect(jobs).toHaveLength(1);
    const [next] = jobs;
    expect(next.id).not.toBe(id);
    expect(router.state.location.pathname).toBe(`/jobs/${next.id}`);
    expect(next.input).toMatchObject({ options: { depth: 20 }, continues: { jobId: id, title: "Alice – Bob" } });
    expect(await screen.findByText("Continued with the current settings: Alice – Bob.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Alice – Bob" })).toBeInTheDocument();
    expect(screen.getByTestId("job-parameters")).toHaveTextContent("Continues");
    expect(screen.getByTestId("job-parameters")).toHaveTextContent("Alice – Bob, asked for");
  });

  it("resumes at once a job whose settings are the current ones", async () => {
    const id = await queueAnalysis();
    await jobRuntime().pause(id);
    mountAt(`/jobs/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^Resume/ }));
    await waitFor(() => expect(jobRuntime().snapshot()?.find((job) => job.id === id)?.status).toBe("queued"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("one job — /jobs/<id> (CTA-221)", () => {
  it("shows a reader's finished merge job of the retired kind whole (CTA-232): its subjects, its file to download, its history — Delete alone", async () => {
    const { id, a } = await seedRetiredMerge(true);
    const created = vi.fn((blob: Blob) => (void blob, "blob:merged"));
    vi.stubGlobal("URL", Object.assign(Object.create(URL), URL, { createObjectURL: created, revokeObjectURL: vi.fn() }));
    mountAt(`/jobs/${id}`);

    expect(await screen.findByRole("heading", { level: 1, name: "Merged" })).toBeInTheDocument();
    expect(screen.getByTestId("job-details-status")).toHaveTextContent("Done");
    expect(screen.getByTestId("job-details")).toHaveTextContent("Merge collections (retired)");
    expect(await screen.findByRole("link", { name: a.name })).toHaveAttribute("href", `/library/${a.id}`);
    // A command the runtime would refuse is not offered.
    expect(screen.queryByRole("button", { name: /^Resume/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Delete/ })).toBeEnabled();

    const outputs = screen.getByTestId("job-outputs");
    const user = userEvent.setup();
    await user.click(within(outputs).getByRole("button", { name: "Download Merged.pgn" }));
    await waitFor(() => expect(created).toHaveBeenCalled());
    expect((await created.mock.calls[0][0].text()).match(/\[Event/g)).toHaveLength(2);

    await user.click(within(screen.getByTestId("job-history")).getByRole("button", { name: "History" }));
    expect(within(screen.getByTestId("job-history")).getAllByText("Done").length).toBeGreaterThan(0);
    await expectNoAxeViolations();
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

describe("a reader's queued merge job of the retired kind (CTA-232)", () => {
  it("lists under its old name, never runs, offers Delete alone — and the indicator does not count it", async () => {
    const { id } = await seedRetiredMerge(false);
    mountAt("/jobs");
    const table = await screen.findByTestId("jobs-table");
    expect(await within(table).findByTestId(`jobs-table-kind-${id}`)).toHaveTextContent("Merge collections (retired)");
    expect(within(table).getByTestId(`jobs-table-status-${id}`)).toHaveTextContent("Queued");
    expect(screen.queryByRole("button", { name: "Pause Merged" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel Merged" })).toBeNull();
    // The kind filter offers it, beside the kinds the app runs.
    const user = userEvent.setup();
    await user.click(within(screen.getByRole("columnheader", { name: /Kind/ })).getByRole("combobox", { name: "Kind" }));
    expect(await screen.findByRole("option", { name: "Merge collections (retired)" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    // The page's runtime leaves it where it is.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(jobRuntime().snapshot()?.find((job) => job.id === id)?.status).toBe("queued");
    expect(screen.queryByTestId("jobs-indicator")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Delete Merged" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(jobRuntime().snapshot()).toEqual([]));
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
    // The tab's button and the dialog are the computer analysis's (CTA-241) — "New job" elsewhere.
    expect(screen.queryByRole("button", { name: "New job" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Computer analysis" }));
    const dialog = await screen.findByRole("dialog", { name: "Computer analysis" });
    expect(within(dialog).getByRole("radio", { name: /Computer analysis/ })).toBeChecked();
    // Its Engine section folded, its choice said on one line.
    const engine = within(dialog).getByRole("button", { name: "Engine" });
    expect(engine).toHaveAttribute("aria-expanded", "false");
    expect(engine).toHaveAccessibleDescription(/depth \d+ · (\d+ s a move|no time limit)$/);
    expect(within(dialog).queryByRole("slider", { name: "Depth" })).toBeNull();
    await user.click(engine);
    expect(within(dialog).getByRole("slider", { name: "Depth" })).toBeVisible();
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
    // Its Engine section folds as the computer analysis's (CTA-241).
    expect(within(dialog).getByRole("button", { name: "Engine" })).toHaveAttribute("aria-expanded", "false");
    await user.click(within(dialog).getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("link", { name: "Open job" })).toBeInTheDocument();
    expect(jobRuntime().snapshot()?.find((each) => each.kind === REPERTOIRE_EVALUATION_KIND)?.subjects).toEqual([{ type: "repertoire", id: "rep1" }]);
  });
});
