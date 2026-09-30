import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import DateRangeFields from "./DateRangeFields";

describe("DateRangeFields", () => {
  it("bounds each end by the other", () => {
    render(
      <DateRangeFields value={{ from: "1960-01-01", to: "1961-12-31" }} onChange={() => {}} fromLabel="From" toLabel="To" testId="probe" />,
    );
    expect(screen.getByTestId("probe-from")).toHaveAttribute("max", "1961-12-31");
    expect(screen.getByTestId("probe-to")).toHaveAttribute("min", "1960-01-01");
    expect(screen.getByTestId("probe-from")).toHaveAttribute("dir", "ltr");
  });

  it("leaves an end unbounded while the other is open", () => {
    render(<DateRangeFields value={{ from: "", to: "" }} onChange={() => {}} fromLabel="From" toLabel="To" testId="probe" />);
    expect(screen.getByTestId("probe-from")).not.toHaveAttribute("max");
    expect(screen.getByTestId("probe-to")).not.toHaveAttribute("min");
  });

  it("reports the whole range when one end changes", () => {
    const onChange = vi.fn();
    render(<DateRangeFields value={{ from: "", to: "1961-12-31" }} onChange={onChange} fromLabel="From" toLabel="To" testId="probe" />);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "1960-05-12" } });
    expect(onChange).toHaveBeenCalledWith({ from: "1960-05-12", to: "1961-12-31" });
  });

  it("keeps both ends inside the bounds, and takes the inputs' own test ids (CTA-113)", () => {
    const { rerender } = render(
      <DateRangeFields
        value={{ from: "", to: "" }}
        onChange={() => {}}
        fromLabel="From"
        toLabel="To"
        bounds={{ min: "1950-01-01", max: "1970-12-31" }}
        testId="probe"
        inputTestIds={{ from: "mine-from", to: "mine-to" }}
      />,
    );
    expect(screen.getByTestId("mine-from")).toHaveAttribute("min", "1950-01-01");
    expect(screen.getByTestId("mine-from")).toHaveAttribute("max", "1970-12-31");
    expect(screen.getByTestId("mine-to")).toHaveAttribute("min", "1950-01-01");
    expect(screen.getByTestId("mine-to")).toHaveAttribute("max", "1970-12-31");
    // A set end bounds the other more tightly than the range does.
    rerender(
      <DateRangeFields
        value={{ from: "1960-01-01", to: "1961-12-31" }}
        onChange={() => {}}
        fromLabel="From"
        toLabel="To"
        bounds={{ min: "1950-01-01", max: "1970-12-31" }}
        testId="probe"
        inputTestIds={{ from: "mine-from", to: "mine-to" }}
      />,
    );
    expect(screen.getByTestId("mine-from")).toHaveAttribute("max", "1961-12-31");
    expect(screen.getByTestId("mine-to")).toHaveAttribute("min", "1960-01-01");
  });
});
