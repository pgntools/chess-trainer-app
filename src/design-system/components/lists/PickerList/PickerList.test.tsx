import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import PickerList from "./PickerList";

const ITEMS = [
  { id: null, label: "Unfiled" },
  { id: "a", label: "Openings" },
  { id: "b", label: "Sicilian", depth: 1 },
];

describe("PickerList", () => {
  it("marks the chosen row and reports a pick — the none row as null", () => {
    const onChange = vi.fn();
    render(<PickerList items={ITEMS} value="a" onChange={onChange} ariaLabel="Folder" testId="probe" />);
    expect(screen.getByRole("list", { name: "Folder" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-a")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("probe-none")).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByTestId("probe-none"));
    expect(onChange).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getByTestId("probe-b"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("takes the none row's own test id (CTA-113)", () => {
    render(<PickerList items={ITEMS} value={null} onChange={() => {}} ariaLabel="Folder" noneTestId="move-top" testId="probe" />);
    expect(screen.getByTestId("move-top")).toHaveTextContent("Unfiled");
    expect(screen.queryByTestId("probe-none")).toBeNull();
  });

  it("chooses nothing while its value is undefined, and can mark the none row", () => {
    const { rerender } = render(<PickerList items={ITEMS} value={undefined} onChange={() => {}} ariaLabel="Folder" testId="probe" />);
    expect(document.querySelector("[aria-current]")).toBeNull();
    rerender(<PickerList items={ITEMS} value={null} onChange={() => {}} ariaLabel="Folder" testId="probe" />);
    expect(screen.getByTestId("probe-none")).toHaveAttribute("aria-current", "true");
  });

  it("indents a deeper row further from the inline start", () => {
    render(<PickerList items={ITEMS} value="a" onChange={() => {}} ariaLabel="Folder" testId="probe" />);
    const top = parseFloat(getComputedStyle(screen.getByTestId("probe-a")).paddingInlineStart || "0");
    const deeper = parseFloat(getComputedStyle(screen.getByTestId("probe-b")).paddingInlineStart || "0");
    expect(deeper).toBeGreaterThan(top);
  });
});
