import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SliderField from "./SliderField";

describe("SliderField", () => {
  it("heads the slider with its label and its value, pinned LTR", () => {
    render(<SliderField label="Depth" value={12} onChange={() => {}} min={1} max={24} testId="probe" />);
    expect(screen.getByTestId("probe-value")).toHaveTextContent("12");
    expect(screen.getByTestId("probe-value")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("slider", { name: "Depth" })).toBe(screen.getByTestId("probe-input"));
  });

  it("reports a new value as a number", () => {
    const onChange = vi.fn();
    render(<SliderField label="Depth" value={12} onChange={onChange} min={1} max={24} testId="probe" />);
    fireEvent.change(screen.getByTestId("probe-input"), { target: { value: "15" } });
    expect(onChange).toHaveBeenCalledWith(15);
  });

  it("shows the caller's value words and a notice, and turns off", () => {
    render(
      <SliderField label="Threads" value={1} onChange={() => {}} min={1} max={1} valueLabel="one" notice="Fixed." disabled testId="probe" />,
    );
    expect(screen.getByTestId("probe-value")).toHaveTextContent("one");
    expect(screen.getByTestId("probe-notice")).toHaveTextContent("Fixed.");
    // Why it is off is never dimmed with it (CTA-109) — a faded warning fails AA.
    expect(screen.getByTestId("probe")).not.toHaveStyle({ opacity: "0.6" });
    expect(screen.getByTestId("probe-notice")).not.toHaveStyle({ opacity: "0.6" });
    expect(screen.getByTestId("probe-input").closest(".MuiSlider-root")).toHaveStyle({ opacity: "0.6" });
    // Nor is the header (CTA-142): its secondary-coloured value would fall below 4.5:1.
    expect(screen.getByTestId("probe-value").parentElement).not.toHaveStyle({ opacity: "0.6" });
    expect(screen.getByTestId("probe-input")).toBeDisabled();
  });

  it("draws labelled marks on the slider (CTA-163)", () => {
    render(
      <SliderField
        label="Hash (MB)"
        value={16}
        onChange={() => {}}
        min={1}
        max={1024}
        marks={[
          { value: 128, label: "128" },
          { value: 512, label: "512" },
        ]}
        testId="probe"
      />,
    );
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("512")).toBeInTheDocument();
    // The marks are MUI's, not extra form controls.
    expect(screen.getByText("512")).toHaveClass("MuiSlider-markLabel");
  });

  it("shows a neutral help caption, dimmed never (CTA-163)", () => {
    render(
      <SliderField label="Hash (MB)" value={16} onChange={() => {}} min={1} max={1024} help="Engine memory (RAM)" notice="Fixed." disabled testId="probe" />,
    );
    expect(screen.getByTestId("probe-help")).toHaveTextContent("Engine memory (RAM)");
    // Like the notice (CTA-109) and the header (CTA-142): only the slider fades.
    expect(screen.getByTestId("probe-help")).not.toHaveStyle({ opacity: "0.6" });
    expect(screen.getByTestId("probe-notice")).toHaveTextContent("Fixed.");
  });

  it("tells a screen reader the value as words (CTA-163)", () => {
    render(
      <SliderField label="Move time" value={8} onChange={() => {}} min={0} max={8} valueLabel="No limit" valueText="No limit" testId="probe" />,
    );
    expect(screen.getByTestId("probe-input")).toHaveAttribute("aria-valuetext", "No limit");
  });
});
