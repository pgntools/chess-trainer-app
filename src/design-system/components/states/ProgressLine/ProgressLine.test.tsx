import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ProgressLine from "./ProgressLine";

describe("ProgressLine", () => {
  it("draws its value, named by its label and described by its caption", () => {
    render(<ProgressLine value={42} label="Import progress" caption="420 of 1,000 games" testId="probe" />);
    const bar = screen.getByRole("progressbar", { name: "Import progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAccessibleDescription("420 of 1,000 games");
  });

  it("clamps its value, and is indeterminate without one", () => {
    const { rerender } = render(<ProgressLine value={140} label="Import progress" testId="probe" />);
    expect(screen.getByRole("progressbar", { name: "Import progress" })).toHaveAttribute("aria-valuenow", "100");
    rerender(<ProgressLine label="Import progress" testId="probe" />);
    expect(screen.getByRole("progressbar", { name: "Import progress" })).not.toHaveAttribute("aria-valuenow");
  });

  it("cannot be nameless (CTA-111)", () => {
    // @ts-expect-error — a bar's label is required.
    const nameless = <ProgressLine value={10} testId="probe" />;
    expect(nameless).toBeTruthy();
  });
});
