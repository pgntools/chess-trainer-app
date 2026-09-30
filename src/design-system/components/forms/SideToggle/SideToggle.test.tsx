import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import SideToggle, { type SideValue } from "./SideToggle";

const labels = { white: "White", black: "Black", all: "All" };

describe("SideToggle", () => {
  it("chooses a side, and swallows a click on the pressed one", () => {
    const onChange = vi.fn();
    render(<SideToggle value="white" onChange={onChange} labels={labels} ariaLabel="Side" testId="probe" />);
    expect(screen.getByTestId("probe-white")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("probe-black"));
    expect(onChange).toHaveBeenCalledWith("black");
    fireEvent.click(screen.getByTestId("probe-white"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("has two buttons, or three with “all” first", () => {
    const { unmount } = render(<SideToggle value="white" onChange={() => {}} labels={labels} ariaLabel="Side" testId="probe" />);
    expect(within(screen.getByRole("group", { name: "Side" })).getAllByRole("button")).toHaveLength(2);
    unmount();
    render(<SideToggle<SideValue> value="all" onChange={() => {}} labels={labels} withAll ariaLabel="Side" testId="probe" />);
    const buttons = within(screen.getByRole("group", { name: "Side" })).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["All", "White", "Black"]);
  });

  it("takes its buttons' own test ids (CTA-113)", () => {
    render(<SideToggle value="white" onChange={() => {}} labels={{ white: "White", black: "Black" }} ariaLabel="Side" buttonTestIds={{ white: "turn-w", black: "turn-b" }} testId="probe" />);
    expect(screen.getByTestId("turn-w")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("turn-b")).toHaveAttribute("aria-pressed", "false");
  });
});
