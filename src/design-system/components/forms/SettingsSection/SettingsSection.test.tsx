import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import SettingsSection from "./SettingsSection";

describe("SettingsSection", () => {
  it("is a region named by its overline heading, over its fields", () => {
    render(
      <SettingsSection title="Trainer" description="How it answers." testId="probe">
        <input aria-label="Delay" />
      </SettingsSection>,
    );
    expect(screen.getByRole("region", { name: "Trainer" })).toBe(screen.getByTestId("probe"));
    expect(screen.getByRole("heading", { name: "Trainer" })).toHaveClass("MuiTypography-overline");
    expect(screen.getByText("How it answers.")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("folds: the heading a disclosure, folded at first, its summary beside the title", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSection title="Engine" description="What searches." fold={{ summary: "Stockfish · depth 20" }} testId="probe">
        <input aria-label="Depth" />
      </SettingsSection>,
    );
    expect(screen.getByRole("region", { name: "Engine" })).toBe(screen.getByTestId("probe"));
    const toggle = screen.getByRole("button", { name: "Engine" });
    expect(screen.getByRole("heading", { name: "Engine" })).toContainElement(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAccessibleDescription("Stockfish · depth 20");
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).toBe(screen.getByTestId("probe-content"));
    // Folded, the fields are kept but out of reach.
    expect(screen.queryByRole("textbox", { name: "Depth" })).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("textbox", { name: "Depth" })).toBeVisible();
    expect(screen.getByText("What searches.")).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("probe"));

    // The keyboard folds it again.
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("starts open where asked, without a summary", () => {
    render(
      <SettingsSection title="Engine" fold={{ defaultExpanded: true }} testId="probe">
        <input aria-label="Depth" />
      </SettingsSection>,
    );
    const toggle = screen.getByRole("button", { name: "Engine" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByTestId("probe-summary")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Depth" })).toBeInTheDocument();
  });
});
