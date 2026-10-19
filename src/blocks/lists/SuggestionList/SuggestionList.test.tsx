import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import SuggestionList from "./SuggestionList";
import { ONE, THREE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("SuggestionList (CTA-238)", () => {
  it("lists the moves in order under its heading, each with a remove named for it", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<SuggestionList moves={THREE} onRemove={onRemove} testId="moves" />);
    const list = within(screen.getByRole("list", { name: "Your moves" }));
    expect(list.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Nf3", "O-O", "exd5"]);
    await user.click(screen.getByRole("button", { name: "Remove O-O" }));
    expect(onRemove).toHaveBeenCalledWith("O-O");
  });

  it("says how to add a move when there is none", () => {
    render(<SuggestionList moves={[]} onRemove={() => {}} testId="moves" />);
    expect(screen.getByTestId("moves-empty")).toHaveTextContent("No move yet — play one on the board.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("is read only without onRemove, the moves pinned left to right", () => {
    render(<SuggestionList moves={ONE} testId="moves" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("e8=Q+")).toHaveAttribute("dir", "ltr");
  });

  it("passes axe", async () => {
    render(<SuggestionList moves={THREE} onRemove={() => {}} testId="moves" />);
    await expectNoAxeViolations();
  });
});
