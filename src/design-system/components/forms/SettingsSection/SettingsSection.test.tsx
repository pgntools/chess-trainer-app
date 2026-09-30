import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

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
  });
});
