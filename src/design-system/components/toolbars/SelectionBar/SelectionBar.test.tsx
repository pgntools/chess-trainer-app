import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SelectionBar from "./SelectionBar";

const bar = (props: Partial<Parameters<typeof SelectionBar>[0]> = {}) => (
  <SelectionBar
    checked={false}
    indeterminate
    onToggleAll={() => {}}
    selectAllLabel="Select all"
    count={2}
    countLabel="2 picked"
    onClear={() => {}}
    clearLabel="Clear the picks"
    actions={<button>Download</button>}
    testId="probe"
    {...props}
  />
);

describe("SelectionBar", () => {
  it("names select-all, shows its mixed state, counts the picks and holds the actions", () => {
    render(bar());
    const all = screen.getByRole("checkbox", { name: "Select all" });
    expect(all).toHaveAttribute("data-indeterminate", "true");
    expect((all as HTMLInputElement).indeterminate).toBe(true);
    expect(screen.getByTestId("probe-selected-count")).toHaveTextContent("2 picked");
    expect(screen.getByTestId("probe-export")).toContainElement(screen.getByRole("button", { name: "Download" }));
  });

  it("selects all and clears from the keyboard", async () => {
    const onToggleAll = vi.fn();
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(bar({ onToggleAll, onClear }));
    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Select all" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onToggleAll).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(screen.getByTestId("probe-selected-count")).toHaveFocus();
    await user.keyboard("{Delete}");
    expect(onClear).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTitle("Clear the picks"));
    expect(onClear).toHaveBeenCalledTimes(2);
  });

  it("shows no chip while nothing is picked, and takes another root id", () => {
    render(bar({ count: 0, rootTestId: "elsewhere" }));
    expect(screen.queryByTestId("probe-selected-count")).toBeNull();
    expect(screen.getByTestId("elsewhere")).toBeInTheDocument();
  });
});
