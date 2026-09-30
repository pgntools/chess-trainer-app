import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import CheckboxField from "./CheckboxField";

describe("CheckboxField", () => {
  it("puts the test id on the input and reports the new state", () => {
    const onChange = vi.fn();
    render(<CheckboxField label="games" checked onChange={onChange} testId="probe" />);
    expect(screen.getByRole("checkbox", { name: "games" })).toBe(screen.getByTestId("probe"));
    fireEvent.click(screen.getByTestId("probe"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("puts the test id on the checkbox around the input instead, when asked (CTA-109)", () => {
    render(<CheckboxField label="games" checked onChange={() => {}} testId="probe" testIdOn="control" />);
    const control = screen.getByTestId("probe");
    expect(control.tagName).not.toBe("INPUT");
    expect(control.querySelector("input")).toBe(screen.getByRole("checkbox", { name: "games" }));
  });

  it("is described by its help, and can be indeterminate", () => {
    render(<CheckboxField label="All" help="Every category." indeterminate checked={false} onChange={() => {}} testId="probe" />);
    expect(screen.getByRole("checkbox", { name: "All" })).toHaveAccessibleDescription("Every category.");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-indeterminate", "true");
  });
});
