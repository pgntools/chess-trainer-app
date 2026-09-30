import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import { COUNTS, MESSAGE } from "./fixtures";
import FolderDeleteDialog from "./FolderDeleteDialog";

const mount = (counts?: string) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <FolderDeleteDialog open title="Delete folder: Openings" message={MESSAGE} counts={counts} confirmLabel="Delete folder" cancelLabel="Cancel" onConfirm={onConfirm} onClose={onClose} testId="probe" />,
  );
  return { onConfirm, onClose };
};

describe("FolderDeleteDialog", () => {
  it("says the contents stay, with the counts, and confirms in red", async () => {
    mount(COUNTS);
    expect(screen.getByRole("dialog", { name: "Delete folder: Openings" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-delete-text")).toHaveTextContent(MESSAGE);
    expect(screen.getByTestId("probe-delete-counts")).toHaveTextContent(COUNTS);
    const confirm = screen.getByRole("button", { name: "Delete folder" });
    expect(confirm.className).toMatch(/MuiButton-contained/);
    expect(confirm.className).toMatch(/MuiButton-colorError/);
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("deletes, then closes; cancels from the keyboard", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = mount();
    expect(screen.queryByTestId("probe-delete-counts")).toBeNull();
    await user.click(screen.getByTestId("probe-delete-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    screen.getByTestId("probe-delete-cancel").focus();
    await user.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
