import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import MissState from "./MissState";

describe("MissState", () => {
  it("says what is missing and goes back", () => {
    const onBack = vi.fn();
    render(
      <MissState title="No such game" backLabel="Back" onBack={onBack} testId="probe">
        The link is old.
      </MissState>,
    );
    expect(screen.getByRole("heading", { name: "No such game" })).toBeInTheDocument();
    expect(screen.getByTestId("probe")).toHaveTextContent("The link is old.");
    fireEvent.click(screen.getByTestId("probe-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("goes back by a link when given one", () => {
    render(
      <MissState backLabel="Back" backLink={{ href: "/library" }} testId="probe">
        Gone.
      </MissState>,
    );
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/library");
  });
});
