import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import { FOLDERS, MOVE_LABELS, SICILIAN_SUBTREE } from "./fixtures";
import FolderMoveDialog from "./FolderMoveDialog";

describe("FolderMoveDialog", () => {
  it("offers every folder but the moved one's subtree, and moves on a pick", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<FolderMoveDialog open folders={FOLDERS} current="gopenings" exclude={SICILIAN_SUBTREE} onMove={onMove} onClose={() => {}} labels={MOVE_LABELS} testId="probe" />);
    const dialog = screen.getByRole("dialog", { name: "Move folder" });
    expect(within(dialog).getAllByRole("listitem").map((row) => row.textContent)).toEqual(["Top level", "Endgames", "Openings"]);
    expect(screen.getByTestId("probe-picker-gopenings")).toHaveAttribute("aria-current", "true");
    await user.click(screen.getByTestId("probe-move-top"));
    expect(onMove).toHaveBeenCalledWith(null);
    await expectNoAxeViolations(dialog);
  });

  it("cancels", async () => {
    const onClose = vi.fn();
    render(<FolderMoveDialog open folders={FOLDERS} current={null} onMove={() => {}} onClose={onClose} labels={MOVE_LABELS} testId="probe" />);
    await userEvent.click(screen.getByTestId("probe-move-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
