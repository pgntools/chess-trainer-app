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

  it("with a second value draws it as a strip of its own beside the fill — still one progress bar, named once (CTA-251)", async () => {
    render(
      <ProgressChip
        label="Depth 18/24"
        value={75}
        secondaryValue={60}
        progressLabel="Depth 18 of 24, 3 of 5 seconds"
        testId="probe"
      />,
    );
    const chip = screen.getByRole("progressbar", { name: "Depth 18 of 24, 3 of 5 seconds" });
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    // The bar's value is the first measure's; the second is the strip's alone.
    expect(chip).toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByTestId("probe-fill")).toHaveAttribute("data-value", "75");
    const strip = screen.getByTestId("probe-secondary-fill");
    expect(strip).toHaveAttribute("data-value", "60");
    expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(chip).toContainElement(strip);
    expect(chip).not.toHaveAttribute("aria-live");
    await expectNoAxeViolations();
  });

  it("clamps its second value to 0–100", () => {
    const { rerender } = render(
      <ProgressChip label="Depth 6/24" value={25} secondaryValue={130} progressLabel="Depth 6 of 24" testId="probe" />,
    );
    expect(screen.getByTestId("probe-secondary-fill")).toHaveAttribute("data-value", "100");
    rerender(<ProgressChip label="Depth 6/24" value={25} secondaryValue={-10} progressLabel="Depth 6 of 24" testId="probe" />);
    expect(screen.getByTestId("probe-secondary-fill")).toHaveAttribute("data-value", "0");
  });

  it("without a second value has no strip", () => {
    render(<ProgressChip label="Depth 18/24" value={75} progressLabel="Depth 18 of 24" testId="probe" />);
    expect(screen.queryByTestId("probe-secondary-fill")).toBeNull();
  });

  it("cannot have a second value without a first (CTA-251)", () => {
    // @ts-expect-error — a second value goes with a value and its progress label.
    const stripOnly = <ProgressChip label="Depth 18" secondaryValue={50} testId="probe" />;
    expect(stripOnly).toBeTruthy();
  });

  it("cannot be a nameless progress (CTA-111)", () => {
    // @ts-expect-error — a value needs its progress label.
    const nameless = <ProgressChip label="Depth 18/24" value={75} testId="probe" />;
    expect(nameless).toBeTruthy();
  });
});
