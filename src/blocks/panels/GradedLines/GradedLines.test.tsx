import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import GradedLines from "./GradedLines";
import { MISSED, MIXED, PASSED, POSITION, TOP } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const rowTexts = () =>
  within(screen.getByRole("table", { name: "The engine's lines" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => [...row.querySelectorAll("th, td")].map((cell) => cell.textContent));

describe("GradedLines (CTA-238)", () => {
  it("shows the engine's lines best first — rank, move, eval, loss — the game's move marked, each suggestion graded", () => {
    render(<GradedLines position={POSITION} grade={MIXED} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("You found the best move.");
    expect(rowTexts()).toEqual([
      ["1", "Nf3", "+0.30", "0", "Best"],
      ["2", "Bc4", "+0.20", "10", "Good"],
      // The game's move, below the engine's lines.
      ["3", "Qh5GameThe move played in the game", "−1.50", "180", ""],
      // Outside the lines: no rank, no eval, a bound (the worst listed line's) — never a number of its own.
      ["—", "a3", "?", "≥ 10", "Outside the top 2"],
    ]);
  });

  it("says how many of the top lines were found when the best was not", () => {
    render(<GradedLines position={POSITION} grade={TOP} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("You found 1 of the top 2.");
  });

  it("names a verdict by the computer analysis's thresholds, and says when no top line was found", () => {
    render(<GradedLines position={POSITION} grade={MISSED} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("None of your moves is among the top 2.");
    expect(screen.getByTestId("graded-verdict-Qh5")).toHaveTextContent("Mistake");
    expect(screen.getByTestId("graded-verdict-h4")).toHaveTextContent("Outside the top 2");
  });

  it("says a pass, and marks no line", () => {
    render(<GradedLines position={POSITION} grade={PASSED} testId="graded" />);
    expect(screen.getByTestId("graded-headline")).toHaveTextContent("You passed.");
    expect(rowTexts().map((cells) => cells[4])).toEqual(["", "", ""]);
  });

  it("passes axe", async () => {
    render(<GradedLines position={POSITION} grade={MIXED} testId="graded" />);
    await expectNoAxeViolations();
  });
});
