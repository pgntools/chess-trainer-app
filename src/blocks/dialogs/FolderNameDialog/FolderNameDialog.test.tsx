import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import { NAME_LABELS, RENAMED } from "./fixtures";
import FolderNameDialog from "./FolderNameDialog";

const mount = (initial = "") => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <FolderNameDialog open title="New folder" initial={initial} onSave={onSave} onClose={onClose} labels={NAME_LABELS} testId="probe" />,
  );
  return { onSave, onClose, ...view };
};

describe("FolderNameDialog", () => {
  it("is a dialog named by its title, its field focused and named", async () => {
    mount();
    expect(screen.getByRole("dialog", { name: "New folder" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Folder name" })).toHaveFocus();
    expect(screen.getByTestId("probe-name-save")).toBeDisabled();
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("saves a typed name on Enter and closes", async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = mount();
    await user.keyboard("Sicilian{Enter}");
    expect(onSave).toHaveBeenCalledWith("Sicilian");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("will not save a blank name, and starts from the folder's own when renaming", async () => {
    const user = userEvent.setup();
    const { onSave } = mount(RENAMED.name);
    expect(screen.getByTestId("probe-name-input")).toHaveValue("Openings");
    await user.clear(screen.getByTestId("probe-name-input"));
    await user.keyboard("   {Enter}");
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("probe-name-cancel"));
  });

  it("is re-seeded every time it opens", () => {
    const { rerender } = mount("A");
    const props = { title: "Rename", onSave: () => {}, onClose: () => {}, labels: NAME_LABELS, testId: "probe" };
    rerender(<FolderNameDialog open={false} initial="B" {...props} />);
    rerender(<FolderNameDialog open initial="B" {...props} />);
    expect(screen.getByTestId("probe-name-input")).toHaveValue("B");
  });
});
