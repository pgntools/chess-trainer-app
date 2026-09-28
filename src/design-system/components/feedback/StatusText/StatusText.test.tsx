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
});
