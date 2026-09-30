import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link as RouterLink } from "react-router";

import PanelTabs from "./PanelTabs";
import { tabPanelProps } from "./panelIds";
import { expectNoAxeViolations } from "../../../../test/axe";

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

  it("names the panel by its tab under an idPrefix (CTA-112)", async () => {
    render(
      <>
        <PanelTabs tabs={TABS} value="map" onChange={() => {}} ariaLabel="Panel" idPrefix="probe-ids" testId="probe" />
        <div {...tabPanelProps("probe-ids", "map")}>The map</div>
      </>,
    );
    expect(screen.getByRole("tabpanel", { name: "Map" })).toHaveTextContent("The map");
    expect(screen.getByRole("tab", { name: "Map" })).toHaveAttribute("aria-controls", "probe-ids-panel-map");
    // Only the selected tab points at a panel — the others' are not on the page.
    expect(screen.getByRole("tab", { name: "Moves" })).not.toHaveAttribute("aria-controls");
    await expectNoAxeViolations();
  });

  it("gives the tabs no ids without an idPrefix — as before", () => {
    render(<PanelTabs tabs={TABS} value="moves" onChange={() => {}} ariaLabel="Panel" testId="probe" />);
    expect(screen.getByTestId("probe-tab-moves")).not.toHaveAttribute("id");
    expect(screen.getByTestId("probe-tab-moves")).not.toHaveAttribute("aria-controls");
  });

  it("stands down the start edge as a sidebar of sections, the up and down arrows moving between them (CTA-115)", async () => {
    const onChange = vi.fn();
    render(
      <PanelTabs
        tabs={[
          { id: "theme", label: "Theme" },
          { id: "light", label: "Palette — light" },
          { id: "dark", label: "Palette — dark" },
        ]}
        value="theme"
        onChange={onChange}
        orientation="vertical"
        ariaLabel="Sections"
        testId="probe"
      />,
    );
    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list).toHaveAttribute("aria-orientation", "vertical");
    await userEvent.tab();
    expect(screen.getByRole("tab", { name: "Theme" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Palette — light" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("dark");
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("tab", { name: "Theme" })).toHaveFocus();
    await expectNoAxeViolations();
  });

  it("is a strip across the top by default — the arrows left and right", () => {
    render(<PanelTabs tabs={TABS} value="moves" onChange={() => {}} ariaLabel="Panel" testId="probe" />);
    expect(screen.getByRole("tablist", { name: "Panel" })).not.toHaveAttribute("aria-orientation", "vertical");
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

  it("names its tabs under another prefix when asked (CTA-113)", () => {
    render(<PanelTabs tabs={[{ id: "fen", label: "FEN" }]} value="fen" ariaLabel="Forms" tabTestIdPrefix="editor" testId="editor-forms" />);
    expect(screen.getByTestId("editor-tab-fen")).toHaveAttribute("role", "tab");
    expect(screen.getByTestId("editor-forms")).toBeInTheDocument();
  });
});
