import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SwitchField from "./SwitchField";

describe("SwitchField", () => {
  it("puts the test id on the input and reports the new state", () => {
    const onChange = vi.fn();
    render(<SwitchField label="Eval bar" checked={false} onChange={onChange} testId="probe" />);
    const input = screen.getByTestId("probe");
    expect(input.tagName).toBe("INPUT");
    expect(screen.getByRole("switch", { name: "Eval bar" })).toBe(input);
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("puts the test id on the switch around the input instead, when asked (CTA-109)", () => {
    const onChange = vi.fn();
    render(<SwitchField label="Engine" checked={false} onChange={onChange} testId="probe" testIdOn="control" />);
    const control = screen.getByTestId("probe");
    expect(control.tagName).not.toBe("INPUT");
    expect(control.querySelector("input")).toBe(screen.getByRole("switch", { name: "Engine" }));
    fireEvent.click(control.querySelector("input")!);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("describes the switch by its help caption", () => {
    render(<SwitchField label="Lines" help="The engine's best lines." checked onChange={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe-help")).toHaveTextContent("The engine's best lines.");
    expect(screen.getByRole("switch", { name: "Lines" })).toHaveAccessibleDescription("The engine's best lines.");
  });

  it("has no caption without help, and turns off", () => {
    render(<SwitchField label="Lines" checked onChange={() => {}} disabled size="small" testId="probe" />);
    expect(screen.queryByTestId("probe-help")).toBeNull();
    expect(screen.getByTestId("probe")).toBeDisabled();
  });
});
