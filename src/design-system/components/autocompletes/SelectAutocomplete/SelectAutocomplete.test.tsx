import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import SelectAutocomplete from "./SelectAutocomplete";

const OPTIONS = [
  { value: "B90", label: "B90 Najdorf", group: "B" },
  { value: "B12", label: "B12 Caro-Kann", group: "B" },
  { value: "C42", label: "C42 Petrov", group: "C" },
];

describe("SelectAutocomplete", () => {
  it("shows the chosen option's words", () => {
    render(<SelectAutocomplete label="Opening" value="C42" onChange={() => {}} options={OPTIONS} testId="probe" />);
    expect(screen.getByTestId("probe-input")).toHaveValue("C42 Petrov");
  });

  it("groups the options under their headings, and reports the pick's value", () => {
    const onChange = vi.fn();
    render(<SelectAutocomplete label="Opening" value={null} onChange={onChange} options={OPTIONS} testId="probe" />);
    fireEvent.mouseDown(screen.getByTestId("probe-input"));
    const listbox = screen.getByRole("listbox");
    expect(listbox.querySelectorAll(".MuiAutocomplete-groupLabel")).toHaveLength(2);
    fireEvent.click(within(listbox).getByRole("option", { name: "B12 Caro-Kann" }));
    expect(onChange).toHaveBeenCalledWith("B12");
  });

  it("filters by what is typed", () => {
    render(<SelectAutocomplete label="Opening" value={null} onChange={() => {}} options={OPTIONS} testId="probe" />);
    const input = screen.getByTestId("probe-input");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "petr" } });
    expect(within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent)).toEqual(["C42 Petrov"]);
  });

  it("clears to null, and reads a value no option holds as none", () => {
    const onChange = vi.fn();
    const { unmount } = render(<SelectAutocomplete label="Opening" value="B90" onChange={onChange} options={OPTIONS} testId="probe" />);
    // MUI keeps its clear button hidden (visibility) until the field is hovered or focused.
    const clear = screen.getByTestId("probe").querySelector<HTMLButtonElement>(".MuiAutocomplete-clearIndicator");
    fireEvent.click(clear as HTMLButtonElement);
    expect(onChange).toHaveBeenCalledWith(null);
    unmount();
    render(<SelectAutocomplete label="Opening" value="gone" onChange={() => {}} options={OPTIONS} testId="probe" />);
    expect(screen.getByTestId("probe-input")).toHaveValue("");
  });
});
