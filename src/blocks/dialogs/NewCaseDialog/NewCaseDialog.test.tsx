import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { mainline } from "../../../lib/gameTree";
import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { ENDGAME_FEN, ONE_GAME, TWO_GAMES } from "./fixtures";
import NewCaseDialog, { type NewCaseDialogProps } from "./NewCaseDialog";

const mount = (props: Partial<NewCaseDialogProps> = {}) =>
  render(<NewCaseDialog open onClose={() => {}} onCreate={() => {}} testId="probe" {...props} />);

/** Paste a text into the PGN box (a paste, not typing — userEvent would read `[` as a key). */
const paste = async (text: string) => {
  fireEvent.change(screen.getByRole("textbox", { name: "Paste a PGN" }), { target: { value: text } });
  await userEvent.click(screen.getByRole("button", { name: "Read" }));
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("NewCaseDialog (CTA-186)", () => {
  it("makes a Game of a pasted PGN, named as the reader typed", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();
    await paste(ONE_GAME);
    await userEvent.type(screen.getByRole("textbox", { name: "Name (optional)" }), "Brilliancy");
    await userEvent.click(create);
    const [[specs]] = onCreate.mock.calls;
    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({ type: "game", name: "Brilliancy" });
    expect(specs[0].tree.headers.White).toBe("Carlsen");
    // Side lines kept.
    expect(specs[0].tree.moves[0].children).toHaveLength(2);
  });

  it("asks which game of several — or makes one Case per game", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await paste(TWO_GAMES);
    const games = screen.getByRole("list", { name: "Games in the PGN" });
    await userEvent.click(within(games).getByRole("button", { name: /Ding/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate.mock.calls[0][0][0].tree.headers.White).toBe("Ding");

    await userEvent.click(screen.getByRole("checkbox", { name: "One case per game (2)" }));
    expect(screen.queryByRole("textbox", { name: "Name (optional)" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate.mock.calls[1][0].map((spec: { type: string }) => spec.type)).toEqual(["game", "game"]);
  });

  it("makes a Position of a FEN, checked as it is typed", async () => {
    const onCreate = vi.fn();
    const { baseElement } = mount({ onCreate });
    await userEvent.click(screen.getByRole("radio", { name: "Position" }));
    const field = screen.getByRole("textbox", { name: "FEN" });
    fireEvent.change(field, { target: { value: "not a fen" } });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    fireEvent.change(field, { target: { value: ENDGAME_FEN } });
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate).toHaveBeenCalledWith([{ type: "position", fen: ENDGAME_FEN, name: "" }]);
    await expectNoAxeViolations(baseElement);
  });

  it("makes a Position of a PGN at the move the reader picks", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await userEvent.click(screen.getByRole("radio", { name: "Position" }));
    await userEvent.click(screen.getByRole("radio", { name: "PGN" }));
    await paste(ONE_GAME);
    await userEvent.click(screen.getByRole("combobox", { name: "Start at" }));
    await userEvent.click(screen.getByRole("option", { name: "2. Nf3" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    const [[[spec]]] = onCreate.mock.calls;
    expect(spec.type).toBe("position");
    expect(spec.nodeId).toBe(mainline(spec.tree)[2].id);
  });

  it("says a PGN it cannot read, and the screen's refused write", async () => {
    mount({ problem: "The case could not be saved." });
    await paste("1. e4 e5 2. Qxf7 *");
    expect(screen.getByText("This PGN cannot be read.")).toBeInTheDocument();
    expect(screen.getByTestId("probe-problem")).toHaveTextContent("The case could not be saved.");
  });
});
