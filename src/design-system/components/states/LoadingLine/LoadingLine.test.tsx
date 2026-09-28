import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LoadingLine from "./LoadingLine";

describe("LoadingLine", () => {
  it("says it is reading, as a status", () => {
    render(<LoadingLine testId="probe">Reading…</LoadingLine>);
    expect(screen.getByRole("status")).toBe(screen.getByTestId("probe"));
    expect(screen.getByTestId("probe")).toHaveTextContent("Reading…");
  });
});
