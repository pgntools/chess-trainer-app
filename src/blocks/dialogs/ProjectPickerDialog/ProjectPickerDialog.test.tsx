import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { PROJECTS } from "./fixtures";
import ProjectPickerDialog, { type ProjectPickerDialogProps } from "./ProjectPickerDialog";

const mount = (props: Partial<ProjectPickerDialogProps> = {}) =>
  render(
    <ProjectPickerDialog
      open
      title="Move case to another project"
      submitLabel="Move"
      projects={PROJECTS}
      current="pnaj"
      onSubmit={() => {}}
      onClose={() => {}}
      testId="probe"
      {...props}
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectPickerDialog (CTA-186)", () => {
  it("moves to a Project picked by name — not the one it is in", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = mount({ excludeCurrent: true, onSubmit });
    const list = screen.getByRole("list", { name: "Project" });
    expect(within(list).getAllByRole("button").map((row) => row.textContent)).toEqual(["Caro-Kann", "Endgames"]);
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    await userEvent.click(within(list).getByRole("button", { name: "Endgames" }));
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onSubmit).toHaveBeenCalledWith("pend", "");
    await expectNoAxeViolations(baseElement);
  });

  it("duplicates under a name, into its own Project unless another is picked", async () => {
    const onSubmit = vi.fn();
    mount({ title: "Duplicate case", submitLabel: "Duplicate", initialName: "Lucena (copy)", onSubmit });
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("Lucena (copy)");
    await userEvent.clear(name);
    await userEvent.type(name, "Second look");
    await userEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(onSubmit).toHaveBeenCalledWith("pnaj", "Second look");
  });
});
