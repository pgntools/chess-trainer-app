import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AccuracySessionReport from "./AccuracySessionReport";
import { EMPTY, ROWS, SUMMARY } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("AccuracySessionReport (CTA-238)", () => {
  it("gives the session's measures — the best moves found and in their place first", () => {
    render(<AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={() => {}} testId="report" />);
    expect(screen.getByRole("heading", { name: "Session summary" })).toBeInTheDocument();
    expect(screen.getByTestId("report-measures-positions")).toHaveTextContent("3");
    expect(screen.getByTestId("report-measures-answered")).toHaveTextContent("2");
    expect(screen.getByTestId("report-measures-passed")).toHaveTextContent("1");
    // 2 + 2 + 2 to find: 2 found, both in place, at the first position — done perfectly.
    expect(screen.getByTestId("report-measures-foundRate")).toHaveTextContent("33% (2 of 6)");
    expect(screen.getByTestId("report-measures-inPlaceRate")).toHaveTextContent("33% (2 of 6)");
    expect(screen.getByTestId("report-measures-perfect")).toHaveTextContent("1");
    expect(screen.getByTestId("report-measures-bestRate")).toHaveTextContent("33% (1 of 3)");
    // 0 at move 1; 180 for 2. Qh5 (h3 is outside the lines, its loss unknown).
    expect(screen.getByTestId("report-measures-averageLoss")).toHaveTextContent("90");
    expect(screen.getByTestId("report-measures-mistakes")).toHaveTextContent("1");
    expect(screen.getByTestId("report-measures-outside")).toHaveTextContent("1");
  });

  it("lists every position in game order — the game's move, the engine's best, the reader's in their order, found / in place, the loss, a result", () => {
    render(<AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={() => {}} testId="report" />);
    const rows = within(screen.getByRole("table", { name: "Every position" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent))).toEqual([
      ["1.", "e4", "e4, d4", "e4, d4", "2/2 · 2 in place", "0", "Perfect"],
      ["1…", "e5", "e5, c5", "Passed", "–", "–", ""],
      ["2.", "Qh5", "Nf3, Bc4", "Qh5, h3", "0/2 · 0 in place", "180", "Mistake"],
      ["2…", "Nc6", "g6", "Not answered yet", "–", "–", ""],
    ]);
  });

  it("goes back to a position from its move's button", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={onOpen} testId="report" />);
    await user.click(screen.getByRole("button", { name: "Open 2. Qh5" }));
    expect(onOpen).toHaveBeenCalledWith(2);
  });

  it("shows dashes for rates with nothing graded", () => {
    render(<AccuracySessionReport summary={EMPTY} rows={[]} onOpen={() => {}} testId="report" />);
    expect(screen.getByTestId("report-measures-foundRate")).toHaveTextContent("–");
    expect(screen.getByTestId("report-measures-bestRate")).toHaveTextContent("–");
    expect(screen.getByTestId("report-measures-averageLoss")).toHaveTextContent("–");
  });

  it("passes axe", async () => {
    render(<AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={() => {}} testId="report" />);
    await expectNoAxeViolations();
  });
});
