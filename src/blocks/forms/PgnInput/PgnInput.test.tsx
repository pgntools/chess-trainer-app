import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import { GAMES, LABELS } from "./fixtures";
import PgnInput, { type PgnInputProps } from "./PgnInput";

const mount = (props: Partial<PgnInputProps> = {}) => {
  const onFiles = vi.fn();
  const onSubmit = vi.fn();
  const onSelectGame = vi.fn();
  render(
    <PgnInput labels={LABELS} onFiles={onFiles} pasted="1. e4 *" onPastedChange={() => {}} onSubmit={onSubmit} onSelectGame={onSelectGame} testId="probe" {...props} />,
  );
  return { onFiles, onSubmit, onSelectGame };
};

describe("PgnInput", () => {
  it("offers a PGN file — or a zip when asked — and reads a paste", async () => {
    const { onSubmit, onFiles } = mount();
    expect(screen.getByTestId("probe-input")).toHaveAttribute("accept", ".pgn,application/x-chess-pgn,text/plain");
    await userEvent.upload(screen.getByTestId("probe-input"), new File(["1. e4 *"], "a.pgn"));
    expect(onFiles).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("offers a zip too for the Library", () => {
    mount({ zip: true, testIds: { input: "old-input" } });
    expect(screen.getByTestId("old-input").getAttribute("accept")).toContain(".zip");
  });

  it("names each game of a file of several, and picks one from the keyboard", async () => {
    const user = userEvent.setup();
    const { onSelectGame } = mount({ games: GAMES, selectedGame: 0 });
    const list = screen.getByRole("list", { name: "Games in the file" });
    expect(within(list).getAllByRole("button").map((row) => row.textContent)).toEqual([
      "Carlsen vs Nakamura — Casual · 2026.09.01 · 1-0",
      "Anand vs Kramnik",
      "Game 3",
    ]);
    within(list).getAllByRole("button")[2].focus();
    await user.keyboard("{Enter}");
    expect(onSelectGame).toHaveBeenCalledWith(2);
  });

  it("shows no picker for one game", () => {
    mount({ games: GAMES.slice(0, 1) });
    expect(screen.queryByTestId("probe-games")).toBeNull();
  });
});
