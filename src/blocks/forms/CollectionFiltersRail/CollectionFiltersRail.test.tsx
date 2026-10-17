import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionFiltersRail from "./CollectionFiltersRail";
import { EVERY_FILTER, NO_FILTERS, THREE_FILTERS } from "./fixtures";

describe("CollectionFiltersRail (CTA-230)", () => {
  it("is one button that opens the panel, with no badge while no filter is on", async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    render(<CollectionFiltersRail values={NO_FILTERS} onExpand={onExpand} testId="library-filters-rail" />);
    const button = screen.getByRole("button", { name: "Show filters" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).not.toHaveAttribute("aria-haspopup");
    expect(button.querySelector(".MuiBadge-badge")).toBeNull();
    button.focus();
    await user.keyboard("{Enter}");
    expect(onExpand).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(screen.getByTestId("library-filters-rail"));
  });

  it("counts the filters on in a badge and in the button's name", async () => {
    const { rerender } = render(<CollectionFiltersRail values={THREE_FILTERS} onExpand={() => {}} testId="library-filters-rail" />);
    const button = screen.getByRole("button", { name: "Show filters — 3 filters on" });
    expect(within(button).getByText("3")).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("library-filters-rail"));

    rerender(<CollectionFiltersRail values={EVERY_FILTER} onExpand={() => {}} testId="library-filters-rail" />);
    // Seven on; the badge keeps to one digit, the name says how many.
    expect(within(screen.getByRole("button", { name: "Show filters — 7 filters on" })).getByText("7")).toBeInTheDocument();
  });
});
