import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { START_MOVES } from "./fixtures";
import OpeningBookList from "./OpeningBookList";

describe("OpeningBookList (CTA-113)", () => {
  it("is a named list of the book's moves, each with its opening and code", async () => {
    render(<OpeningBookList moves={START_MOVES} onPlay={() => {}} onHover={() => {}} testId="book" />);
    expect(screen.getByRole("list", { name: "Book moves" })).toBeInTheDocument();
    expect(screen.getByTestId("book-move-d4")).toHaveTextContent("Queen's Pawn Game");
    expect(screen.getByTestId("book-move-d4")).toHaveTextContent("A40");
    await expectNoAxeViolations(screen.getByTestId("book"));
  });

  it("plays a move from the keyboard, and names the focused row as the pointer does", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const onHover = vi.fn();
    render(<OpeningBookList moves={START_MOVES} onPlay={onPlay} onHover={onHover} testId="book" />);
    await user.tab();
    expect(onHover).toHaveBeenLastCalledWith(START_MOVES[0]);
    await user.tab();
    expect(onHover).toHaveBeenLastCalledWith(START_MOVES[1]);
    await user.keyboard("{Enter}");
    expect(onPlay).toHaveBeenCalledWith("d4");
    await user.hover(screen.getByTestId("book-move-c4"));
    expect(onHover).toHaveBeenLastCalledWith(START_MOVES[3]);
  });

  it("says when the book has nothing from here", () => {
    render(<OpeningBookList moves={[]} onPlay={() => {}} onHover={() => {}} testId="book" />);
    expect(screen.getByTestId("book-empty")).toHaveTextContent("No known continuations from here.");
  });
});
