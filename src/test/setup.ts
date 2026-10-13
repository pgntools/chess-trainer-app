import "@testing-library/jest-dom/vitest";
// jsdom has no IndexedDB, and every store of the reader's data is kept there
// (`.claude/rules/database.md`). An in-memory implementation of the real
// API, so the store's own code is what the tests run.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

import { DEVELOPMENT_NOTICE_KEY, resetDevelopmentNotice } from "../lib/developmentNotice";
import { resetSearchPreferences } from "../lib/engineSearchSettings";

/*
  How long a `findBy…` / `waitFor` waits: 5 s, not testing-library's 1 s —
  for the reason `vite.config.ts` raises the per-test timeout. A screen that
  writes IndexedDB and then navigates lands within a second alone, but not
  always with three heavy files on the other workers: Library's post-write
  waits ran out that way, a different one each run, each passing when re-run
  alone (CTA-124). A wait that is met returns at once, so only a real miss
  takes longer to report. A call that needs longer still passes its own.
*/
configure({ asyncUtilTimeout: 5_000 });

// MUI's color-scheme provider reads `prefers-color-scheme`, which jsdom does not
// implement. Without this every render throws before a single assertion runs.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom ships no ResizeObserver, and `Layout` constructs one to keep the board
// square in sync with its container. A no-op stub is enough — the layout tests
// drive re-measurement through the `resize` event listener instead.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

/*
  The record stores are imported here lazily, at teardown, not at the top of
  this file: a setup file's static imports load before a test file's
  `vi.mock`s apply, and the played games reach `lib/pieceMask.ts`, which would
  then hold the real `react-chessboard` rather than the test's stand-in. By
  teardown the test file has loaded them itself (with its mocks), so these are
  cache hits.
*/
const recordStores = async () => {
  const [played, repertoires, repertoireFolders, repertoireDb, libraryFolders, presets, projectFolders, projects, cases, projectsDb, jobsV2, jobV2Runner, caseLinks] =
    await Promise.all([
      import("../lib/playedGameStore"),
      import("../lib/savedRepertoireStore"),
      import("../lib/savedRepertoireFolderStore"),
      import("../lib/savedRepertoireDb"),
      import("../lib/libraryFolderStore"),
      import("../lib/enginePresetStore"),
      // Analysis V2 (CTA-186): its folders, Projects and Cases.
      import("../lib/analysisProjectFolderStore"),
      import("../lib/analysisProjectStore"),
      import("../lib/analysisCaseStore"),
      import("../lib/analysisProjectsDb"),
      // Jobs V2 and the links between Cases (CTA-188), in the same database.
      import("../lib/jobV2Store"),
      import("../lib/jobV2Runner"),
      import("../lib/analysisCaseLinkStore"),
    ]);
  // The search settings in effect (CTA-185) read the presets — imported lazily, as the stores are.
  const { resetEngineSearchSettings } = await import("../lib/engineSearchInEffect");
  return {
    // The page's job runner (CTA-173, CTA-188), stopped before the stores settle: it writes to them.
    stop: [jobV2Runner.stopJobV2Runner],
    settled: [
      played.settledPlayedGames,
      repertoires.settledSavedRepertoires,
      repertoireFolders.settledRepertoireFolders,
      libraryFolders.settledLibraryFolders,
      presets.settledEnginePresets,
      presets.settledEnginePresetSelections,
      projectFolders.settledProjectFolders,
      projects.settledAnalysisProjects,
      cases.settledAnalysisCases,
      jobsV2.settledJobsV2,
      caseLinks.settledCaseLinks,
    ],
    reset: [
      played.resetPlayedGameStore,
      repertoires.resetSavedRepertoireStore,
      repertoireFolders.resetRepertoireFolderStore,
      libraryFolders.resetLibraryFolderStore,
      presets.resetEnginePresetStore,
      presets.resetEnginePresetSelectionStore,
      projectFolders.resetProjectFolderStore,
      projects.resetAnalysisProjectStore,
      cases.resetAnalysisCaseStore,
      jobsV2.resetJobV2Store,
      caseLinks.resetCaseLinkStore,
      // A depth or move time still landing goes with the presets.
      resetEngineSearchSettings,
    ],
    remove: [played.deleteEngineDb, repertoireDb.deleteRepertoireDb, presets.deleteEnginePresetsDb, projectsDb.deleteAnalysisProjectsDb],
  };
};

/*
  The in-development notice (CTA-155) is a modal that opens on the first load
  of a session, and a modal hides the rest of the page from a screen reader's
  queries. So a test starts in a session where it was already dismissed; the
  notice's own tests remove the key to meet it.
*/
beforeEach(() => {
  resetDevelopmentNotice();
  sessionStorage.setItem(DEVELOPMENT_NOTICE_KEY, "1");
});

afterEach(async () => {
  cleanup();
  localStorage.clear();
  // The engine's search settings (CTA-181) are a preference: what this visit kept goes with the storage.
  resetSearchPreferences();
  // Every record store is IndexedDB's: what each store kept, and the
  // databases themselves, go as `localStorage` does. (The Library's
  // database is deleted by the tests that use it — `resetLibraryCollectionStore`;
  // its folder store is forgotten here with the others.) First
  // the writes a screen left in flight land, five times over — a folder's
  // delete queues its records' unfiling behind it, and Analysis V2's deep
  // delete its Projects', their Cases', their Jobs V2 and their links
  // (CTA-188) — so none reaches the next test.
  const stores = await recordStores();
  // The Jobs settings (CTA-193) are a preference too, and the eval API's status goes with them.
  (await import("../lib/jobsSettings")).resetJobsSettings();
  for (const stop of stores.stop) stop();
  for (let round = 0; round < 5; round += 1) {
    await Promise.all(stores.settled.map((settled) => settled()));
  }
  for (const reset of stores.reset) reset();
  await Promise.all(stores.remove.map((remove) => remove()));
});
