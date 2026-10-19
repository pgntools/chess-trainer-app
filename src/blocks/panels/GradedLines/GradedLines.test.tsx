import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import GradedLines from "./GradedLines";
import { MISSED, PASSED, PERFECT, POSITION, SWAPPED } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const rowTexts = () =>
  within(screen.getByRole("table", { name: "The engine's lines" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => [...row.querySelectorAll("th, td")].map((cell) => cell.textContent));

describe("GradedLines (CTA-238)", () => {
  it("shows the engine's lines best first — rank, move, eval, loss — the game's move marked, each of the reader's moves with their own rank and a verdict", () => {
    render(<GradedLines position={POSITION} grade={SWAPPED} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("You found 2 of the top 2 — 0 in their place.");
    expect(rowTexts()).toEqual([
      ["1", "Nf3", "+0.30", "0", "2", "Best"],
      ["2", "Bc4", "+0.20", "10", "1", "Good"],
      // The game's move, below the engine's lines.
      ["3", "Qh5GameThe move played in the game", "−1.50", "180", "", ""],
      // Outside the lines: no rank, no eval, a bound (the worst listed line's) — never a number of its own.
      ["—", "a3", "?", "≥ 10", "3", "Not among the lines"],
    ]);
  });

  it("says all were found in order, marking each in its place", () => {
    render(<GradedLines position={POSITION} grade={PERFECT} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("Every best move found, each in its place — 2 of 2.");
    expect(screen.getByTestId("graded-order-Nf3")).toHaveTextContent("1In place");
    expect(screen.getByTestId("graded-order-Bc4")).toHaveTextContent("2In place");
  });

  it("names a verdict by the computer analysis's thresholds, and says when none of the top N was found", () => {
    render(<GradedLines position={POSITION} grade={MISSED} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("None of your moves is among the top 2.");
    expect(screen.getByTestId("graded-verdict-Qh5")).toHaveTextContent("Mistake");
    expect(screen.getByTestId("graded-verdict-h4")).toHaveTextContent("Not among the lines");
  });

  it("says a pass, and marks no line", () => {
    render(<GradedLines position={POSITION} grade={PASSED} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("You passed.");
    expect(rowTexts().map((cells) => cells[4])).toEqual(["", "", ""]);
  });

  it("passes axe", async () => {
    render(<GradedLines position={POSITION} grade={SWAPPED} testId="graded" />);
    await expectNoAxeViolations();
  });
});
