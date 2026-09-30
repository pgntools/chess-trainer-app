import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import AnchoredMenu from "./AnchoredMenu";

describe("AnchoredMenu", () => {
  it("hangs from its anchor with link and action entries, the current one marked", () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    const onClose = vi.fn();
    const drill = vi.fn();
    render(
      <AnchoredMenu
        anchorEl={anchor}
        onClose={onClose}
        entries={[
          { id: "player", label: "Player", link: { href: "/rep/1" }, selected: true },
          { id: "drill", label: "Drill", onClick: drill },
        ]}
        testId="probe"
      />,
    );
    expect(screen.getByTestId("probe-player")).toHaveAttribute("href", "/rep/1");
    expect(screen.getByTestId("probe-player")).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByTestId("probe-drill"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(drill).toHaveBeenCalledTimes(1);
    anchor.remove();
  });

  it("is closed without an anchor", () => {
    render(<AnchoredMenu anchorEl={null} onClose={() => {}} entries={[{ id: "a", label: "A" }]} testId="probe" />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("names its entries under another prefix when asked (CTA-113)", () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    render(<AnchoredMenu anchorEl={anchor} onClose={() => {}} entries={[{ id: "end", label: "End", link: { href: "/g/end" } }]} entryTestIdPrefix="games-r" testId="games-r-menu" />);
    expect(screen.getByTestId("games-r-end")).toHaveAttribute("href", "/g/end");
    expect(screen.getByTestId("games-r-menu")).toBeInTheDocument();
    anchor.remove();
  });
});
