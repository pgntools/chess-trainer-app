import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { strToU8, zipSync } from "fflate";

import { mainline } from "../../../lib/gameTree";
import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { ENDGAME_FEN, ONE_GAME, TWO_GAMES, TWO_STARTS } from "./fixtures";
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

  it("asks what several games make — Select one by default, picked in an autocomplete", async () => {
    const onCreate = vi.fn();
    const { baseElement } = mount({ onCreate });
    await paste(TWO_GAMES);
    expect(screen.getByText("A case is represented by a single PGN file.")).toBeInTheDocument();
    const choice = screen.getByRole("radiogroup", { name: "What to make of these 2 games" });
    expect(within(choice).getByRole("radio", { name: "Select one game" })).toBeChecked();
    // The first game is picked; typing narrows the list.
    const field = screen.getByRole("combobox", { name: "Game" });
    expect(field).toHaveValue("Carlsen – Caruana, Club Championship");
    await userEvent.clear(field);
    await userEvent.type(field, "ding");
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Ding – Nepomniachtchi, Club Championship"]);
    await userEvent.click(options[0]);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate.mock.calls[0][0]).toHaveLength(1);
    expect(onCreate.mock.calls[0][0][0].tree.headers.White).toBe("Ding");
    await expectNoAxeViolations(baseElement);
  });

  it("makes one Case per game, with no name to type", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await paste(TWO_GAMES);
    await userEvent.click(screen.getByRole("radio", { name: "One case per game (2)" }));
    expect(screen.queryByRole("textbox", { name: "Name (optional)" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Game" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    // Every game is parsed on Create — in slices, so the call comes after.
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0].map((spec: { type: string; name: string }) => [spec.type, spec.name])).toEqual([
      ["game", ""],
      ["game", ""],
    ]);
  });

  it("merges them into one Case — a plain merge, or tagged with games and play chances where they part (CTA-208)", async () => {
    const onCreate = vi.fn();
    const { baseElement } = mount({ onCreate });
    await paste(TWO_GAMES);
    await userEvent.click(screen.getByRole("radio", { name: "Merge them into one case" }));
    expect(screen.queryByRole("combobox", { name: "Game" })).toBeNull();
    const games = screen.getByRole("checkbox", { name: "Games — [%games N]" });
    const prc = screen.getByRole("checkbox", { name: "Play chance — [%prc P]" });
    expect(games).not.toBeChecked();
    expect(prc).not.toBeChecked();
    await expectNoAxeViolations(baseElement);

    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const [[[plain]]] = onCreate.mock.calls;
    expect(plain.type).toBe("game");
    expect(plain.tree.moves.map((node: { san: string; comments?: string[] }) => [node.san, node.comments])).toEqual([
      ["e4", undefined],
      ["d4", undefined],
    ]);
    // Named from the first game's event; a tree of many games has no result.
    expect(plain.name).toBe("");
    expect(plain.tree.headers).toEqual({ Event: "Club Championship", Result: "*" });

    await userEvent.click(games);
    await userEvent.click(prc);
    await userEvent.type(screen.getByRole("textbox", { name: "Name (optional)" }), "Openings");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    const tagged = onCreate.mock.calls[1][0][0];
    expect(tagged.name).toBe("Openings");
    expect(tagged.tree.headers.Event).toBe("Openings");
    expect(tagged.tree.moves.map((node: { comments?: string[] }) => node.comments)).toEqual([
      ["[%games 1] [%prc 50]"],
      ["[%games 1] [%prc 50]"],
    ]);
    // The trunk under each stays clean.
    expect(tagged.tree.moves[1].children[0].comments).toBeUndefined();
  });

  it("does not offer Merge for games from different starts, and says why — opened on a PGN already read", () => {
    mount({ initialPgn: TWO_STARTS });
    expect(screen.getByText("2 games read")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Merge them into one case" })).toBeDisabled();
    expect(screen.getByRole("radiogroup", { name: "What to make of these 2 games" })).toHaveAccessibleDescription(
      /Merge is off: the games do not all start from the same position\./,
    );
  });

  it("reads a zip's .pgn files together, and names a merge after the file", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    const zip = zipSync({ "b.pgn": strToU8(ONE_GAME), "a/c.pgn": strToU8(TWO_GAMES) });
    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File([zip], "club.zip", { type: "application/zip" }));
    expect(await screen.findByText("3 games read")).toBeInTheDocument();
    // Its texts are not pasted into the box.
    expect(screen.getByRole("textbox", { name: "Paste a PGN" })).toHaveValue("");
    await userEvent.click(screen.getByRole("radio", { name: "Merge them into one case" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const [[[spec]]] = onCreate.mock.calls;
    expect(spec.name).toBe("club");
    expect(spec.tree.headers).toEqual({ Event: "club", Result: "*" });
    expect(spec.tree.moves.map((node: { san: string }) => node.san)).toEqual(["e4", "d4"]);
  });

  it("puts a picked .pgn into the paste box only when it holds one game", async () => {
    mount();
    const input = screen.getByTestId("probe-pgn-input");
    await userEvent.upload(input, new File([TWO_GAMES], "club.pgn", { type: "application/x-chess-pgn" }));
    expect(await screen.findByText("2 games read")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Paste a PGN" })).toHaveValue("");

    await userEvent.upload(input, new File([ONE_GAME], "one.pgn", { type: "application/x-chess-pgn" }));
    expect(await screen.findByText("1 game read")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Paste a PGN" })).toHaveValue(ONE_GAME);
  });

  it("reads only the tags of several games — one that will not read is said when picked, or when a merge reaches it", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    const broken = `${TWO_GAMES}\n\n[Event "Broken"]\n[White "Bad"]\n[Black "Moves"]\n\n1. e4 e5 2. Qxf7 *`;
    await paste(broken);
    // Listed by its tags, though its moves do not play.
    expect(screen.getByText("3 games read")).toBeInTheDocument();
    const field = screen.getByRole("combobox", { name: "Game" });
    await userEvent.clear(field);
    await userEvent.type(field, "bad");
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option"));
    expect(screen.getByTestId("probe-game-problem")).toHaveTextContent("That game cannot be read — pick another.");
    expect(screen.getByTestId("probe-game-problem-detail")).toHaveTextContent(/Game 3.*Qxf7/);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Merge them into one case" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByTestId("probe-parse-problem")).toHaveTextContent("This PGN cannot be read.");
    expect(screen.getByTestId("probe-parse-problem-detail")).toHaveTextContent(/Qxf7/);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("on a file of more games than the app keeps cases: no case each, and a merge counted on a progress bar", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    const many = Array.from({ length: 10_001 }, (_, index) => `[Event "Game ${index}"]\n\n1. ${index % 2 === 0 ? "e4" : "d4"} *`).join("\n\n");
    await paste(many);
    expect(screen.getByText("10001 games read")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "One case per game (10001)" })).toBeDisabled();
    expect(screen.getByRole("radiogroup", { name: "What to make of these 10001 games" })).toHaveAccessibleDescription(
      /One case per game is off: the app keeps at most 10,000 cases\./,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Merge them into one case" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    const bar = await screen.findByRole("progressbar", { name: "Reading the games" });
    expect(bar).toHaveAccessibleDescription(/of 10,001 games read|Merging the games/);
    // Cancel stays on while it reads; Create does not.
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1), { timeout: 30_000 });
    expect(onCreate.mock.calls[0][0][0].tree.moves.map((node: { san: string }) => node.san)).toEqual(["e4", "d4"]);
    expect(screen.queryByRole("progressbar", { name: "Reading the games" })).toBeNull();
  }, 60_000);

  it("refuses a zip with no .pgn in it, in words", async () => {
    mount();
    const zip = zipSync({ "notes.txt": strToU8("hi") });
    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File([zip], "notes.zip", { type: "application/zip" }));
    expect(await screen.findByText("There is no .pgn file in that zip.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("makes a Position of one game of several — no merge — then its move", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await userEvent.click(screen.getByRole("radio", { name: "Position" }));
    await userEvent.click(screen.getByRole("radio", { name: "PGN" }));
    await paste(TWO_GAMES);
    expect(screen.getByText("A case is represented by a single PGN file.")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Merge them into one case" })).toBeNull();
    const field = screen.getByRole("combobox", { name: "Game" });
    await userEvent.clear(field);
    await userEvent.type(field, "ding");
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option"));
    await userEvent.click(screen.getByRole("combobox", { name: "Start at" }));
    await userEvent.click(screen.getByRole("option", { name: "1… d5" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    const [[[spec]]] = onCreate.mock.calls;
    expect(spec.type).toBe("position");
    expect(spec.tree.headers.White).toBe("Ding");
    expect(spec.nodeId).toBe(mainline(spec.tree)[1].id);
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

  it("makes a Position of the pieces alone, completed as lichess does (CTA-200)", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await userEvent.click(screen.getByRole("radio", { name: "Position" }));
    const field = screen.getByRole("textbox", { name: "FEN" });
    expect(field).toHaveAccessibleDescription(/the pieces alone are enough/);
    const placement = "1r3rk1/2pbqp2/2np3p/1pb1p1pn/4P3/1BPPNNB1/1P3PPP/R2Q1RK1";
    fireEvent.change(field, { target: { value: placement } });
    expect(field).not.toHaveAttribute("aria-invalid", "true");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate).toHaveBeenCalledWith([{ type: "position", fen: `${placement} w - - 0 1`, name: "" }]);
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
