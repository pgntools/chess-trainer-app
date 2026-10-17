import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CasePickerDialog, { type PickableCase } from "./CasePickerDialog";
import { CASES, PROJECTS } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const optionsShown = () => within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent);

describe("CasePickerDialog (CTA-188; autocompletes since CTA-199)", () => {
  it("finds a Project, then one of its Cases, by typing — and links to it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CasePickerDialog open projects={PROJECTS} cases={CASES} initialProjectId="p-najdorf" onSubmit={onSubmit} onClose={() => {}} testId="picker" />);
    const dialog = screen.getByRole("dialog", { name: "Link a case" });
    const link = within(dialog).getByRole("button", { name: "Link" });
    expect(link).toBeDisabled();
    // The Case's own Project first; its Cases only.
    expect(within(dialog).getByRole("combobox", { name: "Project" })).toHaveValue("Najdorf studies");
    const caseField = within(dialog).getByRole("combobox", { name: "Case" });
    await user.click(caseField);
    expect(optionsShown()).toEqual(["Carlsen – Caruana, Norway Chess, 2024", "White to move, move 14"]);
    await user.keyboard("{Escape}");
    await expectNoAxeViolations(dialog);

    // A Project with nothing to pick is not offered; another found by typing.
    const projectField = within(dialog).getByRole("combobox", { name: "Project" });
    await user.clear(projectField);
    await user.type(projectField, "end");
    expect(optionsShown()).toEqual(["Endgames"]);
    await user.click(screen.getByRole("option", { name: "Endgames" }));
    await user.click(caseField);
    expect(optionsShown()).toEqual(["עמדת לוסנה"]);
    await user.click(screen.getByRole("option", { name: "עמדת לוסנה" }));
    await user.click(link);
    expect(onSubmit).toHaveBeenCalledWith("c3");
  });

  it("searches every Project, under their names, while none is chosen", async () => {
    const user = userEvent.setup();
    render(<CasePickerDialog open projects={PROJECTS} cases={CASES} initialProjectId="p-gone" onSubmit={() => {}} onClose={() => {}} testId="picker" />);
    const dialog = screen.getByRole("dialog", { name: "Link a case" });
    expect(within(dialog).getByRole("combobox", { name: "Project" })).toHaveValue("");
    await user.type(within(dialog).getByRole("combobox", { name: "Case" }), "move");
    expect(optionsShown()).toEqual(["White to move, move 14"]);
    expect(screen.getByRole("listbox").querySelector(".MuiAutocomplete-groupLabel")).toHaveTextContent("Najdorf studies");
    // Picked: its Project becomes the chosen one.
    await user.click(screen.getByRole("option", { name: "White to move, move 14" }));
    expect(within(dialog).getByRole("combobox", { name: "Project" })).toHaveValue("Najdorf studies");
  });

  it("finds a Case by its id, or its address pasted, in any Project", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CasePickerDialog open projects={PROJECTS} cases={CASES} initialProjectId="p-najdorf" onSubmit={onSubmit} onClose={() => {}} testId="picker" />);
    const dialog = screen.getByRole("dialog", { name: "Link a case" });
    const caseField = within(dialog).getByRole("combobox", { name: "Case" });

    // Its id — from Endgames, while Najdorf studies is chosen.
    await user.click(caseField);
    await user.paste("c3");
    expect(optionsShown()).toEqual(["עמדת לוסנה"]);
    await user.click(screen.getByRole("option", { name: "עמדת לוסנה" }));
    expect(within(dialog).getByRole("combobox", { name: "Project" })).toHaveValue("Endgames");
    await user.click(within(dialog).getByRole("button", { name: "Link" }));
    expect(onSubmit).toHaveBeenLastCalledWith("c3");

    // Its address, as the address bar shows it.
    await user.clear(caseField);
    await user.paste("https://chessapp.dev/analysis/projects/p-najdorf/cases/c2?view=list");
    expect(optionsShown()).toEqual(["White to move, move 14"]);
  });

  it("lists at most 50 Cases at once — typing narrows thousands", async () => {
    const user = userEvent.setup();
    const many: PickableCase[] = Array.from({ length: 3000 }, (_, index) => ({
      id: `m${index}`,
      projectId: "p-najdorf",
      name: `Case ${String(index).padStart(4, "0")}`,
      type: "position",
    }));
    render(<CasePickerDialog open projects={PROJECTS} cases={many} initialProjectId="p-najdorf" onSubmit={() => {}} onClose={() => {}} testId="picker" />);
    const caseField = within(screen.getByRole("dialog", { name: "Link a case" })).getByRole("combobox", { name: "Case" });
    await user.click(caseField);
    expect(optionsShown()).toHaveLength(50);
    await user.type(caseField, "2999");
    expect(optionsShown()).toEqual(["Case 2999"]);
  });

  it("says when there is nothing to link to, and a refusal", () => {
    const { rerender } = render(<CasePickerDialog open projects={PROJECTS} cases={[]} initialProjectId="p" onSubmit={() => {}} onClose={() => {}} testId="picker" />);
    expect(screen.getByTestId("picker-empty")).toHaveTextContent("There is no other case to link to.");
    rerender(<CasePickerDialog open projects={PROJECTS} cases={CASES} initialProjectId="p-najdorf" onSubmit={() => {}} onClose={() => {}} problem="Refused." testId="picker" />);
    expect(screen.getByTestId("picker-problem")).toHaveTextContent("Refused.");
  });
});
