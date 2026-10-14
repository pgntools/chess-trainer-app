import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { expectNoAxeViolations } from "../../../../test/axe";
import ProgressChip from "./ProgressChip";

describe("ProgressChip", () => {
  it("is a progress bar named by its progress label, its words in view and its fill as far as its value", async () => {
    render(<ProgressChip label="Depth 18/24" value={75} progressLabel="Depth 18 of 24" testId="probe" />);
    const chip = screen.getByRole("progressbar", { name: "Depth 18 of 24" });
    expect(chip).toHaveAttribute("aria-valuenow", "75");
    expect(chip).toHaveAttribute("aria-valuemin", "0");
    expect(chip).toHaveAttribute("aria-valuemax", "100");
    expect(chip).toHaveTextContent("Depth 18/24");
    expect(screen.getByTestId("probe-fill")).toHaveAttribute("data-value", "75");
    // Named, not announced: no live region of its own.
    expect(chip).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("status")).toBeNull();
    await expectNoAxeViolations();
  });

  it("clamps its value to 0–100", () => {
    const { rerender } = render(<ProgressChip label="Depth 30/24" value={140} progressLabel="Depth 30 of 24" testId="probe" />);
    expect(screen.getByRole("progressbar", { name: "Depth 30 of 24" })).toHaveAttribute("aria-valuenow", "100");
    rerender(<ProgressChip label="Depth 0/24" value={-5} progressLabel="Depth 0 of 24" testId="probe" />);
    expect(screen.getByRole("progressbar", { name: "Depth 0 of 24" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("without a value is a plain chip — no progress bar, no fill", async () => {
    render(<ProgressChip label="Depth 24" testId="probe" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByTestId("probe-fill")).toBeNull();
    expect(screen.getByTestId("probe")).toHaveTextContent("Depth 24");
    await expectNoAxeViolations();
  });

  it("cannot be a nameless progress (CTA-111)", () => {
    // @ts-expect-error — a value needs its progress label.
    const nameless = <ProgressChip label="Depth 18/24" value={75} testId="probe" />;
    expect(nameless).toBeTruthy();
  });
});
