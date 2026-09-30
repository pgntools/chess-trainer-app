import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SearchField from "./SearchField";

describe("SearchField", () => {
  it("reports the words typed, reading each in its own direction", () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Filter" clearLabel="Clear" testId="probe" />);
    const input = screen.getByRole("searchbox", { name: "Filter" });
    expect(input).toBe(screen.getByTestId("probe"));
    expect(input).toHaveAttribute("dir", "auto");
    fireEvent.change(input, { target: { value: "tal" } });
    expect(onChange).toHaveBeenCalledWith("tal");
  });

  it("clears from its button, shown only while there are words, and on Escape", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchField value="" onChange={onChange} placeholder="Filter" clearLabel="Clear" testId="probe" />);
    expect(screen.queryByTestId("probe-clear")).toBeNull();
    rerender(<SearchField value="tal" onChange={onChange} placeholder="Filter" clearLabel="Clear" testId="probe" />);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.keyDown(screen.getByTestId("probe"), { key: "Escape" });
    expect(onChange).toHaveBeenNthCalledWith(1, "");
    expect(onChange).toHaveBeenNthCalledWith(2, "");
  });

  it("cannot be nameless: a label or a placeholder names it (CTA-111)", () => {
    // @ts-expect-error — neither a label nor a placeholder.
    const nameless = <SearchField value="" onChange={vi.fn()} clearLabel="Clear" testId="probe" />;
    expect(nameless).toBeTruthy();
    render(<SearchField value="" onChange={vi.fn()} placeholder="Filter by name" clearLabel="Clear" testId="probe" />);
    expect(screen.getByRole("searchbox", { name: "Filter by name" })).toBeInTheDocument();
  });
});
