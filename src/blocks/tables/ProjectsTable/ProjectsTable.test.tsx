import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { projectPickStateOf, projectPicksOf, setProjectPicks } from "../../../lib/analysisProjectPicks";
import { expectNoAxeViolations } from "../../../test/axe";
import { MODEL, treeRows } from "./fixtures";
import ProjectsTable, { type ProjectsTableProps } from "./ProjectsTable";

const NO_PICKS: ProjectsTableProps["picks"] = {
  pickOf: () => ({ checked: false, indeterminate: false, onToggle: () => {} }),
  selectAll: { checked: false, indeterminate: false, onToggleAll: () => {} },
};

const mount = (props: Partial<ProjectsTableProps> = {}) =>
  render(
    <ProjectsTable
      rows={treeRows()}
      sort={{ column: "name", direction: "asc" }}
      onSort={() => {}}
      onToggle={() => {}}
      onToggleProject={() => {}}
      folderLink={(folder) => ({ href: `/folder/${folder.id}` })}
      projectLink={(row) => ({ href: `/project/${row.id}` })}
      caseLink={(row) => ({ href: `/case/${row.id}` })}
      onOpenCase={() => {}}
      onFolderAction={() => {}}
      onProjectAction={() => {}}
      picks={NO_PICKS}
      testId="probe"
      {...props}
    />,
  );

const keys = () => screen.getAllByTestId(/^probe-row-(?!.*-toggle(-icon)?$)/).map((row) => row.getAttribute("data-testid")?.replace("probe-row-", ""));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectsTable (CTA-186, CTA-191)", () => {
  it("lists the folders first, closed, then the top level's Projects — a box on every row, no Delete", async () => {
    const { container } = mount();
    expect(keys()).toEqual(["folder-fend", "folder-fopen", "ploose"]);
    expect(screen.getByTestId("probe-row-folder-fopen")).toHaveTextContent("2 projects");
    expect(screen.getByRole("link", { name: "Open Club games" })).toHaveAttribute("href", "/project/ploose");
    expect(screen.getByRole("checkbox", { name: "Select all folders, projects and cases" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pick Openings" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pick Club games" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("opens folders and Projects in place — a Project's Cases under it, each a link to its board", async () => {
    const { container } = mount({ rows: treeRows(["fopen", "fsic"], "", ["pnaj", "pcaro"]) });
    expect(keys()).toEqual([
      "folder-fend",
      "folder-fopen",
      "folder-fsic",
      "pnaj",
      "case-cnaj2",
      "case-cnaj1",
      "pcaro",
      "case-ccaro1",
      "case-ccaro2",
      "ploose",
    ]);
    expect(screen.getByTestId("probe-row-case-cnaj2")).toHaveTextContent("Position");
    expect(screen.getByTestId("probe-row-case-ccaro2")).toHaveTextContent("Game");
    expect(screen.getByRole("link", { name: "Open Advance variation" })).toHaveAttribute(
      "href",
      "/case/ccaro1",
    );
    // A Case's row has no actions; a Project with none has no chevron.
    expect(screen.getByRole("button", { name: "Hide the cases of Najdorf ideas" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "Show the cases of Club games" })).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("toggles a folder and a Project from a chevron or the row, opens a Case from its row, and hands each action its record", async () => {
    const onToggle = vi.fn();
    const onToggleProject = vi.fn();
    const onOpenCase = vi.fn();
    const onProjectAction = vi.fn();
    const onFolderAction = vi.fn();
    mount({ rows: treeRows(["fopen"], "", ["pcaro"]), onToggle, onToggleProject, onOpenCase, onProjectAction, onFolderAction });
    await userEvent.click(screen.getByRole("button", { name: "Close Openings" }));
    expect(onToggle).toHaveBeenCalledWith("fopen");
    await userEvent.click(screen.getByRole("button", { name: "Hide the cases of Caro-Kann" }));
    expect(onToggleProject).toHaveBeenCalledWith("pcaro");
    await userEvent.click(screen.getByTestId("probe-row-pcaro"));
    expect(onToggleProject).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByTestId("probe-row-case-ccaro2"));
    expect(onOpenCase).toHaveBeenCalledWith(expect.objectContaining({ id: "ccaro2", projectId: "pcaro" }));

    await userEvent.click(screen.getByRole("button", { name: "Rename Endgames" }));
    expect(onFolderAction).toHaveBeenCalledWith("rename", expect.objectContaining({ id: "fend" }));
    await userEvent.click(screen.getByRole("button", { name: "Duplicate Club games" }));
    expect(onProjectAction).toHaveBeenCalledWith("duplicate", expect.objectContaining({ id: "ploose" }));
    expect(screen.queryByRole("button", { name: "Delete Club games" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete Endgames" })).toBeNull();
  });

  it("shows each box as the screen derives it — checked, partly ticked — and hands a tick its row", async () => {
    const picks = projectPicksOf(MODEL, setProjectPicks(new Set(), MODEL, [{ kind: "case", id: "ccaro1" }], true));
    const toggled = vi.fn();
    const onToggleAll = vi.fn();
    mount({
      rows: treeRows(["fopen"], "", ["pcaro"]),
      picks: {
        pickOf: (target) => ({ ...projectPickStateOf(picks, target), onToggle: () => toggled(target) }),
        selectAll: { checked: false, indeterminate: true, onToggleAll },
      },
    });
    expect(screen.getByRole("checkbox", { name: "Pick Advance variation" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pick Caro-Kann" })).toHaveAttribute("data-indeterminate", "true");
    expect(screen.getByRole("checkbox", { name: "Pick Openings" })).toHaveAttribute("data-indeterminate", "true");
    expect(screen.getByRole("checkbox", { name: "Pick Endgames" })).not.toBeChecked();

    await userEvent.click(screen.getByRole("checkbox", { name: "Pick Caro-Kann" }));
    expect(toggled).toHaveBeenCalledWith({ kind: "project", id: "pcaro" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Pick Karpov – Kasparov, Linares, 1992" }));
    expect(toggled).toHaveBeenCalledWith({ kind: "case", id: "ccaro2" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Pick Endgames" }));
    expect(toggled).toHaveBeenCalledWith({ kind: "folder", id: "fend" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all folders, projects and cases" }));
    expect(onToggleAll).toHaveBeenCalled();
  });

  it("shows what the words keep, the folders above a match opened — or says nothing matches", async () => {
    const { unmount } = mount({ rows: treeRows([], "najdorf"), filtered: true });
    expect(keys()).toEqual(["folder-fopen", "folder-fsic", "pnaj"]);
    unmount();
    // A Case's name: its Project and folder opened for it, only the Case named.
    const { unmount: unmountCase } = mount({ rows: treeRows([], "lucena"), filtered: true });
    expect(keys()).toEqual(["folder-fend", "prook", "case-crook1"]);
    unmountCase();
    const onClearFilter = vi.fn();
    mount({ rows: treeRows([], "zzz"), filtered: true, onClearFilter });
    expect(screen.getByTestId("probe-no-match")).toHaveTextContent("No folder, project or case matches the filter.");
    await userEvent.click(screen.getByRole("button", { name: "Clear the filter" }));
    expect(onClearFilter).toHaveBeenCalled();
  });
});
