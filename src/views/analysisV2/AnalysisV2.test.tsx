import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { strToU8, zipSync } from "fflate";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../i18n";
import {
  addAnalysisCases,
  analysisCasesSnapshot,
  loadAnalysisCases,
  moveAnalysisCaseInOrder,
  resetAnalysisCaseStore,
  settledAnalysisCases,
} from "../../lib/analysisCaseStore";
import { createProjectFolder, projectFoldersSnapshot } from "../../lib/analysisProjectFolderStore";
import {
  analysisProjectsSnapshot,
  createAnalysisProject,
  loadAnalysisProjects,
  resetAnalysisProjectStore,
} from "../../lib/analysisProjectStore";
import { gameCaseOf, positionCaseOfFen, type AnalysisCase } from "../../lib/analysisProjects";
import { parsePgnTree } from "../../lib/pgn";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { boardOptions, FakeEngine } from "../board/boardTestHarness";
import { BoardLeftPanelOutlet, BoardLeftPanelProvider } from "../main/boardLeftPanel";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});
// The Cases' writes pass through as they are — a test can hold one open to see the save under way (CTA-208).
vi.mock("../../lib/analysisCaseStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/analysisCaseStore")>();
  return { ...actual, addAnalysisCases: vi.fn(actual.addAnalysisCases) };
});
vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../lib/openings")>);
});

import CaseWorkspace from "./CaseWorkspace";
import ProjectScreen from "./ProjectScreen";
import ProjectsBrowser from "./ProjectsBrowser";

/*
  Analysis V2 (CTA-186) over the real stores (fake-indexeddb): the Projects
  browser's folders and Projects, a Project's Cases and the new-Case dialog,
  and a Case's board — opened where its record says, every change autosaved
  and found again after a reload.
*/

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const ENDGAME = "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41";
const GAME = `[Event "Club Championship"]
[Date "2024.03.05"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 e5 (1... c5) 2. Nf3 {A plan} Nc6 1-0`;

/** Where the router is. */
function Where() {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
}

const mount = (entry: string, { compact = false } = {}) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <BoardLeftPanelProvider>
            <Routes>
              <Route path="/analysis" element={<ProjectsBrowser />} />
              <Route path="/analysis/projects/:projectId" element={<ProjectScreen />} />
              <Route path="/analysis/projects/:projectId/cases/:caseId" element={<CaseWorkspace />} />
            </Routes>
            <Where />
            <BoardLeftPanelOutlet compact={compact} />
            <RightPanelOutlet />
          </BoardLeftPanelProvider>
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const where = () => screen.getByTestId("where").textContent;

/** A reload: what was read is forgotten, and comes back from IndexedDB itself. */
const reload = async () => {
  await settledAnalysisCases();
  resetAnalysisProjectStore();
  resetAnalysisCaseStore();
  await Promise.all([loadAnalysisProjects(), loadAnalysisCases()]);
};

const gameCase = (projectId: string, id = "cgame"): AnalysisCase =>
  gameCaseOf({ id, projectId, name: "" }, parsePgnTree(GAME));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the Projects browser (CTA-186)", () => {
  it("makes a folder, and a Project in it that opens at once", async () => {
    const user = userEvent.setup();
    const { baseElement } = mount("/analysis");
    expect(await screen.findByTestId("analysis-v2-list-empty")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New folder" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Openings{Enter}");
    const folderRow = await screen.findByTestId(/^analysis-v2-list-row-folder-g[0-9a-z]+$/);
    expect(folderRow).toHaveTextContent("Openings");
    expect(folderRow).toHaveTextContent("0 projects");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expectNoAxeViolations(baseElement);

    await user.click(within(folderRow).getByRole("link", { name: "Go into Openings" }));
    expect(await screen.findByRole("navigation", { name: "Folders" })).toHaveTextContent("All projects");
    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Najdorf{Enter}");
    await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/));
    expect(analysisProjectsSnapshot()).toEqual([
      expect.objectContaining({ name: "Najdorf", folderId: projectFoldersSnapshot()![0].id }),
    ]);
  });

  it("will not let a Project be made without a name", async () => {
    const user = userEvent.setup();
    mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "New project" }));
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("makes a Project of a one-game .pgn, its game the one Case, named after the file", async () => {
    const user = userEvent.setup();
    mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "New project" }));
    await user.upload(screen.getByTestId("analysis-v2-new-project-dialog-file-input"), new File([GAME], "club.pgn"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("club");
    // One game: nothing to choose, so it waits for Create (CTA-208).
    await waitFor(() => expect(screen.getByRole("button", { name: "Create" })).toBeEnabled());
    expect(screen.queryByTestId("analysis-v2-choose-games")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/));
    expect(analysisProjectsSnapshot()).toEqual([expect.objectContaining({ name: "club" })]);
    expect(analysisCasesSnapshot()).toEqual([
      expect.objectContaining({ type: "game", projectId: analysisProjectsSnapshot()![0].id }),
    ]);
  });

  it("makes a Project of a zip of .pgn files — every game of every file in the choice", async () => {
    const SECOND = GAME.replace("Carlsen", "Ding").replace("Caruana", "Nepomniachtchi");
    const zip = zipSync({ "club/one.pgn": strToU8(GAME), "club/two.pgn": strToU8(SECOND) });
    const user = userEvent.setup();
    mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "New project" }));
    await user.upload(
      screen.getByTestId("analysis-v2-new-project-dialog-file-input"),
      new File([zip], "club.zip", { type: "application/zip" }),
    );
    // Several games: straight on to the choice, no Create to press (CTA-208).
    const choice = await screen.findByTestId("analysis-v2-choose-games");
    expect(screen.getByTestId("analysis-v2-choose-games-file-0")).toHaveTextContent("club/one.pgn");
    expect(screen.getByTestId("analysis-v2-choose-games-count")).toHaveTextContent("2 of 2");
    await user.click(within(choice).getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/));
    expect(analysisCasesSnapshot()).toHaveLength(2);
  });

  it("says a zip with no .pgn in it", async () => {
    const user = userEvent.setup();
    mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "New project" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Club");
    await user.upload(
      screen.getByTestId("analysis-v2-new-project-dialog-file-input"),
      new File([zipSync({ "notes.txt": strToU8("hello") })], "notes.zip", { type: "application/zip" }),
    );
    // Said as soon as it is picked.
    expect(await screen.findByTestId("analysis-v2-new-project-dialog-problem")).toHaveTextContent(
      "There is no .pgn file in that zip.",
    );
    expect(analysisProjectsSnapshot()).toEqual([]);
  });

  it("makes a Project of several games — those kept in the Library's popup, each a Case", async () => {
    const SECOND = GAME.replace("Carlsen", "Ding").replace("Caruana", "Nepomniachtchi");
    const THIRD = GAME.replace("Carlsen", "Firouzja").replace("Caruana", "Gukesh");
    const user = userEvent.setup();
    const { baseElement } = mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "New project" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Club");
    await user.upload(
      screen.getByTestId("analysis-v2-new-project-dialog-file-input"),
      new File([`${GAME}\n\n${SECOND}\n\n${THIRD}`], "club.pgn"),
    );

    const choice = await screen.findByTestId("analysis-v2-choose-games");
    expect(within(choice).getByText("Choose the games for the project")).toBeInTheDocument();
    // The Library's filters, without its split or its tournament mark.
    expect(screen.queryByTestId("analysis-v2-choose-games-split")).toBeNull();
    expect(screen.getByTestId("analysis-v2-choose-games-count")).toHaveTextContent("3 of 3");
    await expectNoAxeViolations(baseElement);
    await user.type(within(choice).getByRole("combobox", { name: "Players" }), "Ding{Enter}");
    expect(screen.getByTestId("analysis-v2-choose-games-count")).toHaveTextContent("1 of 3");
    await user.click(within(choice).getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/));
    expect(analysisProjectsSnapshot()).toEqual([expect.objectContaining({ name: "Club" })]);
    expect(analysisCasesSnapshot()).toHaveLength(1);
    expect(analysisCasesSnapshot()![0].pgn).toContain('[White "Ding"]');
  });

  it("makes a Project of the games picked by hand, among those the filters keep (CTA-208)", async () => {
    const SECOND = GAME.replace("Carlsen", "Ding").replace("Caruana", "Nepomniachtchi");
    const THIRD = GAME.replace("Carlsen", "Firouzja").replace("Caruana", "Gukesh");
    const user = userEvent.setup();
    mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "New project" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Club");
    await user.upload(
      screen.getByTestId("analysis-v2-new-project-dialog-file-input"),
      new File([`${GAME}\n\n${SECOND}\n\n${THIRD}`], "club.pgn"),
    );

    const choice = await screen.findByTestId("analysis-v2-choose-games");
    await user.type(within(choice).getByRole("combobox", { name: "Players" }), "Ding{Enter}Firouzja{Enter}");
    expect(screen.getByTestId("analysis-v2-choose-games-count")).toHaveTextContent("2 of 3");
    await user.click(within(choice).getByRole("button", { name: "Select games…" }));
    const picker = screen.getByRole("dialog", { name: "Select games" });
    // The picker's table holds what the filters keep: Carlsen's game is not in it.
    expect(within(picker).queryByRole("checkbox", { name: "Select Carlsen – Caruana" })).toBeNull();
    await user.click(within(picker).getByRole("checkbox", { name: "Select Firouzja – Gukesh" }));
    await user.click(within(picker).getByRole("button", { name: "Select" }));
    expect(await screen.findByText("1 game picked.")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-v2-choose-games-count")).toHaveTextContent("1 of 3");
    await user.click(await screen.findByRole("button", { name: "Create project" }));

    await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/));
    expect(analysisCasesSnapshot()).toHaveLength(1);
    expect(analysisCasesSnapshot()![0].pgn).toContain('[White "Firouzja"]');
  });

  describe("making a Project of many games (CTA-208)", () => {
    const THREE = () => {
      const SECOND = GAME.replace("Carlsen", "Ding").replace("Caruana", "Nepomniachtchi");
      const THIRD = GAME.replace("Carlsen", "Firouzja").replace("Caruana", "Gukesh");
      return new File([`${GAME}\n\n${SECOND}\n\n${THIRD}`], "club.pgn");
    };
    const openChoice = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole("button", { name: "New project" }));
      await user.type(screen.getByRole("textbox", { name: "Name" }), "Club");
      await user.upload(screen.getByTestId("analysis-v2-new-project-dialog-file-input"), THREE());
      return screen.findByTestId("analysis-v2-choose-games");
    };

    it("shows the progress while it makes the cases — Cancel off once it saves", async () => {
      const { addAnalysisCases: actualAdd } = await vi.importActual<typeof import("../../lib/analysisCaseStore")>("../../lib/analysisCaseStore");
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      vi.mocked(addAnalysisCases).mockImplementationOnce(async (...args) => {
        await gate;
        return actualAdd(...args);
      });
      const user = userEvent.setup();
      mount("/analysis");
      const choice = await openChoice(user);
      await user.click(within(choice).getByRole("button", { name: "Create project" }));
      const progress = await screen.findByRole("dialog", { name: "Creating the project" });
      expect(within(progress).getByText("Saving the cases…")).toBeInTheDocument();
      expect(within(progress).getByRole("button", { name: "Cancel" })).toBeDisabled();
      act(() => release());
      await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/));
      expect(analysisCasesSnapshot()).toHaveLength(3);
    });

    it("asks before going past the app's limit of cases, with the numbers — and goes on only when told to", async () => {
      const kept = (await createAnalysisProject("Kept", null))!;
      await addAnalysisCases(
        Array.from({ length: 9_999 }, (_, index) => positionCaseOfFen({ id: `k${index}`, projectId: kept.id, name: "" }, "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1")),
      );
      const user = userEvent.setup();
      mount("/analysis");
      const choice = await openChoice(user);
      await user.click(within(choice).getByRole("button", { name: "Create project" }));
      const ask = await screen.findByRole("dialog", { name: "More cases than the app's limit" });
      expect(ask).toHaveTextContent(
        "These games make 3 cases. With the 9,999 already kept, that is 10,002 — past the app's limit of 10,000.",
      );
      // Asked before any work: nothing written while it waits.
      expect(analysisProjectsSnapshot()).toHaveLength(1);
      await user.click(within(ask).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "More cases than the app's limit" })).toBeNull());
      expect(analysisProjectsSnapshot()).toHaveLength(1);

      await user.click(await screen.findByRole("button", { name: "Create project" }));
      await user.click(within(await screen.findByRole("dialog", { name: "More cases than the app's limit" })).getByRole("button", { name: "Create anyway" }));
      await waitFor(() => expect(where()).toMatch(/^\/analysis\/projects\/g/), { timeout: 15_000 });
      expect(analysisCasesSnapshot()).toHaveLength(10_002);
    }, 60_000);

    it("says the browser's own words when it refuses to save the cases, and keeps nothing", async () => {
      const put = IDBObjectStore.prototype.put;
      const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args) {
        if (this.name === "cases") throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        return put.apply(this, args);
      });
      try {
        const user = userEvent.setup();
        mount("/analysis");
        const choice = await openChoice(user);
        await user.click(within(choice).getByRole("button", { name: "Create project" }));
        expect(await screen.findByTestId("analysis-v2-choose-games-problem")).toHaveTextContent(
          "Not created — the browser refused to save the cases: QuotaExceededError: The quota has been exceeded.",
        );
      } finally {
        spy.mockRestore();
      }
      await waitFor(() => expect(analysisProjectsSnapshot()).toEqual([]));
      expect(analysisCasesSnapshot()).toEqual([]);
    });
  });

  it("renames, moves and duplicates a Project — no row deletes itself", async () => {
    const folder = (await createProjectFolder("Endgames", null))!;
    const project = (await createAnalysisProject("Najdorf", null))!;
    await addAnalysisCases([gameCase(project.id, "c1"), gameCase(project.id, "c2")]);
    const user = userEvent.setup();
    mount("/analysis");

    await user.click(await screen.findByRole("button", { name: "Rename Najdorf" }));
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Sicilian{Enter}");
    expect(await screen.findByRole("link", { name: "Open Sicilian" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Duplicate Sicilian" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Sicilian (copy)");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("link", { name: "Open Sicilian (copy)" })).toBeInTheDocument();
    await waitFor(() => expect(analysisCasesSnapshot()).toHaveLength(4));

    await user.click(screen.getByRole("button", { name: "Move Sicilian (copy)" }));
    await user.click(within(screen.getByRole("list", { name: "Folder" })).getByRole("button", { name: "Endgames" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("link", { name: "Open Sicilian (copy)" })).toBeNull();
    expect(screen.getByTestId(`analysis-v2-list-row-folder-${folder.id}`)).toHaveTextContent("1 project");

    expect(screen.queryByRole("button", { name: "Delete Sicilian" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete Endgames" })).toBeNull();
  });

  it("deletes the picks together — a folder whole, a Project with its Cases, a Case — after saying how many of each", async () => {
    const outer = (await createProjectFolder("Openings", null))!;
    const inner = (await createProjectFolder("Sicilian", outer.id))!;
    const najdorf = (await createAnalysisProject("Najdorf", inner.id))!;
    const club = (await createAnalysisProject("Club games", null))!;
    const kept = (await createAnalysisProject("Kept", null))!;
    await addAnalysisCases([
      gameCase(najdorf.id, "c1"),
      gameCase(club.id, "c2"),
      { ...positionCaseOfFen({ id: "c3", projectId: club.id, name: "Endgame" }, ENDGAME) },
      gameCase(kept.id, "c4"),
    ]);
    const user = userEvent.setup();
    const { baseElement } = mount("/analysis");

    const deletePicked = await screen.findByRole("button", { name: "Delete the picked items" });
    expect(deletePicked).toBeDisabled();
    // Openings ticked: its sub-folder, Najdorf and its Case go with it.
    await user.click(screen.getByRole("checkbox", { name: "Pick Openings" }));
    expect(screen.getByTestId("analysis-v2-selection")).toHaveTextContent("4 selected");
    // One of Club games' Cases: the Project is partly ticked, not taken.
    await user.click(screen.getByRole("button", { name: "Show the cases of Club games" }));
    await user.click(screen.getByRole("checkbox", { name: "Pick Endgame" }));
    expect(screen.getByRole("checkbox", { name: "Pick Club games" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pick Club games" })).toHaveAttribute("data-indeterminate", "true");
    expect(screen.getByTestId("analysis-v2-selection")).toHaveTextContent("5 selected");
    await expectNoAxeViolations(baseElement);

    await user.click(deletePicked);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Delete 5 items?");
    expect(dialog).toHaveTextContent("This deletes 2 folders, 1 project, and 2 cases");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(analysisCasesSnapshot()?.map((record) => record.id).sort()).toEqual(["c2", "c4"]));
    expect(projectFoldersSnapshot()).toEqual([]);
    expect(analysisProjectsSnapshot()?.map((project) => project.name).sort()).toEqual(["Club games", "Kept"]);
    // The picks went with what they named.
    expect(screen.getByRole("button", { name: "Delete the picked items" })).toBeDisabled();
  });

  it("steps out of a folder the picks deleted to the nearest one that survives", async () => {
    const outer = (await createProjectFolder("Outer", null))!;
    const inner = (await createProjectFolder("Inner", outer.id))!;
    const deepest = (await createProjectFolder("Deepest", inner.id))!;
    await createAnalysisProject("Kept", outer.id);
    const user = userEvent.setup();
    mount(`/analysis?folder=${deepest.id}`);

    // From inside Deepest, up to Outer: tick Inner there, delete — the reader stood inside it.
    await user.click(await screen.findByRole("link", { name: "Outer" }));
    expect(where()).toBe(`/analysis?folder=${outer.id}`);
    await user.click(await screen.findByRole("checkbox", { name: "Pick Inner" }));
    await user.click(screen.getByRole("link", { name: "Go into Inner" }));
    expect(where()).toBe(`/analysis?folder=${inner.id}`);
    // The picks outlived the step into the folder.
    expect(screen.getByTestId("analysis-v2-selection")).toHaveTextContent("2 selected");
    await user.click(screen.getByRole("button", { name: "Delete the picked items" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("This deletes 2 folders —");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(where()).toBe(`/analysis?folder=${outer.id}`));
    expect(projectFoldersSnapshot()?.map((folder) => folder.name)).toEqual(["Outer"]);
    expect(analysisProjectsSnapshot()).toHaveLength(1);
  });

  it("opens a Project in place, its Cases under it — a Case's name opens its board — and finds a Case by words", async () => {
    const outer = (await createProjectFolder("Openings", null))!;
    const project = (await createAnalysisProject("Najdorf", outer.id))!;
    await addAnalysisCases([gameCase(project.id, "cgame"), positionCaseOfFen({ id: "cpos", projectId: project.id, name: "" }, ENDGAME)]);
    const user = userEvent.setup();
    mount("/analysis");
    const table = await screen.findByRole("table", { name: "Folders, projects and cases" });

    // The words name a Case: its Project and folder opened for it, the other Case left out.
    const words = screen.getByRole("searchbox", { name: "Filter folders, projects and cases" });
    await user.type(words, "caruana");
    expect(within(table).getByTestId("analysis-v2-list-row-case-cgame")).toBeInTheDocument();
    expect(within(table).queryByTestId("analysis-v2-list-row-case-cpos")).toBeNull();
    await user.clear(words);

    // Opened by hand: the folder's chevron, then a click on the Project's row.
    await user.click(within(table).getByRole("button", { name: "Open Openings" }));
    await user.click(within(table).getByTestId(`analysis-v2-list-row-${project.id}`));
    const game = within(table).getByTestId("analysis-v2-list-row-case-cgame");
    expect(game).toHaveTextContent("Carlsen – Caruana, Club Championship, 2024");
    expect(game).toHaveTextContent("Game");
    expect(within(table).getByTestId("analysis-v2-list-row-case-cpos")).toHaveTextContent("Black to move, move 41Position");
    expect(where()).toBe("/analysis");
    await user.click(within(table).getByRole("button", { name: "Hide the cases of Najdorf" }));
    expect(within(table).queryByTestId("analysis-v2-list-row-case-cgame")).toBeNull();
    await user.click(within(table).getByRole("button", { name: "Show the cases of Najdorf" }));

    await user.click(within(table).getByRole("link", { name: "Open Carlsen – Caruana, Club Championship, 2024" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cgame`);
  });

  it("opens a folder in place, and finds a Project by words — the folders above it opened", async () => {
    const outer = (await createProjectFolder("Openings", null))!;
    const inner = (await createProjectFolder("Sicilian", outer.id))!;
    await createAnalysisProject("Najdorf ideas", inner.id);
    await createAnalysisProject("Club games", null);
    const user = userEvent.setup();
    const { baseElement } = mount("/analysis");
    const table = await screen.findByRole("table", { name: "Folders, projects and cases" });
    const shown = () =>
      within(table)
        .getAllByTestId(/^analysis-v2-list-row-(?!.*-toggle(-icon)?$)/)
        .map((row) => row.textContent);
    expect(shown()).toEqual([expect.stringContaining("Openings"), expect.stringContaining("Club games")]);
    await expectNoAxeViolations(baseElement);

    // A folder's chevron opens it where it stands.
    await user.click(within(table).getByRole("button", { name: "Open Openings" }));
    expect(shown()).toHaveLength(3);
    expect(shown()[1]).toContain("Sicilian");
    expect(where()).toBe("/analysis");

    // The words: Najdorf, inside two folders — both opened for it, the rest left out.
    await user.type(screen.getByRole("searchbox", { name: "Filter folders, projects and cases" }), "najdorf");
    expect(shown()).toEqual([
      expect.stringContaining("Openings"),
      expect.stringContaining("Sicilian"),
      expect.stringContaining("Najdorf ideas"),
    ]);
    expect(where()).toBe("/analysis?q=najdorf");
    await user.clear(screen.getByRole("searchbox", { name: "Filter folders, projects and cases" }));
    await user.type(screen.getByRole("searchbox", { name: "Filter folders, projects and cases" }), "zzz");
    expect(screen.getByTestId("analysis-v2-list-no-match")).toHaveTextContent("No folder, project or case matches the filter.");
  });

  it("will not move a folder into its own subtree", async () => {
    const outer = (await createProjectFolder("Outer", null))!;
    const inner = (await createProjectFolder("Inner", outer.id))!;
    const user = userEvent.setup();
    mount("/analysis");
    await user.click(await screen.findByRole("button", { name: "Move Outer" }));
    const picker = screen.getByRole("list", { name: "Folder" });
    expect(within(picker).queryByRole("button", { name: "Inner" })).toBeNull();
    expect(screen.queryByTestId(`analysis-v2-move-picker-${inner.id}`)).toBeNull();
  });

  it("says a folder that is not there", async () => {
    mount("/analysis?folder=gone");
    expect(await screen.findByTestId("analysis-v2-folder-missing")).toBeInTheDocument();
  });
});

describe("a Project's Cases (CTA-186)", () => {
  /** Paste a PGN into the dialog's box and read it. */
  const pastePgn = async (text: string) => {
    fireEvent.change(screen.getByRole("textbox", { name: "Paste a PGN" }), { target: { value: text } });
    await userEvent.click(screen.getByRole("button", { name: "Read" }));
  };

  it("tables each Case — a Game's tags in its columns, a Position's blank — sorted and filtered by words", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([
      gameCase(project.id),
      positionCaseOfFen({ id: "cpos", projectId: project.id, name: "" }, ENDGAME),
    ]);
    const user = userEvent.setup();
    const { baseElement } = mount(`/analysis/projects/${project.id}`);
    const table = await screen.findByRole("table", { name: "Cases" });
    const game = within(table).getByTestId("analysis-v2-cases-row-cgame");
    expect(game).toHaveTextContent("Carlsen – Caruana, Club Championship, 2024");
    expect(game).toHaveTextContent("Caruana");
    expect(game).toHaveTextContent("1-0");
    const position = within(table).getByTestId("analysis-v2-cases-row-cpos");
    expect(position).toHaveTextContent("Black to move, move 41");
    expect(position).toHaveTextContent("Position");
    await expectNoAxeViolations(baseElement);

    // A sort is the URL's.
    await user.click(within(table).getByRole("button", { name: "White" }));
    expect(where()).toContain("sort=white");

    // The words box keeps the rows holding every word.
    await user.type(screen.getByRole("searchbox", { name: "Filter cases" }), "carlsen 2024");
    expect(within(table).queryByTestId("analysis-v2-cases-row-cpos")).toBeNull();
    expect(within(table).getByTestId("analysis-v2-cases-row-cgame")).toBeInTheDocument();
    expect(where()).toContain("q=carlsen");
    await user.clear(screen.getByRole("searchbox", { name: "Filter cases" }));
    await user.type(screen.getByRole("searchbox", { name: "Filter cases" }), "nobody");
    expect(screen.getByTestId("analysis-v2-cases-no-match")).toHaveTextContent("No case matches the filter.");
    await user.click(screen.getByTestId("analysis-v2-cases-no-match-clear"));
    expect(within(table).getAllByTestId(/^analysis-v2-cases-row-/)).toHaveLength(2);
  });

  it("shows the trail to a nested Project — every folder a link into the browser, the Project current (CTA-207)", async () => {
    const outer = (await createProjectFolder("Openings", null))!;
    const inner = (await createProjectFolder("Sicilian", outer.id))!;
    const project = (await createAnalysisProject("Najdorf", inner.id))!;
    const user = userEvent.setup();
    const { baseElement } = mount(`/analysis/projects/${project.id}`);

    const trail = await screen.findByRole("navigation", { name: "Folders" });
    expect(within(trail).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "All projects",
      "Openings",
      "Sicilian",
    ]);
    expect(within(trail).getByRole("link", { name: "All projects" })).toHaveAttribute("href", "/analysis");
    expect(within(trail).getByRole("link", { name: "Openings" })).toHaveAttribute("href", `/analysis?folder=${outer.id}`);
    expect(within(trail).getByRole("link", { name: "Sicilian" })).toHaveAttribute("href", `/analysis?folder=${inner.id}`);
    const current = within(trail).getByText("Najdorf");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
    // The Back button stays beside it.
    expect(screen.getByTestId("analysis-v2-project-back")).toBeInTheDocument();
    await expectNoAxeViolations(baseElement);

    await user.click(within(trail).getByRole("link", { name: "Openings" }));
    expect(where()).toBe(`/analysis?folder=${outer.id}`);
  });

  it("trails a Project at the top level from the root alone, in Hebrew too (CTA-207)", async () => {
    await i18n.changeLanguage("he");
    const project = (await createAnalysisProject("נאיידורף", null))!;
    const { baseElement } = mount(`/analysis/projects/${project.id}`);

    const trail = await screen.findByRole("navigation", { name: "תיקיות" });
    expect(within(trail).getAllByRole("link").map((link) => link.textContent)).toEqual(["כל הפרויקטים"]);
    expect(within(trail).getByRole("link", { name: "כל הפרויקטים" })).toHaveAttribute("href", "/analysis");
    expect(screen.getByTestId("analysis-v2-project-trail-current")).toHaveTextContent("נאיידורף");
    await expectNoAxeViolations(baseElement);
  });

  it("deletes the picked Cases together — some, or all — after asking", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id, "c1"), gameCase(project.id, "c2"), gameCase(project.id, "c3")]);
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}`);
    await screen.findByRole("table", { name: "Cases" });
    const deletePicked = screen.getByRole("button", { name: "Delete the picked cases" });
    expect(deletePicked).toBeDisabled();

    await user.click(within(screen.getByTestId("analysis-v2-cases-row-c1")).getByRole("checkbox"));
    expect(screen.getByTestId("analysis-v2-cases-selected-count")).toHaveTextContent("1 selected");
    await user.click(deletePicked);
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete 1 case?");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(analysisCasesSnapshot()!.map((record) => record.id)).toEqual(["c2", "c3"]));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("checkbox", { name: "Select all cases" }));
    expect(screen.getByTestId("analysis-v2-cases-selected-count")).toHaveTextContent("2 selected");
    await user.click(screen.getByRole("button", { name: "Delete the picked cases" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete 2 cases?");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByTestId("analysis-v2-cases-empty")).toBeInTheDocument();
    expect(analysisCasesSnapshot()).toEqual([]);
  });

  it("makes a Game Case of a pasted PGN and opens it", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}`);
    await user.click(await screen.findByRole("button", { name: "New case" }));
    await pastePgn(GAME);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(where()).toMatch(new RegExp(`^/analysis/projects/${project.id}/cases/g`)));
    expect(analysisCasesSnapshot()).toEqual([expect.objectContaining({ type: "game", projectId: project.id })]);
    // The board: the game at its start, facing White.
    expect(await screen.findByTestId("board")).toHaveAttribute("data-position", START);
    expect(boardOptions().boardOrientation).toBe("white");
  });

  it("makes a Position Case of a FEN", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}`);
    await user.click(await screen.findByRole("button", { name: "New case" }));
    await user.click(screen.getByRole("radio", { name: "Position" }));
    fireEvent.change(screen.getByRole("textbox", { name: "FEN" }), { target: { value: ENDGAME } });
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByTestId("board")).toHaveAttribute("data-position", ENDGAME);
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("renames, moves and duplicates a Case — and no row deletes itself (CTA-203)", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const other = (await createAnalysisProject("Other", null))!;
    await addAnalysisCases([gameCase(project.id)]);
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}`);
    const original = "Carlsen – Caruana, Club Championship, 2024";

    await user.click(await screen.findByRole("button", { name: `Rename ${original}` }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Brilliancy{Enter}");
    expect(await screen.findByRole("link", { name: "Open Brilliancy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Duplicate Brilliancy" }));
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(await screen.findByRole("link", { name: "Open Brilliancy (copy)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Move Brilliancy (copy)" }));
    await user.click(within(screen.getByRole("list", { name: "Project" })).getByRole("button", { name: "Other" }));
    await user.click(screen.getByRole("button", { name: "Move" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("link", { name: "Open Brilliancy (copy)" })).toBeNull();
    expect(analysisCasesSnapshot()!.find((record) => record.name === "Brilliancy (copy)")!.projectId).toBe(other.id);

    // Deleting is the picks' alone.
    expect(screen.queryByRole("button", { name: "Delete Brilliancy" })).toBeNull();
    expect(screen.queryByTestId("analysis-v2-case-delete")).toBeNull();
  });

  it("has a panel of its own beside the Cases — headed by the Project, two tabs, an example switch that toggles (CTA-213)", async () => {
    const project = (await createAnalysisProject("Najdorf", null))!;
    const user = userEvent.setup();
    const { baseElement } = mount(`/analysis/projects/${project.id}`);

    const panel = await screen.findByRole("region", { name: "Details of Najdorf" });
    expect(screen.getByTestId("layout-board-left-panel")).toContainElement(panel);
    expect(within(panel).getByRole("heading", { level: 2, name: "Najdorf" })).toBeInTheDocument();
    expect(within(panel).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["General", "Options"]);
    expect(within(panel).getByRole("tabpanel", { name: "General" })).toHaveTextContent("The project's details will be shown here.");
    // Wide, no button opens it: it is the column.
    expect(screen.queryByRole("button", { name: "The project's details" })).toBeNull();

    await user.click(within(panel).getByRole("tab", { name: "Options" }));
    const toggle = within(within(panel).getByRole("tabpanel", { name: "Options" })).getByRole("switch", { name: "Example option" });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
    await expectNoAxeViolations(baseElement);
  });

  it("opens its panel in a drawer from the header under the shell's breakpoint, closed on Escape (CTA-213)", async () => {
    const wideWindow = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: /max-width/.test(query),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const project = (await createAnalysisProject("Najdorf", null))!;
      const user = userEvent.setup();
      mount(`/analysis/projects/${project.id}`, { compact: true });
      const opener = await screen.findByRole("button", { name: "The project's details" });
      expect(screen.queryByRole("region", { name: "Details of Najdorf" })).toBeNull();
      await user.click(opener);
      const sheet = await screen.findByRole("dialog", { name: "Details of Najdorf" });
      expect(within(sheet).getByRole("heading", { level: 2, name: "Najdorf" })).toBeInTheDocument();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Details of Najdorf" })).toBeNull());
    } finally {
      window.matchMedia = wideWindow;
    }
  });

  describe("their order (CTA-203)", () => {
    /** `count` Position Cases, `Case 1` first in the order. */
    const tutorial = async (count: number) => {
      const project = (await createAnalysisProject("Tutorial", null))!;
      await addAnalysisCases(
        Array.from({ length: count }, (_, index) =>
          positionCaseOfFen({ id: `c${index + 1}`, projectId: project.id, name: `Case ${index + 1}` }, ENDGAME),
        ),
      );
      return project;
    };
    const rowIds = () => screen.getAllByTestId(/^analysis-v2-cases-row-/).map((row) => row.dataset.testid!.replace("analysis-v2-cases-row-", ""));
    /** A row's own button — looked up in the row, not across a page of 25 rows of them. */
    const moveButton = (id: string, name: string) => within(screen.getByTestId(`analysis-v2-cases-row-${id}`)).getByRole("button", { name });

    // A full page of rows and an axe audit over it: ~4 s alone, past 20 s under a loaded run of the whole suite.
    it("opens sorted by #, and moves a Case from its row — the focus kept on it, its place said, the page following it", async () => {
      const project = await tutorial(30);
      const dates = analysisCasesSnapshot()!.map((record) => record.updatedAt);
      const user = userEvent.setup();
      // 25 a page, so 30 Cases take two.
      const { baseElement } = mount(`/analysis/projects/${project.id}?rows=25`);
      const table = await screen.findByRole("table", { name: "Cases" });
      expect(within(table).getByRole("columnheader", { name: "Order" })).toHaveAttribute("aria-sort", "ascending");
      expect(rowIds().slice(0, 3)).toEqual(["c1", "c2", "c3"]);
      await expectNoAxeViolations(baseElement);

      // Up to the first place: up and top are off there, so the focus takes its way down.
      await user.click(moveButton("c2", "Move Case 2 up"));
      await waitFor(() => expect(rowIds().slice(0, 3)).toEqual(["c2", "c1", "c3"]));
      await waitFor(() => expect(moveButton("c2", "Move Case 2 down")).toHaveFocus());
      expect(screen.getByTestId("analysis-v2-cases-moved")).toHaveTextContent("Case 2 is now number 1 of 30.");

      // By the keyboard: the same action keeps the focus.
      moveButton("c3", "Move Case 3 down").focus();
      await user.keyboard("{Enter}");
      await waitFor(() => expect(rowIds().slice(0, 4)).toEqual(["c2", "c1", "c4", "c3"]));
      await waitFor(() => expect(moveButton("c3", "Move Case 3 down")).toHaveFocus());

      // To the bottom, on the second page: the page follows it.
      await user.click(moveButton("c1", "Move Case 1 to the bottom"));
      await waitFor(() => expect(where()).toContain("page=1"));
      await waitFor(() => expect(moveButton("c1", "Move Case 1 up")).toHaveFocus());
      expect(rowIds().at(-1)).toBe("c1");
      expect(screen.getByTestId("analysis-v2-cases-moved")).toHaveTextContent("Case 1 is now number 30 of 30.");

      // Kept, and no Case's date touched.
      expect(analysisCasesSnapshot()!.map((record) => record.updatedAt)).toEqual(dates);
      await reload();
      const order = Object.fromEntries(analysisCasesSnapshot()!.map((record) => [record.id, record.order]));
      expect([order.c2, order.c4, order.c3, order.c1]).toEqual([1, 2, 3, 30]);
    }, 60_000);

    it("reorders only under # ascending with no words — saying why otherwise", async () => {
      const project = await tutorial(3);
      const user = userEvent.setup();
      mount(`/analysis/projects/${project.id}`);
      const table = await screen.findByRole("table", { name: "Cases" });
      expect(screen.getByRole("button", { name: "Move Case 2 up" })).toBeEnabled();

      await user.click(within(table).getByRole("button", { name: "Name" }));
      expect(screen.getByRole("button", { name: "Move Case 2 up — sort by # ascending to reorder" })).toBeDisabled();
      await user.click(within(table).getByRole("button", { name: "Order" }));
      expect(where()).not.toContain("sort=");
      expect(screen.getByRole("button", { name: "Move Case 2 up" })).toBeEnabled();

      await user.type(screen.getByRole("searchbox", { name: "Filter cases" }), "case");
      expect(screen.getByRole("button", { name: "Move Case 2 up — clear the filter to reorder" })).toBeDisabled();
    });

    it("lists the Project's Cases beside a Case's board in the same order", async () => {
      const project = await tutorial(3);
      await moveAnalysisCaseInOrder("c3", "top");
      const user = userEvent.setup();
      mount(`/analysis/projects/${project.id}/cases/c1?view=list`);
      const list = await screen.findByRole("navigation", { name: "Cases of Tutorial" });
      expect(within(list).getAllByRole("treeitem").map((item) => item.textContent)).toEqual([
        expect.stringContaining("Case 3"),
        expect.stringContaining("Case 1"),
        expect.stringContaining("Case 2"),
      ]);
      await user.click(screen.getByRole("link", { name: "Next case" }));
      expect(where()).toBe(`/analysis/projects/${project.id}/cases/c2?view=list`);
    });
  });

  it("says a Project that is not there, once the stores are read", async () => {
    mount("/analysis/projects/gone");
    expect(await screen.findByTestId("analysis-v2-project-missing")).toBeInTheDocument();
  });
});

describe("a Case's board (CTA-186)", () => {
  it("autosaves every move, the place and the orientation — and a reload finds them", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id)]);
    const view = mount(`/analysis/projects/${project.id}/cases/cgame`);
    expect(await screen.findByTestId("board")).toHaveAttribute("data-position", START);
    expect(screen.getByTestId("analysis-case-name")).toHaveTextContent("Carlsen – Caruana");

    // A new side line from the start, then the board flipped.
    act(() => {
      boardOptions().onPieceDrop!({ sourceSquare: "d2", targetSquare: "d4" });
    });
    fireEvent.click(screen.getByTestId("board-control-flip"));
    await waitFor(() =>
      expect(analysisCasesSnapshot()![0]).toMatchObject({ path: ["d4"], orientation: "black" }),
    );
    expect(analysisCasesSnapshot()![0].pgn).toContain("(1. d4)");
    // Nothing says Saved: the header speaks only of a refused write.
    expect(screen.queryByTestId("analysis-case-save-status")).toBeNull();

    view.unmount();
    await reload();
    mount(`/analysis/projects/${project.id}/cases/cgame`);
    expect(await screen.findByTestId("board")).toHaveAttribute(
      "data-position",
      "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("keeps every step of the arrow keys at once, as quiet writes — and a reload finds the last (CTA-222)", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id)]);
    const user = userEvent.setup();
    const view = mount(`/analysis/projects/${project.id}/cases/cgame?view=list`);
    expect(await screen.findByTestId("board")).toHaveAttribute("data-position", START);

    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    await waitFor(() => expect(analysisCasesSnapshot()![0].path).toEqual(["e4", "e5", "Nf3"]));
    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(analysisCasesSnapshot()![0].path).toEqual(["e4", "e5"]));
    // The list beside the board is the one it was.
    expect(within(screen.getByTestId("analysis-case-siblings")).getByText(/Carlsen – Caruana/)).toBeInTheDocument();

    view.unmount();
    await reload();
    expect(analysisCasesSnapshot()![0].path).toEqual(["e4", "e5"]);
    mount(`/analysis/projects/${project.id}/cases/cgame`);
    expect(await screen.findByTestId("board")).toHaveAttribute(
      "data-position",
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    );
  });

  it("draws as its Display and Settings tabs say — arrows, move marks, lines, eval bar, side — and keeps it with the Case", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id)]);
    const user = userEvent.setup();
    // Display is the left panel's, on the Case's own view.
    const view = mount(`/analysis/projects/${project.id}/cases/cgame?view=case`);
    await screen.findByTestId("board");
    expect(boardOptions().arrows!.length).toBeGreaterThan(0);

    // The next-move arrows off — none drawn — and the move marks off: the Settings tab's switches since CTA-211.
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(within(screen.getByTestId("analysis-case-settings")).getByRole("switch", { name: "Show next move arrows" }));
    expect(boardOptions().arrows).toEqual([]);
    await user.click(within(screen.getByTestId("analysis-case-settings")).getByRole("switch", { name: "Show move marks on the board" }));

    await user.click(screen.getByRole("tab", { name: "Display" }));
    const display = screen.getByTestId("analysis-case-display");
    expect(await expectNoAxeViolations(display)).toBeUndefined();
    // Neither switch is here any more.
    expect(within(display).queryByRole("switch", { name: "Show next move arrows" })).toBeNull();
    expect(within(display).queryByRole("switch", { name: "Show move marks on the board" })).toBeNull();

    // The inner tabs: Arrows (the width source and palette), Engine, Accessibility.
    const inner = within(display).getByRole("tablist", { name: "Display settings" });
    expect(within(inner).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Arrows", "Engine", "Accessibility"]);
    await user.click(within(display).getByRole("radio", { name: "Lichess" }));
    await user.click(within(inner).getByRole("tab", { name: "Engine" }));
    await user.click(within(display).getByRole("switch", { name: "Show variations" }));
    await user.click(within(inner).getByRole("tab", { name: "Accessibility" }));
    expect(screen.getByTestId("analysis-case-display-accessibility")).toBeInTheDocument();

    // The Settings tab: the side the board faces, the eval bar, the evaluations written.
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const settings = screen.getByTestId("analysis-case-settings");
    expect(await expectNoAxeViolations(settings)).toBeUndefined();
    expect(within(settings).getByRole("radio", { name: "White" })).toBeChecked();
    await user.click(within(settings).getByRole("radio", { name: "Black" }));
    expect(boardOptions().boardOrientation).toBe("black");
    await user.click(within(settings).getByRole("switch", { name: "Show evaluation bar" }));
    // Write evaluations: on for a Case, and kept with it like the rest (CTA-199).
    const write = within(settings).getByRole("switch", { name: "Write evaluations into the game" });
    expect(write).toBeChecked();
    await user.click(write);

    await waitFor(() =>
      expect(analysisCasesSnapshot()![0].display).toEqual({
        showArrows: false,
        arrowWidthSource: "none",
        arrowPalette: "lichess",
        showMoveMarks: false,
        showEvalBar: false,
        showVariations: false,
        writeEvals: false,
      }),
    );
    await waitFor(() => expect(analysisCasesSnapshot()![0].orientation).toBe("black"));

    // Reopened, the board draws as it was left.
    view.unmount();
    await reload();
    mount(`/analysis/projects/${project.id}/cases/cgame?view=case`);
    await screen.findByTestId("board");
    expect(boardOptions().arrows).toEqual([]);
    expect(boardOptions().boardOrientation).toBe("black");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const reopened = screen.getByTestId("analysis-case-settings");
    expect(within(reopened).getByRole("switch", { name: "Write evaluations into the game" })).not.toBeChecked();
    expect(within(reopened).getByRole("switch", { name: "Show next move arrows" })).not.toBeChecked();
    expect(within(reopened).getByRole("switch", { name: "Show move marks on the board" })).not.toBeChecked();
  });

  it("draws the engine's listed lines as the arrows under Variations — None while it is off or has no lines here (CTA-197)", async () => {
    FakeEngine.reset();
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id)]);
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}/cases/cgame?view=case`);
    await screen.findByTestId("board");
    const engineArrows = () => screen.queryByTestId("analysis-case-engine-arrows-overlay");
    const engineArrowTargets = () =>
      [...engineArrows()!.querySelectorAll("path")].map((path) => path.getAttribute("data-to"));

    await user.click(screen.getByRole("tab", { name: "Display" }));
    const display = screen.getByTestId("analysis-case-display");
    const variations = within(display).getByRole("radio", { name: /^Variations/ });
    expect(variations).toBeEnabled();
    await user.click(variations);
    // The engine off: drawn as None — the tree's own arrow, 1. e4 — and the note says why.
    expect(variations).toBeChecked();
    expect(engineArrows()).toBeNull();
    expect(boardOptions().arrows!.map((arrow) => arrow.endSquare)).toEqual(["e4"]);
    expect(within(display).getByTestId("analysis-case-display-width-drawn-as-none")).toHaveTextContent(
      i18n.t("analysis.arrows.drawnAsNoneEngine"),
    );
    await expectNoAxeViolations(display);

    // On, but no lines yet: still None.
    act(() => screen.getByTestId("analysis-case-setting-engine").click());
    const engine = FakeEngine.latest();
    await waitFor(() => expect(engine.lastSearch).toBe(START));
    expect(engineArrows()).toBeNull();

    // Its lines for the position on screen: an arrow per line's first move — 1. d4 is in no tree — the best widest.
    const report = (multipv: number, cp: number, pv: string) =>
      act(() =>
        engine.say({ fen: START, uciMessage: "info", depth: 18, multipv, positionEvaluation: String(cp), pv }),
      );
    report(1, 35, "e2e4 e7e5");
    report(2, 20, "d2d4 d7d5");
    expect(engineArrowTargets()).toEqual(["e4", "d4"]);
    expect(boardOptions().arrows).toEqual([]);
    const width = (square: string) =>
      Number(engineArrows()!.querySelector(`path[data-to="${square}"]`)!.getAttribute("stroke-width"));
    expect(width("e4")).toBeGreaterThan(width("d4"));
    expect(within(display).queryByTestId("analysis-case-display-width-drawn-as-none")).toBeNull();
    // A deeper search follows: 1. Nf3 joins.
    report(3, 34, "g1f3");
    expect(engineArrowTargets()).toEqual(["e4", "d4", "f3"]);

    // A step: the lines are the last position's, so none are drawn until the new ones arrive.
    fireEvent.click(screen.getByTestId("board-control-next"));
    expect(screen.getByTestId("board")).toHaveAttribute("data-position", AFTER_E4);
    expect(engineArrows()).toBeNull();

    // Off: None again, the choice kept with the Case.
    fireEvent.click(screen.getByTestId("board-control-previous"));
    act(() => screen.getByTestId("analysis-case-setting-engine").click());
    expect(engineArrows()).toBeNull();
    expect(boardOptions().arrows!.map((arrow) => arrow.endSquare)).toEqual(["e4"]);
    await waitFor(() => expect(analysisCasesSnapshot()![0].display.arrowWidthSource).toBe("variations"));
  });

  it("opens a Position from a PGN where it starts, its moves before it kept", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const tree = parsePgnTree(GAME);
    const { positionCaseOfGame } = await import("../../lib/analysisProjects");
    await addAnalysisCases([positionCaseOfGame({ id: "cply", projectId: project.id, name: "" }, tree, tree.moves[0].id)]);
    mount(`/analysis/projects/${project.id}/cases/cply`);
    expect(await screen.findByTestId("board")).toHaveAttribute("data-position", AFTER_E4);
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("opens a Case on its own view, Back to the Project's Cases beside it — the table's order and words carried there and back (CTA-199)", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([
      gameCase(project.id),
      positionCaseOfFen({ id: "cpos", projectId: project.id, name: "Endgame" }, ENDGAME),
      positionCaseOfFen({ id: "cstart", projectId: project.id, name: "Opening" }, START),
    ]);
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}?sort=name&dir=asc`);
    const table = await screen.findByRole("table", { name: "Cases" });
    await user.click(within(table).getByRole("link", { name: "Open Endgame" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cpos?sort=name&dir=asc`);

    // A Case opens on its own view (CTA-199); Back is the list.
    await screen.findByRole("navigation", { name: /^Details of Endgame/ });
    await user.click(screen.getByRole("link", { name: "Back to the cases" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cpos?sort=name&dir=asc&view=list`);

    // By name: Carlsen – Caruana…, Endgame, Opening — the open one current.
    const list = await screen.findByRole("navigation", { name: "Cases of Club" });
    expect(within(list).getAllByRole("treeitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Carlsen"),
      expect.stringContaining("Endgame"),
      expect.stringContaining("Opening"),
    ]);
    expect(screen.getByTestId("analysis-case-siblings-tree-cpos")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Previous case" })).toHaveAttribute(
      "href",
      `/analysis/projects/${project.id}/cases/cgame?sort=name&dir=asc&view=list`,
    );
    await user.click(screen.getByRole("link", { name: "Next case" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cstart?sort=name&dir=asc&view=list`);
    expect(await screen.findByTestId("analysis-case-name")).toHaveTextContent("Opening");

    // The list's words are the URL's, and Close takes them back to the table.
    await user.type(screen.getByRole("searchbox", { name: "Filter cases" }), "endgame");
    expect(where()).toContain("q=endgame");
    expect(screen.queryByTestId("analysis-case-siblings-tree-cgame")).toBeNull();
    await user.click(within(screen.getByTestId("analysis-case-siblings")).getByRole("link", { name: "Back to Club" }));
    expect(where()).toBe(`/analysis/projects/${project.id}?sort=name&dir=asc&q=endgame`);
    expect(await screen.findByRole("searchbox", { name: "Filter cases" })).toHaveValue("endgame");
  });

  it("pages a Project of more than 100 Cases, 100 at a time — on the open Case's page, following it as the reader steps (CTA-211)", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases(
      Array.from({ length: 120 }, (_, index) => positionCaseOfFen({ id: `c${index + 1}`, projectId: project.id, name: `Chapter ${index + 1}` }, ENDGAME)),
    );
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}/cases/c101?view=list`);
    const list = await screen.findByRole("navigation", { name: "Cases of Club" });
    // The Project's order: Chapter 101 on the second page, current.
    const pager = () => screen.getByTestId("analysis-case-siblings-pager");
    expect(pager()).toHaveTextContent("101–120 of 120");
    expect(within(list).getAllByRole("treeitem")).toHaveLength(20);
    expect(screen.getByTestId("analysis-case-siblings-tree-c101")).toHaveAttribute("aria-current", "page");

    // A step to the previous Case lands on its page.
    await user.click(screen.getByRole("link", { name: "Previous case" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/c100?view=list`);
    await waitFor(() => expect(pager()).toHaveTextContent("1–100 of 120"));
    expect(screen.getByTestId("analysis-case-siblings-tree-c100")).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("navigation", { name: "Cases of Club" })).getAllByRole("treeitem")).toHaveLength(100);

    // Paging by hand changes no Case.
    await user.click(within(pager()).getByRole("button", { name: /next page/i }));
    expect(pager()).toHaveTextContent("101–120 of 120");
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/c100?view=list`);
    expect(screen.getByTestId("analysis-case-name")).toHaveTextContent("Chapter 100");
  });

  it("opens a Case's own view from the list — on Info, its tags and Linked cases (n) — and Back returns to the list", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id), positionCaseOfFen({ id: "cpos", projectId: project.id, name: "Endgame" }, ENDGAME)]);
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}/cases/cpos?sort=name&dir=asc&view=list`);
    await screen.findByRole("navigation", { name: "Cases of Club" });

    // A row picked: that Case, the panel on its own view.
    await user.click(screen.getByTestId("analysis-case-siblings-tree-cgame"));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cgame?sort=name&dir=asc`);
    const details = await screen.findByRole("navigation", { name: /^Details of Carlsen – Caruana/ });
    // Info, first and open (CTA-211): the tags, then Linked cases (n) — a dialog of its links.
    expect(within(details).getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("analysis-case-details-info-Event")).toHaveTextContent("Club Championship");
    expect(screen.getByTestId("analysis-case-details-info-White")).toHaveTextContent("Carlsen");
    expect(within(details).getByRole("button", { name: "Linked cases (0)" })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "Board panel" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Moves",
      "Map",
      "Export",
    ]);
    await expectNoAxeViolations(details);
    expect(within(within(details).getByRole("tablist", { name: "Case details" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Info",
      "Settings",
      "Graph",
      "Display",
      "Jobs",
    ]);
    // Settings: the board's settings alone — no inner tabs (CTA-211).
    await user.click(within(details).getByRole("tab", { name: "Settings" }));
    expect(within(details).getByTestId("analysis-case-settings")).toBeInTheDocument();
    expect(within(details).getAllByRole("tablist")).toHaveLength(1);
    // No evaluations in the game: Graph is off.
    expect(within(details).getByRole("tab", { name: "Graph" })).toBeDisabled();
    await user.click(within(details).getByRole("tab", { name: "Display" }));
    expect(screen.getByTestId("analysis-case-display")).toBeInTheDocument();

    // Previous / next keep the view, and open the next Case on Info (CTA-211); a Position from a FEN has no game tags.
    await user.click(within(details).getByRole("link", { name: "Next case" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cpos?sort=name&dir=asc`);
    expect(await screen.findByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("analysis-case-details-title")).toHaveTextContent("Endgame");
    expect(screen.queryByTestId("analysis-case-details-info-Event")).toBeNull();

    // Back: the list again, the table's context kept.
    await user.click(screen.getByRole("link", { name: "Back to the cases" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cpos?sort=name&dir=asc&view=list`);
    expect(await screen.findByRole("navigation", { name: "Cases of Club" })).toBeInTheDocument();
  });

  it("shows a game's evaluations on the Case view's Graph — a point picked moves the board", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const evaluated = parsePgnTree('[White "A"]\n[Black "B"]\n\n1. e4 { [%eval 0.3] } e5 { [%eval 0.25] } 2. Nf3 { [%eval 0.3] } *');
    await addAnalysisCases([gameCaseOf({ id: "ceval", projectId: project.id, name: "" }, evaluated)]);
    const user = userEvent.setup();
    mount(`/analysis/projects/${project.id}/cases/ceval?view=case`);
    await screen.findByTestId("board");

    const graphTab = screen.getByRole("tab", { name: "Graph" });
    expect(graphTab).toBeEnabled();
    await user.click(graphTab);
    const graph = await screen.findByTestId("analysis-case-details-evaluations-graph");
    expect(screen.getByTestId("analysis-case-details-evaluations-report")).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("analysis-case-details-graph"));
    // The graph is a slider over the evaluated moves: Home is the first, 1. e4 (no evaluation of the start here), Enter moves the board there.
    act(() => within(graph).getByRole("slider", { name: "Evaluation graph" }).focus());
    await user.keyboard("{Home}{Enter}");
    await waitFor(() => expect(boardOptions().position).toBe(AFTER_E4));
  });

  it("says a Case that is not in the Project, and leads back to it", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const { baseElement } = mount(`/analysis/projects/${project.id}/cases/gone`);
    expect(await screen.findByTestId("analysis-case-missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Club" })).toHaveAttribute("href", `/analysis/projects/${project.id}`);
    await expectNoAxeViolations(baseElement);
  });
});
