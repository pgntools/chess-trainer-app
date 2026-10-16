import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { MANY_PROJECTS, PROJECTS } from "./fixtures";
import ProjectPickerDialog, { type ProjectPickerDialogProps } from "./ProjectPickerDialog";

const mount = (props: Partial<ProjectPickerDialogProps> = {}) =>
  render(
    <ProjectPickerDialog
      open
      title="Move 2 cases to another project"
      submitLabel="Move"
      projects={PROJECTS}
      current="pnaj"
      onSubmit={() => {}}
      onClose={() => {}}
      testId="probe"
      {...props}
    />,
  );

const table = () => screen.getByRole("table", { name: "Projects" });

/** The body rows on screen. */
const bodyRows = () => within(table()).getAllByRole("row").slice(1);

/** The Name cell of each row on screen. */
const namesShown = () => bodyRows().map((row) => within(row).getAllByRole("cell")[1]?.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectPickerDialog (CTA-186, a table since CTA-226)", () => {
  it("moves into a Project chosen from its row — each with its folder and count, not the one it is in", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = mount({ excludeCurrent: true, onSubmit });
    expect(screen.getByRole("dialog", { name: "Move 2 cases to another project" })).toBeInTheDocument();
    // Name A to Z at first; the Project the Cases are in is not offered.
    expect(namesShown()).toEqual(["Caro-Kann", "Endgames"]);
    const caro = within(bodyRows()[0]).getAllByRole("cell");
    expect(caro[2]).toHaveTextContent("Openings");
    expect(caro[3]).toHaveTextContent("40");
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByTestId("probe-into")).toHaveTextContent("No project chosen yet.");
    await expectNoAxeViolations(baseElement);

    // A click anywhere on the row chooses it, its radio checked and the choice said.
    await userEvent.click(caro[2]);
    expect(screen.getByRole("radio", { name: "Choose Caro-Kann, in Openings" })).toBeChecked();
    expect(screen.getByTestId("probe-into")).toHaveTextContent("Into: Openings / Caro-Kann");
    // Its radio too — one at a time.
    await userEvent.click(screen.getByRole("radio", { name: "Choose Endgames" }));
    expect(screen.getByRole("radio", { name: "Choose Caro-Kann, in Openings" })).not.toBeChecked();
    expect(screen.getByTestId("probe-into")).toHaveTextContent("Into: Endgames");
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onSubmit).toHaveBeenCalledWith("pend", "");
  });

  it("chooses a row by the keyboard — Enter or Space on it", async () => {
    const onSubmit = vi.fn();
    mount({ excludeCurrent: true, onSubmit });
    bodyRows()[1].focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("radio", { name: "Choose Endgames" })).toBeChecked();
    bodyRows()[0].focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Choose Caro-Kann, in Openings" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onSubmit).toHaveBeenCalledWith("pcar", "");
  });

  it("finds, sorts and pages 1,200 Projects — the choice kept through all of it", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = mount({ projects: MANY_PROJECTS, current: "p0001", excludeCurrent: true, onSubmit });
    expect(bodyRows()).toHaveLength(50);
    expect(namesShown()[0]).toBe("Project 0002");
    expect(screen.getByTestId("probe-projects-pager")).toHaveTextContent(/of 1,?199/);

    // A Project on the second page chosen.
    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(namesShown()[0]).toBe("Project 0052");
    await userEvent.click(screen.getByRole("radio", { name: "Choose Project 0060, in Openings / Sicilian / Najdorf" }));
    expect(screen.getByTestId("probe-into")).toHaveTextContent("Into: Openings / Sicilian / Najdorf / Project 0060");

    // The words: every word in the name or the folder path — the first page again.
    const words = screen.getByRole("searchbox", { name: "Find a project" });
    await userEvent.type(words, "NAJDORF 006");
    expect(namesShown()).toEqual(["Project 0060", "Project 0068"]);
    expect(screen.getByRole("radio", { name: /^Choose Project 0060,/ })).toBeChecked();
    // Off the table, the chosen Project is still chosen and still said.
    await userEvent.clear(words);
    await userEvent.type(words, "french");
    expect(screen.queryByRole("radio", { name: /^Choose Project 0060,/ })).toBeNull();
    expect(screen.getByTestId("probe-into")).toHaveTextContent("Project 0060");
    await userEvent.clear(words);
    await userEvent.type(words, "nothing like it");
    expect(screen.getByTestId("probe-projects-no-match")).toHaveTextContent("No project matches the words.");
    await userEvent.clear(words);

    // A header sorts: Cases most first, then turned.
    await userEvent.click(screen.getByRole("button", { name: "Cases" }));
    const casesShown = () => bodyRows().map((row) => Number(within(row).getAllByRole("cell")[3]?.textContent?.replace(/\D/g, "")));
    expect(casesShown()[0]).toBe(Math.max(...MANY_PROJECTS.slice(1).map((row) => row.cases)));
    expect([...casesShown()].sort((a, b) => b - a)).toEqual(casesShown());
    await userEvent.click(screen.getByRole("button", { name: "Folder" }));
    // The top level first, A to Z.
    expect(within(bodyRows()[0]).getAllByRole("cell")[2]).toHaveTextContent(/^$/);

    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onSubmit).toHaveBeenCalledWith("p0060", "");
    await expectNoAxeViolations(baseElement);
  }, 30_000);

  it("duplicates under a name, into its own Project — opened on its page — unless another is chosen", async () => {
    const onSubmit = vi.fn();
    mount({ projects: MANY_PROJECTS, current: "p0777", title: "Duplicate case", submitLabel: "Duplicate", initialName: "Lucena (copy)", onSubmit });
    expect(screen.getByRole("radio", { name: "Choose Project 0777" })).toBeChecked();
    expect(namesShown()[0]).toBe("Project 0751");
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("Lucena (copy)");
    await userEvent.clear(name);
    // Enter in the name submits, as a form dialog's does.
    await userEvent.type(name, "Second look{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("p0777", "Second look");
  });

  it("offers a new Project first — named, required — for a game handed over from another screen (CTA-192)", async () => {
    const onSubmit = vi.fn();
    const onNew = vi.fn();
    const { baseElement } = mount({
      title: "Open in Analysis",
      submitLabel: "Open",
      current: "",
      newProject: { initialName: "Club games", onSubmit: onNew },
      onSubmit,
    });
    expect(screen.getByRole("radio", { name: "New project" })).toBeChecked();
    expect(namesShown()).toEqual(["Caro-Kann", "Endgames", "Najdorf ideas"]);
    const name = screen.getByRole("textbox", { name: "The new project's name" });
    expect(name).toHaveValue("Club games");
    expect(screen.getByTestId("probe-into")).toHaveTextContent("Into: a new project, Club games");
    // Blank, it cannot be made.
    await userEvent.clear(name);
    expect(screen.getByRole("button", { name: "Open" })).toBeDisabled();
    await userEvent.type(name, "Fridays");
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onNew).toHaveBeenCalledWith("Fridays", "");
    expect(onSubmit).not.toHaveBeenCalled();
    await expectNoAxeViolations(baseElement);

    // A Project held instead: the name field goes, and the choice submits as ever.
    await userEvent.click(screen.getByTestId("probe-projects-pend"));
    expect(screen.queryByRole("textbox", { name: "The new project's name" })).toBeNull();
    expect(screen.getByRole("radio", { name: "New project" })).not.toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onSubmit).toHaveBeenCalledWith("pend", "");
    // And back to the new one.
    await userEvent.click(screen.getByRole("radio", { name: "New project" }));
    expect(screen.getByRole("textbox", { name: "The new project's name" })).toBeInTheDocument();
  });

  it("says why a submit was refused, under the table — and, busy, takes no choice or submit", async () => {
    const onSubmit = vi.fn();
    mount({ problem: "That could not be saved — the browser refused it.", busy: true, onSubmit });
    expect(screen.getByTestId("probe-problem")).toHaveTextContent("the browser refused it");
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Choose Endgames" })).toBeDisabled();
  });

  it("opened afresh, forgets its words, sort and choice", async () => {
    const { rerender } = mount({ excludeCurrent: true });
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a project" }), "endgames");
    await userEvent.click(screen.getByRole("radio", { name: "Choose Endgames" }));
    const props = { title: "Move 2 cases to another project", submitLabel: "Move", projects: PROJECTS, current: "pnaj", excludeCurrent: true, onSubmit: () => {}, onClose: () => {}, testId: "probe" };
    rerender(<ProjectPickerDialog open={false} {...props} />);
    rerender(<ProjectPickerDialog open {...props} />);
    expect(await screen.findByRole("searchbox", { name: "Find a project" })).toHaveValue("");
    expect(namesShown()).toEqual(["Caro-Kann", "Endgames"]);
    expect(screen.getByRole("radio", { name: "Choose Endgames" })).not.toBeChecked();
  });
});
