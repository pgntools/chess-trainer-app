import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ProgressLine from "./ProgressLine";

describe("ProgressLine", () => {
  it("draws its value, named by its caption", () => {
    render(<ProgressLine value={42} caption="42%" testId="probe" />);
    expect(screen.getByRole("progressbar", { name: "42%" })).toHaveAttribute("aria-valuenow", "42");
  });

  it("clamps its value, and is indeterminate without one", () => {
    const { rerender } = render(<ProgressLine value={140} testId="probe" />);
    expect(screen.getByTestId("probe-bar")).toHaveAttribute("aria-valuenow", "100");
    rerender(<ProgressLine testId="probe" />);
    expect(screen.getByTestId("probe-bar")).not.toHaveAttribute("aria-valuenow");
  });
});
