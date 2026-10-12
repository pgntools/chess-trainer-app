import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CasePickerDialog from "./CasePickerDialog";
import { CASES, PROJECTS } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CasePickerDialog (CTA-188)", () => {
  it("picks a Project, then one of its Cases, and links to it", async () => {
    const onSubmit = vi.fn();
    render(<CasePickerDialog open projects={PROJECTS} cases={CASES} initialProjectId="p-najdorf" onSubmit={onSubmit} onClose={() => {}} testId="picker" />);
    const dialog = screen.getByRole("dialog", { name: "Link a case" });
    const link = within(dialog).getByRole("button", { name: "Link" });
    expect(link).toBeDisabled();
    expect(within(within(dialog).getByRole("list", { name: "Case" })).getByRole("button", { name: "White to move, move 14" })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    // A Project with nothing to pick is not offered.
    await userEvent.click(within(dialog).getByRole("combobox", { name: "Project" }));
    expect(screen.queryByRole("option", { name: "Nothing to pick" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Endgames" }));
    await userEvent.click(within(within(dialog).getByRole("list", { name: "Case" })).getByRole("button", { name: "עמדת לוסנה" }));
    await userEvent.click(link);
    expect(onSubmit).toHaveBeenCalledWith("c3");
  });

  it("says when there is nothing to link to, and a refusal", () => {
    const { rerender } = render(<CasePickerDialog open projects={PROJECTS} cases={[]} initialProjectId="p" onSubmit={() => {}} onClose={() => {}} testId="picker" />);
    expect(screen.getByTestId("picker-empty")).toHaveTextContent("There is no other case to link to.");
    rerender(<CasePickerDialog open projects={PROJECTS} cases={CASES} initialProjectId="p-najdorf" onSubmit={() => {}} onClose={() => {}} problem="Refused." testId="picker" />);
    expect(screen.getByTestId("picker-problem")).toHaveTextContent("Refused.");
  });
});
