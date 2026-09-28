import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import RecordCard from "./RecordCard";

describe("RecordCard", () => {
  it("opens from its square, named for the reader, with the name, line, actions and pick under it", () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    render(
      <RecordCard
        preview={<div data-testid="board" />}
        name="Najdorf"
        caption="24 moves"
        onOpen={onOpen}
        openLabel="Open Najdorf"
        actions={<button>Download</button>}
        pick={{ checked: true, onToggle, label: "Pick Najdorf" }}
        testId="probe"
      />,
    );
    const open = screen.getByRole("button", { name: "Open Najdorf" });
    expect(open).toContainElement(screen.getByTestId("board"));
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe-name")).toHaveTextContent("Najdorf");
    expect(screen.getByTestId("probe")).toHaveTextContent("24 moves");
    fireEvent.click(screen.getByRole("checkbox", { name: "Pick Najdorf" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("opens by a link", () => {
    render(<RecordCard preview={null} name="x" link={{ href: "/a/1" }} openLabel="Open x" testId="probe" />);
    expect(screen.getByRole("link", { name: "Open x" })).toHaveAttribute("href", "/a/1");
  });
});
