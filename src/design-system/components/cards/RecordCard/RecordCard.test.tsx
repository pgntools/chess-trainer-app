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

  it("takes a third line and its parts' own test ids (CTA-113)", () => {
    render(
      <RecordCard
        preview={null}
        name="x"
        caption="24 moves"
        detail="Sicilian Defense · B20"
        onOpen={() => {}}
        openLabel="Open x"
        pick={{ checked: false, onToggle: () => {}, label: "Pick x" }}
        openTestId="old-open"
        pickTestId="old-pick"
        testId="probe"
      />,
    );
    expect(screen.getByTestId("old-open")).toBe(screen.getByRole("button", { name: "Open x" }));
    expect(screen.getByTestId("old-pick")).toContainElement(screen.getByRole("checkbox", { name: "Pick x" }));
    expect(screen.getByTestId("probe")).toHaveTextContent("Sicilian Defense · B20");
  });

  it("is no button when it has nowhere to go — a record that will not read", () => {
    render(<RecordCard preview="Cannot be read" name="x" openLabel="Open x" testId="probe" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("probe-open")).toHaveTextContent("Cannot be read");
  });

  it("opens by a link", () => {
    render(<RecordCard preview={null} name="x" link={{ href: "/a/1" }} openLabel="Open x" testId="probe" />);
    expect(screen.getByRole("link", { name: "Open x" })).toHaveAttribute("href", "/a/1");
  });
});
