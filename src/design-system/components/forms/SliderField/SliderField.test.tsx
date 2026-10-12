import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  describe("a number box at the slider's end (CTA-185)", () => {
    const depthInput = (onChange: (value: number) => void = () => {}) => ({ label: "Depth, typed", value: 12, onChange, min: 1, max: 24 });

    it("is named by its own label, pinned LTR, and takes the header's place for the value", () => {
      render(<SliderField label="Depth" value={12} onChange={() => {}} min={1} max={24} input={depthInput()} testId="probe" />);
      const box = screen.getByRole("spinbutton", { name: "Depth, typed" });
      expect(box).toBe(screen.getByTestId("probe-number"));
      expect(box).toHaveValue(12);
      expect(box).toHaveAttribute("dir", "ltr");
      expect(screen.queryByTestId("probe-value")).toBeNull();
      expect(screen.getByRole("slider", { name: "Depth" })).toBeInTheDocument();
    });

    it("reports a number typed, held to its bounds and to whole numbers at step 1", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SliderField label="Depth" value={12} onChange={() => {}} min={1} max={24} input={depthInput(onChange)} testId="probe" />);
      const box = screen.getByRole("spinbutton", { name: "Depth, typed" });
      await user.clear(box);
      expect(onChange).not.toHaveBeenCalled();
      await user.type(box, "30");
      expect(onChange).toHaveBeenLastCalledWith(24);
      await user.clear(box);
      await user.type(box, "7.4");
      expect(onChange).toHaveBeenLastCalledWith(7);
    });

    it("keeps a fraction at a finer step, and shows its unit", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <SliderField
          label="Move time"
          value={2}
          onChange={() => {}}
          min={0}
          max={8}
          input={{ label: "Seconds", value: 5, onChange, min: 0, max: 300, step: 0.1, unit: "s" }}
          testId="probe"
        />,
      );
      await user.clear(screen.getByRole("spinbutton", { name: "Seconds" }));
      await user.type(screen.getByRole("spinbutton", { name: "Seconds" }), "2.5");
      expect(onChange).toHaveBeenLastCalledWith(2.5);
      expect(screen.getByText("s")).toBeInTheDocument();
    });

    it("follows the value once the reader leaves it — Enter too", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SliderField label="Depth" value={12} onChange={() => {}} min={1} max={24} input={depthInput()} testId="probe" />);
      const box = screen.getByRole("spinbutton", { name: "Depth, typed" });
      await user.clear(box);
      await user.type(box, "99{Enter}");
      expect(box).toHaveValue(12);
      rerender(<SliderField label="Depth" value={20} onChange={() => {}} min={1} max={24} input={{ ...depthInput(), value: 20 }} testId="probe" />);
      expect(box).toHaveValue(20);
    });

    it("turns off on its own — the slider still live — empty with its words, and with the slider", () => {
      const { rerender } = render(
        <SliderField label="Move time" value={8} onChange={() => {}} min={0} max={8} input={{ label: "Seconds", value: undefined, onChange: () => {}, min: 0, max: 300, emptyText: "∞", disabled: true }} testId="probe" />,
      );
      expect(screen.getByRole("spinbutton", { name: "Seconds" })).toBeDisabled();
      expect(screen.getByRole("spinbutton", { name: "Seconds" })).toHaveValue(null);
      expect(screen.getByRole("spinbutton", { name: "Seconds" })).toHaveAttribute("placeholder", "∞");
      expect(screen.getByRole("slider", { name: "Move time" })).toBeEnabled();
      rerender(<SliderField label="Depth" value={12} onChange={() => {}} min={1} max={24} input={depthInput()} disabled testId="probe" />);
      expect(screen.getByRole("spinbutton", { name: "Depth, typed" })).toBeDisabled();
    });

    it("requires the box's name with it", () => {
      // @ts-expect-error — a number box without its accessible name.
      render(<SliderField label="Depth" value={12} onChange={() => {}} min={1} max={24} input={{ value: 12, onChange: () => {}, min: 1, max: 24 }} testId="probe" />);
      expect(screen.getByTestId("probe-number")).toBeInTheDocument();
    });
  });
});
