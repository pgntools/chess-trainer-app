import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionFilters from "./CollectionFilters";
import { FULL_FACETS, NO_FILTERS, SOME_FILTERS, SPARSE_FACETS } from "./fixtures";

const mount = (props: Partial<Parameters<typeof CollectionFilters>[0]> = {}) => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(
    <CollectionFilters
      facets={FULL_FACETS}
      values={NO_FILTERS}
      onChange={onChange}
      onClear={onClear}
      testId="library-filter"
      rootTestId="library-filters"
      {...props}
    />,
  );
  return { onChange, onClear };
};

describe("CollectionFilters (CTA-113)", () => {
  it("shows every filter the collection has a field for, and the side only once a player is chosen", async () => {
    mount({ openingBoard: <div data-testid="board-slot" /> });
    expect(screen.getByTestId("library-filter-player")).toBeInTheDocument();
    expect(screen.getByTestId("library-filter-color-black")).toBeDisabled();
    expect(screen.getByTestId("board-slot")).toBeInTheDocument();
    expect(screen.getByTestId("library-filter-opening")).toBeInTheDocument();
    expect(screen.getByTestId("library-filter-event")).toBeInTheDocument();
    expect(screen.getByTestId("library-filter-from")).toHaveAttribute("min", "1959-01-01");
    expect(screen.getByTestId("library-filter-to")).toHaveAttribute("max", "1961-12-31");
    expect(screen.getByTestId("library-table-result")).toBeInTheDocument();
    expect(screen.getByTestId("library-filter-clear")).toBeDisabled();
    await expectNoAxeViolations(screen.getByTestId("library-filters"));
  });

  it("leaves out what an upload does not hold", () => {
    mount({ facets: SPARSE_FACETS });
    expect(screen.getByTestId("library-filter-player")).toBeInTheDocument();
    expect(screen.queryByTestId("library-filter-opening")).toBeNull();
    expect(screen.queryByTestId("library-filter-event")).toBeNull();
    expect(screen.queryByTestId("library-filter-from")).toBeNull();
    expect(screen.queryByTestId("library-table-result")).toBeNull();
  });

  it("reports each change as a patch, and clears from the keyboard", async () => {
    const user = userEvent.setup();
    const { onChange, onClear } = mount({ values: SOME_FILTERS });
    await user.click(screen.getByTestId("library-filter-color-all"));
    expect(onChange).toHaveBeenLastCalledWith({ color: "" });
    fireEvent.change(screen.getByTestId("library-filter-to"), { target: { value: "1961-01-01" } });
    expect(onChange).toHaveBeenLastCalledWith({ from: "1960-01-01", to: "1961-01-01" });
    const box = within(screen.getByTestId("library-filter-player")).getByRole("combobox");
    await user.type(box, "Smy{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ player: ["Tal, Mikhail", "Smy"] });
    screen.getByTestId("library-filter-clear").focus();
    await user.keyboard("{Enter}");
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
