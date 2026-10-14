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

  it("shows an option with no icon as its words, which name its button (CTA-204)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const words = [
      { value: "lichess", label: "Lichess points" },
      { value: "game", label: "Game points" },
    ];
    render(<ViewToggle value="lichess" onChange={onChange} options={words} ariaLabel="Scoring" testId="probe" />);
    expect(screen.getByRole("group", { name: "Scoring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lichess points" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("probe-game")).toHaveTextContent("Game points");
    await user.click(screen.getByRole("button", { name: "Game points" }));
    expect(onChange).toHaveBeenCalledWith("game");
  });
});
