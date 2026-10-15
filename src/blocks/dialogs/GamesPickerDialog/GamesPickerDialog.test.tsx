import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { GAMES } from "./fixtures";
import GamesPickerDialog, { type GamesPickerDialogProps } from "./GamesPickerDialog";

const mount = (props: Partial<GamesPickerDialogProps> = {}) =>
  render(<GamesPickerDialog open rows={GAMES} mode="many" onSubmit={() => {}} onClose={() => {}} testId="picker" {...props} />);

/** The body rows on screen. */
const bodyRows = (dialog: HTMLElement) => within(within(dialog).getByRole("table", { name: "Games" })).getAllByRole("row").slice(1);

/** The `#` cells of the rows on screen. */
const numbersShown = (dialog: HTMLElement) => bodyRows(dialog).map((row) => within(row).getAllByRole("cell")[1]?.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("GamesPickerDialog (CTA-208)", () => {
  it("lists the games a page at a time, sorts them, finds them by words, and hands back the ticked ones in the file's order", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = mount({ onSubmit });
    const dialog = screen.getByRole("dialog", { name: "Select games" });
    expect(within(dialog).getByTestId("picker-count")).toHaveTextContent("0 of 120 games selected");
    expect(within(dialog).getByRole("button", { name: "Select" })).toBeDisabled();
    expect(numbersShown(dialog)).toHaveLength(50);
    expect(numbersShown(dialog)[0]).toBe("1");
    await expectNoAxeViolations(baseElement);

    // A header sorts: # descending puts the last game first.
    await userEvent.click(within(dialog).getByRole("button", { name: "#" }));
    expect(numbersShown(dialog)[0]).toBe("120");
    await userEvent.click(within(dialog).getByRole("button", { name: "#" }));
    expect(numbersShown(dialog)[0]).toBe("1");

    // Pages.
    await userEvent.click(within(dialog).getByRole("button", { name: /next page/i }));
    expect(numbersShown(dialog)[0]).toBe("51");

    // Words narrow it, back to the first page; select-all takes what they leave.
    // Gukesh – Caruana: every eighth game, from the seventh.
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Find games" }), "gukesh caruana");
    const shown = numbersShown(dialog);
    expect(shown).toEqual(["7", "15", "23", "31", "39", "47", "55", "63", "71", "79", "87", "95", "103", "111", "119"]);
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Select all games shown by the filters" }));
    expect(within(dialog).getByTestId("picker-count")).toHaveTextContent(`${shown.length} of 120 games selected`);
    // A row's click ticks it too — here, off again.
    await userEvent.click(within(bodyRows(dialog)[0]).getAllByRole("cell")[3]);
    expect(within(dialog).getByTestId("picker-count")).toHaveTextContent(`${shown.length - 1} of 120 games selected`);

    await userEvent.click(within(dialog).getByRole("button", { name: "Select" }));
    const [[numbers]] = onSubmit.mock.calls;
    expect(numbers).toHaveLength(shown.length - 1);
    expect([...numbers].sort((a: number, b: number) => a - b)).toEqual(numbers);
  });

  it("opens on the picks it is given, and refuses more than its cap, saying why", async () => {
    mount({ max: 10, initialPicked: GAMES.slice(0, 12).map((row) => row.number) });
    const dialog = screen.getByRole("dialog", { name: "Select games" });
    expect(within(dialog).getByTestId("picker-count")).toHaveTextContent("12 of 120 games selected");
    expect(within(dialog).getByTestId("picker-too-many")).toHaveTextContent(
      "That is too many — at most 10 games make cases here. For more, make a collection of them in the Library instead.",
    );
    expect(within(dialog).getByRole("button", { name: "Select" })).toBeDisabled();
    await userEvent.click(within(bodyRows(dialog)[0]).getByRole("checkbox"));
    await userEvent.click(within(bodyRows(dialog)[1]).getByRole("checkbox"));
    expect(within(dialog).queryByTestId("picker-too-many")).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Select" })).toBeEnabled();
  });

  it("chooses one game with a click, or Enter on its row — no ticks", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = mount({ mode: "one", onSubmit });
    const dialog = screen.getByRole("dialog", { name: "Choose a game" });
    expect(within(dialog).queryByRole("checkbox")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Select" })).toBeNull();
    expect(within(dialog).getByText("Click a game to choose it.")).toBeInTheDocument();
    await expectNoAxeViolations(baseElement);
    await userEvent.click(within(bodyRows(dialog)[2]).getAllByRole("cell")[2]);
    expect(onSubmit).toHaveBeenLastCalledWith([3]);
    const row = bodyRows(dialog)[4];
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onSubmit).toHaveBeenLastCalledWith([5]);
  });

  it("opened afresh, forgets its words and picks", async () => {
    const { rerender } = mount();
    const dialog = screen.getByRole("dialog", { name: "Select games" });
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Find games" }), "ding");
    await userEvent.click(within(dialog).getAllByRole("checkbox")[1]);
    rerender(<GamesPickerDialog open={false} rows={GAMES} mode="many" onSubmit={() => {}} onClose={() => {}} testId="picker" />);
    rerender(<GamesPickerDialog open rows={GAMES} mode="many" initialPicked={[7]} onSubmit={() => {}} onClose={() => {}} testId="picker" />);
    const again = await screen.findByRole("dialog", { name: "Select games" });
    expect(within(again).getByRole("searchbox", { name: "Find games" })).toHaveValue("");
    expect(within(again).getByTestId("picker-count")).toHaveTextContent("1 of 120 games selected");
  });
});
