import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LoadingSpinnerLine from "./LoadingSpinnerLine";

describe("LoadingSpinnerLine", () => {
  it("puts a spinner before its words, the words announced as a status and the spinner hidden from it (CTA-111)", () => {
    render(<LoadingSpinnerLine testId="probe">Reading…</LoadingSpinnerLine>);
    const status = screen.getByRole("status");
    expect(status).toBe(screen.getByTestId("probe"));
    expect(status.firstElementChild).toBe(screen.getByRole("progressbar", { hidden: true }));
    expect(status.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(status).toHaveTextContent("Reading…");
  });
});
