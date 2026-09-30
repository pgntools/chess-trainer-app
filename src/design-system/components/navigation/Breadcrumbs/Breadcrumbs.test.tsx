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

  it("takes the current place's own test id (CTA-113)", () => {
    render(<Breadcrumbs ariaLabel="Folders" crumbs={[{ id: "root", label: "All", onClick: () => {} }]} current="Sicilian" currentTestId="crumb-f2" testId="probe" />);
    expect(screen.getByTestId("crumb-f2")).toHaveAttribute("aria-current", "page");
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
