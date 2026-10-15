import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { strToU8, zipSync } from "fflate";

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

  it("asks what several games make — Select one by default, picked in an autocomplete", async () => {
    const onCreate = vi.fn();
    const { baseElement } = mount({ onCreate });
    await paste(TWO_GAMES);
    expect(screen.getByText("A case is represented by a single PGN file.")).toBeInTheDocument();
    const choice = screen.getByRole("radiogroup", { name: "What to make of these 2 games" });
    expect(within(choice).getByRole("radio", { name: "Select one game" })).toBeChecked();
    // Two choices: no merge (it is to live elsewhere).
    expect(within(choice).getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["select", "perGame"]);
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

  it("reads a zip's .pgn files together, in its order — a case each here", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    const zip = zipSync({ "b.pgn": strToU8(ONE_GAME), "a/c.pgn": strToU8(TWO_GAMES) });
    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File([zip], "club.zip", { type: "application/zip" }));
    expect(await screen.findByText(/3 games read/)).toBeInTheDocument();
    // The file's plate in the input's place.
    expect(screen.getByTestId("probe-file")).toHaveTextContent("club.zip");
    expect(screen.queryByRole("textbox", { name: "Paste a PGN" })).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "One case per game (3)" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0].map((spec: { tree: { headers: { White?: string } } }) => spec.tree.headers.White)).toEqual([
      "Carlsen",
      "Carlsen",
      "Ding",
    ]);
  });

  it("shows a file read as a plate in the input's place — × brings the input back, to pick another", async () => {
    const onCreate = vi.fn();
    const { baseElement } = mount({ onCreate });
    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File([TWO_GAMES], "club.pgn", { type: "application/x-chess-pgn" }));
    const plate = await screen.findByTestId("probe-file");
    expect(plate).toHaveTextContent("club.pgn");
    expect(plate).toHaveTextContent(/\d+ B · 2 games read/);
    // No file button, no paste box — and the text was never put in it.
    expect(screen.queryByRole("textbox", { name: "Paste a PGN" })).toBeNull();
    expect(screen.queryByTestId("probe-pgn-input")).toBeNull();
    await expectNoAxeViolations(baseElement);

    await userEvent.click(screen.getByRole("button", { name: "Remove club.pgn" }));
    expect(screen.queryByTestId("probe-file")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Game" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Paste a PGN" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File([ONE_GAME], "one.pgn", { type: "application/x-chess-pgn" }));
    expect(await screen.findByTestId("probe-file")).toHaveTextContent(/one\.pgn.*1 game read/);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate.mock.calls[0][0][0].tree.headers.White).toBe("Carlsen");
  });

  it("opens on a file's plate when given the file's name with its PGN (the gallery's)", () => {
    mount({ initialPgn: TWO_GAMES, initialFileName: "club.pgn" });
    expect(screen.getByTestId("probe-file")).toHaveTextContent(/club\.pgn.*2 games read/);
    expect(screen.queryByRole("textbox", { name: "Paste a PGN" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Game" })).toBeInTheDocument();
  });

  it("says a one-game file that will not read under its plate", async () => {
    mount();
    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File(["1. e4 e5 2. Qxf7 *"], "bad.pgn", { type: "application/x-chess-pgn" }));
    expect(await screen.findByTestId("probe-file-problem")).toHaveTextContent("This PGN cannot be read.");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("reads only the tags of several games — one that will not read is said when picked, or when a case each reaches it", async () => {
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

    await userEvent.click(screen.getByRole("radio", { name: "One case per game (3)" }));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByTestId("probe-parse-problem")).toHaveTextContent("This PGN cannot be read.");
    expect(screen.getByTestId("probe-parse-problem-detail")).toHaveTextContent(/Qxf7/);
    expect(onCreate).not.toHaveBeenCalled();
  });

  /** So many one-move games, as one PGN. */
  const manyGames = (count: number) =>
    Array.from({ length: count }, (_, index) => `[Event "Game ${index}"]\n\n1. ${index % 2 === 0 ? "e4" : "d4"} *`).join("\n\n");

  it("offers no case each for more games than the app keeps cases, and says why", async () => {
    mount();
    await paste(manyGames(10_001));
    expect(screen.getByText("10001 games read")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "One case per game (10001)" })).toBeDisabled();
    expect(screen.getByRole("radiogroup", { name: "What to make of these 10001 games" })).toHaveAccessibleDescription(
      /One case per game is off: the app keeps at most 10,000 cases\./,
    );
    expect(screen.getByRole("radio", { name: "Select one game" })).toBeChecked();
  });

  it("counts a case each's parse of every game on a progress bar, Cancel on and Create off", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await paste(manyGames(3_000));
    await userEvent.click(screen.getByRole("radio", { name: "One case per game (3000)" }));
    // The parse waits a task before its first slice: held there, the bar is on screen.
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
      const bar = screen.getByRole("progressbar", { name: "Reading the games" });
      expect(bar).toHaveAccessibleDescription("0 of 3,000 games read");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
      expect(onCreate).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
    } finally {
      vi.useRealTimers();
    }
    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toHaveLength(3_000);
    expect(screen.queryByRole("progressbar", { name: "Reading the games" })).toBeNull();
  });

  it("stops the parse on Cancel, creating nothing", async () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();
    mount({ onCreate, onClose });
    await paste(manyGames(3_000));
    await userEvent.click(screen.getByRole("radio", { name: "One case per game (3000)" }));
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledTimes(1);
      await vi.runAllTimersAsync();
    } finally {
      vi.useRealTimers();
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("refuses a zip with no .pgn in it, in words", async () => {
    mount();
    const zip = zipSync({ "notes.txt": strToU8("hi") });
    await userEvent.upload(screen.getByTestId("probe-pgn-input"), new File([zip], "notes.zip", { type: "application/zip" }));
    expect(await screen.findByText("There is no .pgn file in that zip.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    // Refused, the input stays — to pick another.
    expect(screen.queryByTestId("probe-file")).toBeNull();
    expect(screen.getByTestId("probe-pgn-input")).toBeInTheDocument();
  });

  it("makes a Position of one game of several — no case each — then its move", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    await userEvent.click(screen.getByRole("radio", { name: "Position" }));
    await userEvent.click(screen.getByRole("radio", { name: "PGN" }));
    await paste(TWO_GAMES);
    expect(screen.getByText("A case is represented by a single PGN file.")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "One case per game (2)" })).toBeNull();
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
