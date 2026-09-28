import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LoadingSpinnerLine from "./LoadingSpinnerLine";

describe("LoadingSpinnerLine", () => {
  it("puts a spinner before its words, announced as a status", () => {
    render(<LoadingSpinnerLine testId="probe">Reading…</LoadingSpinnerLine>);
    const status = screen.getByRole("status");
    expect(status).toBe(screen.getByTestId("probe"));
    expect(status.firstElementChild).toBe(screen.getByRole("progressbar"));
    expect(status).toHaveTextContent("Reading…");
  });
});
