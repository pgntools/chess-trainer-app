import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RadioGroupField from "./RadioGroupField";

const OPTIONS = [
  { value: "merge", label: "Merge" },
  { value: "override", label: "Override" },
  { value: "skip", label: "Skip" },
] as const;

describe("RadioGroupField", () => {
  it("is a group named by its legend, described by its help, the choice checked", () => {
    render(
      <RadioGroupField label="When a folder clashes" help="Adds to the folder." options={OPTIONS} value="merge" onChange={() => {}} row testId="probe" />,
    );
    const group = screen.getByRole("radiogroup", { name: "When a folder clashes" });
    expect(group).toBe(screen.getByTestId("probe"));
    expect(group).toHaveAccessibleDescription("Adds to the folder.");
    expect(screen.getByRole("radio", { name: "Merge" })).toBeChecked();
    expect(screen.getByTestId("probe-skip")).toBe(screen.getByRole("radio", { name: "Skip" }));
  });

  it("reports a click and the arrow keys as the new choice", async () => {
    const onChange = vi.fn();
    render(<RadioGroupField label="Choice" options={OPTIONS} value="merge" onChange={onChange} testId="probe" />);
    await userEvent.click(screen.getByRole("radio", { name: "Override" }));
    expect(onChange).toHaveBeenLastCalledWith("override");
    screen.getByRole("radio", { name: "Merge" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("override");
  });

  it("turns a choice, or the whole group, off", () => {
    const { rerender } = render(
      <RadioGroupField label="Choice" options={[...OPTIONS.slice(0, 2), { value: "skip", label: "Skip", disabled: true }]} value="merge" onChange={() => {}} testId="probe" />,
    );
    expect(screen.getByRole("radio", { name: "Skip" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Merge" })).toBeEnabled();
    rerender(<RadioGroupField label="Choice" options={OPTIONS} value="merge" onChange={() => {}} disabled testId="probe" />);
    expect(screen.getByRole("radio", { name: "Merge" })).toBeDisabled();
  });

  it("cannot be nameless (CTA-111)", () => {
    // @ts-expect-error — a group's label is required.
    const nameless = <RadioGroupField options={OPTIONS} value="merge" onChange={() => {}} testId="probe" />;
    expect(nameless).toBeTruthy();
  });

  it("takes a radio's own test id (CTA-113)", () => {
    render(
      <RadioGroupField label="Choice" options={OPTIONS} value="merge" onChange={() => {}} testId="probe" optionTestId={(value) => `mine-${value}`} />,
    );
    expect(screen.getByTestId("mine-skip")).toBe(screen.getByRole("radio", { name: "Skip" }));
    expect(screen.queryByTestId("probe-skip")).toBeNull();
  });
});
