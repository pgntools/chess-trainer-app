import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ToggleIconAction from "./ToggleIconAction";

describe("ToggleIconAction", () => {
  it("is quiet and unpressed while there is nothing to do", () => {
    render(
      <ToggleIconAction label="Save" active={false} onClick={() => {}} testId="probe">
        <svg />
      </ToggleIconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("probe").className).not.toMatch(/colorPrimary/);
  });

  it("lights up and is pressed while active, and acts on a click", () => {
    const onClick = vi.fn();
    render(
      <ToggleIconAction label="Save" active onClick={onClick} testId="probe">
        <svg />
      </ToggleIconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("probe").className).toMatch(/colorPrimary/);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("lights up while active, and says pressed as it is told — or nothing, for a dialog (CTA-113)", () => {
    const { rerender } = render(
      <ToggleIconAction label="Save" onClick={() => {}} active pressed={false} testId="probe">
        <svg />
      </ToggleIconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("probe").className).toMatch(/colorPrimary/);
    rerender(
      <ToggleIconAction label="Save" onClick={() => {}} active pressed={null} testId="probe">
        <svg />
      </ToggleIconAction>,
    );
    expect(screen.getByTestId("probe")).not.toHaveAttribute("aria-pressed");
    expect(screen.getByTestId("probe").className).toMatch(/colorPrimary/);
  });
});
