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

  /*
    CTA-118: the title box shrinks to nothing (`minWidth: 0`) and the actions
    are pinned (`flexShrink: 0`), so on a narrow square the row used to crush
    the `h1` to zero width — a heading no one can read, and what WCAG 1.4.10's
    reflow gate failed on. The row wraps instead, whatever `wrap` says; `wrap`
    is now only about the title's own second line.
  */
  it("wraps its row so the actions can never crush the heading (CTA-118)", () => {
    const { rerender } = render(<ListScreenHeader title="Library" actions={<button>New folder</button>} testId="probe" />);
    const row = screen.getByTestId("probe-actions").parentElement;
    expect(row).toHaveStyle({ flexWrap: "wrap" });
    expect(screen.getByTestId("probe-actions")).toHaveStyle({ flexWrap: "wrap" });

    // What `wrap` still decides is the title's own line: cut with an ellipsis
    // by default, run to a second line when asked. The row wraps either way.
    expect(screen.getByTestId("probe-title")).toHaveStyle({ whiteSpace: "nowrap" });
    rerender(<ListScreenHeader title="Library" actions={<button>New folder</button>} wrap testId="probe" />);
    expect(screen.getByTestId("probe-actions").parentElement).toHaveStyle({ flexWrap: "wrap" });
    expect(screen.getByTestId("probe-title")).not.toHaveStyle({ whiteSpace: "nowrap" });
  });

  it("leaves out the count and actions it is not given, and takes a title direction", () => {
    render(<ListScreenHeader title="My games" titleDir="auto" testId="probe" />);
    expect(screen.queryByTestId("probe-count")).toBeNull();
    expect(screen.queryByTestId("probe-actions")).toBeNull();
    expect(screen.getByTestId("probe-title")).toHaveAttribute("dir", "auto");
  });
});
