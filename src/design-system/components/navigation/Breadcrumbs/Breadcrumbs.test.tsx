import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import Breadcrumbs from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("makes every step above a button and the current place text", () => {
    const openRoot = vi.fn();
    render(
      <Breadcrumbs
        ariaLabel="Folders"
        crumbs={[
          { id: "root", label: "All", onClick: openRoot },
          { id: "f1", label: "Openings", onClick: () => {} },
        ]}
        current="Sicilian"
        testId="probe"
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Folders" });
    expect(within(nav).getAllByRole("button").map((button) => button.textContent)).toEqual(["All", "Openings"]);
    expect(screen.getByTestId("probe-current")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("probe-current")).toHaveTextContent("Sicilian");
    fireEvent.click(screen.getByTestId("probe-root"));
    expect(openRoot).toHaveBeenCalledTimes(1);
  });

  it("separates every step, the last one included", () => {
    render(
      <Breadcrumbs
        ariaLabel="Folders"
        crumbs={[
          { id: "root", label: "All" },
          { id: "f1", label: "Openings" },
        ]}
        current="Sicilian"
        testId="probe"
      />,
    );
    expect(document.querySelectorAll(".MuiBreadcrumbs-separator")).toHaveLength(2);
  });

  it("takes a real link for a step", () => {
    render(<Breadcrumbs ariaLabel="Folders" crumbs={[{ id: "root", label: "All", link: { href: "/x" } }]} current="Here" testId="probe" />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/x");
  });
});
