import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Link as RouterLink } from "react-router";

import PanelTabs from "./PanelTabs";

const TABS = [
  { id: "moves", label: "Moves" },
  { id: "map", label: "Map" },
  { id: "engine", label: "Engine", disabled: true },
];

describe("PanelTabs", () => {
  it("shows the tab on screen and reports a pick by id", () => {
    const onChange = vi.fn();
    render(<PanelTabs tabs={TABS} value="moves" onChange={onChange} ariaLabel="Panel" testId="probe" />);
    expect(screen.getByRole("tablist", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-tab-moves")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByTestId("probe-tab-map"));
    expect(onChange).toHaveBeenCalledWith("map");
  });

  it("keeps a disabled tab off", () => {
    render(<PanelTabs tabs={TABS} value="moves" onChange={() => {}} ariaLabel="Panel" testId="probe" />);
    expect(screen.getByTestId("probe-tab-engine")).toBeDisabled();
  });

  it("makes a tab with a link a real link — a routed strip", () => {
    render(
      <MemoryRouter>
        <PanelTabs
          tabs={[
            { id: "export", label: "Export", link: { component: RouterLink, to: "/settings/export" } },
            { id: "import", label: "Import", link: { component: RouterLink, to: "/settings/import" } },
          ]}
          value="import"
          ariaLabel="Settings"
          testId="probe"
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("probe-tab-export")).toHaveAttribute("href", "/settings/export");
    expect(screen.getByTestId("probe-tab-import")).toHaveAttribute("aria-selected", "true");
  });
});
