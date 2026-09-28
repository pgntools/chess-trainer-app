import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import StatusText from "./StatusText";

describe("StatusText", () => {
  it("announces an error at once, as an alert", () => {
    render(<StatusText tone="error" testId="probe">The save failed.</StatusText>);
    expect(screen.getByRole("alert")).toBe(screen.getByTestId("probe"));
  });

  it("announces anything else as a status", () => {
    render(<StatusText tone="success" testId="probe">Saved.</StatusText>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("states a neutral outcome, emphasised, as a status (CTA-109)", () => {
    render(<StatusText tone="neutral" emphasis testId="probe">Game over · 1-0</StatusText>);
    const line = screen.getByRole("status");
    expect(line).toBe(screen.getByTestId("probe"));
    expect(line).toHaveClass("MuiTypography-body2");
    expect(line).toHaveStyle({ fontWeight: "600" });
  });
});
