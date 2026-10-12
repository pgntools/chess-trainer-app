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
import { boardOptions } from "../board/boardTestHarness";
import { BoardLeftPanelOutlet, BoardLeftPanelProvider } from "../main/boardLeftPanel";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
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

const mount = (entry: string) =>
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
            <BoardLeftPanelOutlet compact={false} />
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
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("club");
    await user.click(screen.getByRole("button", { name: "Create" }));
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
    await user.click(screen.getByRole("button", { name: "Create" }));
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
    await user.click(screen.getByRole("button", { name: "Create" }));

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

  it("renames, moves, duplicates and deletes a Project — saying how many Cases go with it", async () => {
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

    await user.click(screen.getByRole("button", { name: "Delete Sicilian" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Its 2 cases are deleted with it.");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Open Sicilian" })).toBeNull());
    await waitFor(() => expect(analysisCasesSnapshot()).toHaveLength(2));
  });

  it("deletes a folder keeping what it holds one level up — or with everything in it", async () => {
    const outer = (await createProjectFolder("Outer", null))!;
    const inner = (await createProjectFolder("Inner", outer.id))!;
    await createAnalysisProject("Kept", inner.id);
    const user = userEvent.setup();
    mount(`/analysis?folder=${outer.id}`);

    await user.click(await screen.findByRole("button", { name: "Delete Inner" }));
    expect(screen.getByRole("radio", { name: /Keep it/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("link", { name: "Open Kept" })).toBeInTheDocument();
    expect(analysisProjectsSnapshot()![0].folderId).toBe(outer.id);

    // Now the outer folder, deep, from inside it: the reader steps out to where it was.
    await createProjectFolder("Again", outer.id);
    await user.click(await screen.findByRole("button", { name: "Delete Again" }));
    await user.click(screen.getByRole("radio", { name: /Delete it too/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Delete Again" })).toBeNull());
    expect(analysisProjectsSnapshot()).toHaveLength(1);
  });

  it("opens a folder in place, and finds a Project by words — the folders above it opened", async () => {
    const outer = (await createProjectFolder("Openings", null))!;
    const inner = (await createProjectFolder("Sicilian", outer.id))!;
    await createAnalysisProject("Najdorf ideas", inner.id);
    await createAnalysisProject("Club games", null);
    const user = userEvent.setup();
    const { baseElement } = mount("/analysis");
    const table = await screen.findByRole("table", { name: "Folders and projects" });
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
    await user.type(screen.getByRole("searchbox", { name: "Filter folders and projects" }), "najdorf");
    expect(shown()).toEqual([
      expect.stringContaining("Openings"),
      expect.stringContaining("Sicilian"),
      expect.stringContaining("Najdorf ideas"),
    ]);
    expect(where()).toBe("/analysis?q=najdorf");
    await user.clear(screen.getByRole("searchbox", { name: "Filter folders and projects" }));
    await user.type(screen.getByRole("searchbox", { name: "Filter folders and projects" }), "zzz");
    expect(screen.getByTestId("analysis-v2-list-no-match")).toHaveTextContent("No folder or project matches the filter.");
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

  it("renames, moves, duplicates and deletes a Case", async () => {
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

    await user.click(screen.getByRole("button", { name: "Delete Brilliancy" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByTestId("analysis-v2-cases-empty")).toBeInTheDocument();
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
    expect(await screen.findByTestId("analysis-case-save-status")).toHaveTextContent("Saved");

    view.unmount();
    await reload();
    mount(`/analysis/projects/${project.id}/cases/cgame`);
    expect(await screen.findByTestId("board")).toHaveAttribute(
      "data-position",
      "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(boardOptions().boardOrientation).toBe("black");
  });

  it("draws as its Display and Settings tabs say — arrows, move marks, lines, eval bar, side — and keeps it with the Case", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    await addAnalysisCases([gameCase(project.id)]);
    const user = userEvent.setup();
    const view = mount(`/analysis/projects/${project.id}/cases/cgame`);
    await screen.findByTestId("board");
    expect(boardOptions().arrows!.length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: "Display" }));
    const display = screen.getByTestId("analysis-case-display");
    expect(await expectNoAxeViolations(display)).toBeUndefined();
    // The common options: the next-move arrows off — none drawn — and the move marks off.
    await user.click(within(display).getByRole("switch", { name: "Show next move arrows" }));
    expect(boardOptions().arrows).toEqual([]);
    await user.click(within(display).getByRole("switch", { name: "Show move marks on the board" }));

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
    expect(within(settings).getByRole("switch", { name: "Write evaluations into the game" })).toBeInTheDocument();

    await waitFor(() =>
      expect(analysisCasesSnapshot()![0].display).toEqual({
        showArrows: false,
        arrowWidthSource: "none",
        arrowPalette: "lichess",
        showMoveMarks: false,
        showEvalBar: false,
        showVariations: false,
      }),
    );
    await waitFor(() => expect(analysisCasesSnapshot()![0].orientation).toBe("black"));

    // Reopened, the board draws as it was left.
    view.unmount();
    await reload();
    mount(`/analysis/projects/${project.id}/cases/cgame`);
    await screen.findByTestId("board");
    expect(boardOptions().arrows).toEqual([]);
    expect(boardOptions().boardOrientation).toBe("black");
    await user.click(screen.getByRole("tab", { name: "Display" }));
    expect(screen.getByRole("switch", { name: "Show next move arrows" })).not.toBeChecked();
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

  it("lists the Project's Cases beside it — the table's order and words carried there and back", async () => {
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
      `/analysis/projects/${project.id}/cases/cgame?sort=name&dir=asc`,
    );
    await user.click(screen.getByRole("link", { name: "Next case" }));
    expect(where()).toBe(`/analysis/projects/${project.id}/cases/cstart?sort=name&dir=asc`);
    expect(await screen.findByTestId("analysis-case-name")).toHaveTextContent("Opening");

    // The list's words are the URL's, and Close takes them back to the table.
    await user.type(screen.getByRole("searchbox", { name: "Filter cases" }), "endgame");
    expect(where()).toContain("q=endgame");
    expect(screen.queryByTestId("analysis-case-siblings-tree-cgame")).toBeNull();
    await user.click(within(screen.getByTestId("analysis-case-siblings")).getByRole("link", { name: "Back to Club" }));
    expect(where()).toBe(`/analysis/projects/${project.id}?sort=name&dir=asc&q=endgame`);
    expect(await screen.findByRole("searchbox", { name: "Filter cases" })).toHaveValue("endgame");
  });

  it("says a Case that is not in the Project, and leads back to it", async () => {
    const project = (await createAnalysisProject("Club", null))!;
    const { baseElement } = mount(`/analysis/projects/${project.id}/cases/gone`);
    expect(await screen.findByTestId("analysis-case-missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Club" })).toHaveAttribute("href", `/analysis/projects/${project.id}`);
    await expectNoAxeViolations(baseElement);
  });
});
