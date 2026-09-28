import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ListScreenHeader from "./ListScreenHeader";

describe("ListScreenHeader", () => {
  it("heads the screen: back, the title over its count, the actions, a second row", () => {
    render(
      <ListScreenHeader
        back={<button>Back</button>}
        title="Library"
        count="12 collections"
        actions={<button>New folder</button>}
        testId="probe"
      >
        <input aria-label="Filter" />
      </ListScreenHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Library" })).toBe(screen.getByTestId("probe-title"));
    expect(screen.getByTestId("probe-count")).toHaveTextContent("12 collections");
    expect(screen.getByTestId("probe-actions")).toHaveTextContent("New folder");
    expect(screen.getByRole("textbox", { name: "Filter" })).toBeInTheDocument();
    const order = [...screen.getByTestId("probe").querySelectorAll("button, h1")].map((node) => node.textContent);
    expect(order).toEqual(["Back", "Library", "New folder"]);
  });

  it("leaves out the count and actions it is not given, and takes a title direction", () => {
    render(<ListScreenHeader title="שלום" titleDir="auto" testId="probe" />);
    expect(screen.queryByTestId("probe-count")).toBeNull();
    expect(screen.queryByTestId("probe-actions")).toBeNull();
    expect(screen.getByTestId("probe-title")).toHaveAttribute("dir", "auto");
  });
});
