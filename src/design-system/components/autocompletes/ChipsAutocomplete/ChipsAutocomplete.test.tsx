import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import ChipsAutocomplete from "./ChipsAutocomplete";

const PLAYERS = ["Tal, Mikhail", "Fischer, Robert James", "Petrosian, Tigran"];

describe("ChipsAutocomplete", () => {
  it("shows the chosen names as chips", () => {
    render(<ChipsAutocomplete label="Players" value={["Tal, Mikhail", "Smyslov, Vasily"]} onChange={() => {}} options={PLAYERS} testId="probe" />);
    const chips = screen.getByTestId("probe").querySelectorAll(".MuiChip-root");
    expect([...chips].map((chip) => chip.textContent)).toEqual(["Tal, Mikhail", "Smyslov, Vasily"]);
    expect(chips[1]).toHaveAttribute("dir", "auto");
  });

  it("adds a suggestion, and leaves chosen names out of the list", () => {
    const onChange = vi.fn();
    render(<ChipsAutocomplete label="Players" value={["Tal, Mikhail"]} onChange={onChange} options={PLAYERS} testId="probe" />);
    fireEvent.mouseDown(screen.getByTestId("probe-input"));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Fischer, Robert James", "Petrosian, Tigran"]);
    fireEvent.click(options[1]);
    expect(onChange).toHaveBeenCalledWith(["Tal, Mikhail", "Petrosian, Tigran"]);
  });

  it("makes typed words a chip on Enter, trimmed", () => {
    const onChange = vi.fn();
    render(<ChipsAutocomplete label="Players" value={[]} onChange={onChange} options={PLAYERS} testId="probe" />);
    const input = screen.getByTestId("probe-input");
    fireEvent.change(input, { target: { value: "  carl " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["carl"]);
  });

  it("asks for fresh options as the list opens", () => {
    const onOpen = vi.fn();
    render(<ChipsAutocomplete label="Players" value={[]} onChange={() => {}} options={PLAYERS} onOpen={onOpen} testId="probe" />);
    fireEvent.mouseDown(screen.getByTestId("probe-input"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("removes a chip from its delete icon", () => {
    const onChange = vi.fn();
    render(<ChipsAutocomplete label="Players" value={["Tal, Mikhail", "Fischer, Robert James"]} onChange={onChange} options={PLAYERS} testId="probe" />);
    const deleteIcons = screen.getByTestId("probe").querySelectorAll(".MuiChip-deleteIcon");
    fireEvent.click(deleteIcons[0]);
    expect(onChange).toHaveBeenCalledWith(["Fischer, Robert James"]);
  });
});
