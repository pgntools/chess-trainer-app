import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { treeRows } from "./fixtures";
import ProjectsTable, { type ProjectsTableProps } from "./ProjectsTable";

const mount = (props: Partial<ProjectsTableProps> = {}) =>
  render(
    <ProjectsTable
      rows={treeRows()}
      sort={{ column: "name", direction: "asc" }}
      onSort={() => {}}
      onToggle={() => {}}
      folderLink={(folder) => ({ href: `/folder/${folder.id}` })}
      projectLink={(row) => ({ href: `/project/${row.id}` })}
      onFolderAction={() => {}}
      onProjectAction={() => {}}
      testId="probe"
      {...props}
    />,
  );

const keys = () => screen.getAllByTestId(/^probe-row-(?!.*-toggle(-icon)?$)/).map((row) => row.getAttribute("data-testid")?.replace("probe-row-", ""));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectsTable (CTA-186)", () => {
  it("lists the folders first, closed, then the top level's Projects", async () => {
    const { container } = mount();
    expect(keys()).toEqual(["folder-fend", "folder-fopen", "ploose"]);
    expect(screen.getByTestId("probe-row-folder-fopen")).toHaveTextContent("2 projects");
    expect(screen.getByRole("link", { name: "Open Club games" })).toHaveAttribute("href", "/project/ploose");
    await expectNoAxeViolations(container);
  });

  it("opens a folder in place, its sub-folders and Projects under it", () => {
    mount({ rows: treeRows(["fopen", "fsic"]) });
    expect(keys()).toEqual(["folder-fend", "folder-fopen", "folder-fsic", "pnaj", "pcaro", "ploose"]);
  });

  it("toggles a folder from its chevron, and hands each action its folder or Project", async () => {
    const onToggle = vi.fn();
    const onProjectAction = vi.fn();
    const onFolderAction = vi.fn();
    mount({ onToggle, onProjectAction, onFolderAction });
    await userEvent.click(screen.getByRole("button", { name: "Open Openings" }));
    expect(onToggle).toHaveBeenCalledWith("fopen");
    await userEvent.click(screen.getByRole("button", { name: "Rename Endgames" }));
    expect(onFolderAction).toHaveBeenCalledWith("rename", expect.objectContaining({ id: "fend" }));
    await userEvent.click(screen.getByRole("button", { name: "Duplicate Club games" }));
    expect(onProjectAction).toHaveBeenCalledWith("duplicate", expect.objectContaining({ id: "ploose" }));
  });

  it("shows what the words keep, the folders above a match opened — or says nothing matches", async () => {
    const { unmount } = mount({ rows: treeRows([], "najdorf"), filtered: true });
    expect(keys()).toEqual(["folder-fopen", "folder-fsic", "pnaj"]);
    unmount();
    const onClearFilter = vi.fn();
    mount({ rows: treeRows([], "zzz"), filtered: true, onClearFilter });
    expect(screen.getByTestId("probe-no-match")).toHaveTextContent("No folder or project matches the filter.");
    await userEvent.click(screen.getByRole("button", { name: "Clear the filter" }));
    expect(onClearFilter).toHaveBeenCalled();
  });
});
