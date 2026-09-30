import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import CardGrid from "./CardGrid";

describe("CardGrid", () => {
  it("fits as many columns as its size allows, rows at their content's height", () => {
    render(
      <CardGrid size="comfortable" testId="probe">
        <div />
      </CardGrid>,
    );
    const style = getComputedStyle(screen.getByTestId("probe"));
    expect(style.gridTemplateColumns).toBe("repeat(auto-fill, minmax(min(260px, 100%), 1fr))");
    expect(style.gridAutoRows).toBe("max-content");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-size", "comfortable");
  });

  it("is a named group when it has a name, and scrolls when asked", () => {
    render(
      <CardGrid ariaLabel="Analyses" scroll testId="probe">
        <div />
      </CardGrid>,
    );
    expect(screen.getByRole("group", { name: "Analyses" })).toBe(screen.getByTestId("probe"));
    expect(getComputedStyle(screen.getByTestId("probe")).overflowY).toBe("auto");
  });
});
