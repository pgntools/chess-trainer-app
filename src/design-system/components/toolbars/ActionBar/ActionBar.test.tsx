import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ActionBar from "./ActionBar";

describe("ActionBar", () => {
  it("is a named toolbar when it has a name", () => {
    render(
      <ActionBar ariaLabel="Board controls" testId="probe">
        <button>First</button>
      </ActionBar>,
    );
    expect(screen.getByRole("toolbar", { name: "Board controls" })).toBe(screen.getByTestId("probe"));
  });

  it("is a plain row without one", () => {
    render(
      <ActionBar testId="probe">
        <button>First</button>
      </ActionBar>,
    );
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(screen.getByTestId("probe")).toHaveTextContent("First");
  });
});
