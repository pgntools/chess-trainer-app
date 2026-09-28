import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FOLDER, labelsFor } from "./fixtures";
import FolderActions from "./FolderActions";

describe("FolderActions", () => {
  it("shows the actions it is given, in the one order, each named and id'd for its folder", () => {
    render(
      <FolderActions
        folderId={FOLDER.id}
        on={{ delete: () => {}, download: () => {}, rename: () => {} }}
        labels={labelsFor("Openings")}
        disabled={{ download: true }}
        testId="probe-folder"
      />,
    );
    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Download Openings",
      "Rename Openings",
      "Delete Openings",
    ]);
    expect(screen.getByTestId("probe-folder-download-gopenings")).toBeDisabled();
    expect(screen.queryByTestId("probe-folder-move-gopenings")).toBeNull();
  });

  it("runs each from the keyboard", async () => {
    const rename = vi.fn();
    const remove = vi.fn();
    const user = userEvent.setup();
    render(<FolderActions folderId="g1" on={{ rename, delete: remove }} labels={labelsFor("x")} testId="probe" />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(rename).toHaveBeenCalledTimes(1);
    await user.tab();
    await user.keyboard(" ");
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
