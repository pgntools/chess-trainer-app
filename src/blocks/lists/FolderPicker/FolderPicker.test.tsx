import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FOLDERS } from "./fixtures";
import FolderPicker from "./FolderPicker";

const mount = (props: Partial<Parameters<typeof FolderPicker>[0]> = {}) =>
  render(
    <FolderPicker
      folders={FOLDERS}
      value={null}
      onChange={() => {}}
      noneLabel="Unfiled"
      untitledLabel="Untitled"
      ariaLabel="Folder"
      testId="probe-picker"
      {...props}
    />,
  );

describe("FolderPicker", () => {
  it("lists none, then every folder parent first, named, with the chosen one marked", () => {
    mount({ value: "gsicilian" });
    const list = screen.getByRole("list", { name: "Folder" });
    expect(within(list).getAllByRole("button").map((row) => row.textContent)).toEqual([
      "Unfiled",
      "Untitled",
      "Endgames",
      "Openings",
      "Sicilian",
      "Najdorf",
    ]);
    expect(screen.getByTestId("probe-picker-gsicilian")).toHaveAttribute("aria-current", "true");
  });

  it("leaves out what it is told to, and takes the none row's own id", () => {
    mount({ exclude: ["gopenings", "gsicilian", "gnajdorf"], noneTestId: "move-top" });
    expect(screen.queryByTestId("probe-picker-gsicilian")).toBeNull();
    expect(screen.getByTestId("move-top")).toHaveTextContent("Unfiled");
  });

  it("picks from the keyboard", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    mount({ onChange });
    await user.tab();
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("gendgames");
  });
});
