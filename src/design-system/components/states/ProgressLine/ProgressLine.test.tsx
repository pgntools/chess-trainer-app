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

  it("announces its caption as a status only when asked (CTA-109)", () => {
    const { rerender } = render(<ProgressLine label="Import progress" caption="Reading the file…" testId="probe" />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<ProgressLine label="Import progress" caption="Reading the file…" announce testId="probe" />);
    expect(screen.getByRole("status")).toHaveTextContent("Reading the file…");
    expect(screen.getByRole("progressbar", { name: "Import progress" })).toHaveAccessibleDescription("Reading the file…");
  });

  it("cannot be nameless (CTA-111)", () => {
    // @ts-expect-error — a bar's label is required.
    const nameless = <ProgressLine value={10} testId="probe" />;
    expect(nameless).toBeTruthy();
  });
});
