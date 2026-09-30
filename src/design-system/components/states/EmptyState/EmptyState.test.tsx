import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("says the list is empty, with its action", () => {
    render(
      <EmptyState action={<button>New analysis</button>} icon={<svg data-testid="icon" />} testId="probe">
        No saved analyses yet.
      </EmptyState>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("No saved analyses yet.");
    expect(screen.getByRole("button", { name: "New analysis" })).toBeInTheDocument();
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("is only its words when given nothing else", () => {
    render(<EmptyState testId="probe">Nothing.</EmptyState>);
    expect(screen.getByTestId("probe").children).toHaveLength(1);
  });
});
