import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ViewToggle from "./ViewToggle";

const OPTIONS = [
  { value: "list", label: "List", icon: <svg /> },
  { value: "cards", label: "Cards", icon: <svg /> },
];

describe("ViewToggle", () => {
  it("is a named group of buttons, each named by its words, the one shown pressed", () => {
    render(<ViewToggle value="list" onChange={() => {}} options={OPTIONS} ariaLabel="View" testId="probe" />);
    expect(screen.getByRole("group", { name: "View" })).toBe(screen.getByTestId("probe"));
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cards" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("probe-cards")).toBe(screen.getByRole("button", { name: "Cards" }));
  });

  it("reports a real change only — the pressed button does nothing — and works from the keyboard", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ViewToggle value="list" onChange={onChange} options={OPTIONS} ariaLabel="View" testId="probe" />);
    await user.click(screen.getByRole("button", { name: "List" }));
    expect(onChange).not.toHaveBeenCalled();
    // One tab stop: the arrow keys walk the views.
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Cards" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("cards");
  });
});
