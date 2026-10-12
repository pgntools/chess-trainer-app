import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { FOLDERS, PROJECTS } from "./fixtures";
import ProjectsList, { type ProjectsListProps } from "./ProjectsList";

const mount = (props: Partial<ProjectsListProps> = {}) =>
  render(
    <ProjectsList
      folders={FOLDERS}
      projects={PROJECTS}
      folderLink={(id) => ({ href: `/folder/${id}` })}
      projectLink={(id) => ({ href: `/project/${id}` })}
      onFolderAction={() => {}}
      onProjectAction={() => {}}
      testId="probe"
      {...props}
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectsList (CTA-186)", () => {
  it("lists the sub-folders, then the Projects, each with its count and link", async () => {
    const { container } = mount();
    const list = screen.getByRole("list", { name: "Folders and projects" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByTestId("probe-folder-fopen")).toHaveTextContent("Openings");
    expect(screen.getByTestId("probe-folder-fopen")).toHaveTextContent("3 projects");
    expect(screen.getByRole("link", { name: "Open Najdorf ideas" })).toHaveAttribute("href", "/project/pnaj");
    expect(screen.getByTestId("probe-project-pnaj")).toHaveTextContent("4 cases");
    expect(screen.getByTestId("probe-project-pnew")).toHaveTextContent("0 cases");
    await expectNoAxeViolations(container);
  });

  it("hands each action its folder or Project", async () => {
    const onFolderAction = vi.fn();
    const onProjectAction = vi.fn();
    const user = userEvent.setup();
    mount({ onFolderAction, onProjectAction });
    await user.click(screen.getByRole("button", { name: "Rename Openings" }));
    expect(onFolderAction).toHaveBeenCalledWith("rename", FOLDERS[0].folder);
    await user.click(screen.getByRole("button", { name: "Duplicate Najdorf ideas" }));
    expect(onProjectAction).toHaveBeenCalledWith("duplicate", PROJECTS[0].project);
    await user.click(screen.getByRole("button", { name: "Delete Najdorf ideas" }));
    expect(onProjectAction).toHaveBeenLastCalledWith("delete", PROJECTS[0].project);
  });

  it("says when there is nothing here", () => {
    mount({ folders: [], projects: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("No folders or projects here yet.");
  });
});
