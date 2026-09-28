import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { OPENINGS } from "./fixtures";
import PlayedGamesFilters, { type PlayedGamesFiltersProps } from "./PlayedGamesFilters";
import { playedGameSideFilterOf } from "./sideFilter";

const mount = (props: Partial<PlayedGamesFiltersProps> = {}) => {
  const onSideChange = vi.fn();
  const onOpeningChange = vi.fn();
  render(
    <PlayedGamesFilters
      side="all"
      onSideChange={onSideChange}
      opening={null}
      onOpeningChange={onOpeningChange}
      openings={OPENINGS}
      openingsLoading={false}
      testId="lobby"
      {...props}
    />,
  );
  return { onSideChange, onOpeningChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("PlayedGamesFilters", () => {
  it("reads the side back from the URL's value", () => {
    expect(playedGameSideFilterOf("black")).toBe("black");
    expect(playedGameSideFilterOf("purple")).toBe("all");
    expect(playedGameSideFilterOf(null)).toBe("all");
  });

  it("offers the side as a named group, the choice pressed", async () => {
    const { onSideChange } = mount({ side: "white" });
    const group = screen.getByRole("group", { name: "Your side" });
    expect(within(group).getByRole("button", { name: "White" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByTestId("lobby-filter-color-black"));
    expect(onSideChange).toHaveBeenCalledWith("black");
  });

  it("offers every opening after All openings, and reports a choice or all", async () => {
    const { onOpeningChange } = mount({ opening: "Italian Game" });
    await userEvent.click(screen.getByRole("combobox", { name: "Opening" }));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["All openings", ...OPENINGS]);
    await userEvent.click(options[0]);
    expect(onOpeningChange).toHaveBeenCalledWith(null);
  });

  it("keeps the opening off while the book loads, and says why", () => {
    mount({ openingsLoading: true, openings: [] });
    expect(screen.getByRole("combobox", { name: "Opening" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Reading the openings…")).toBeInTheDocument();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
