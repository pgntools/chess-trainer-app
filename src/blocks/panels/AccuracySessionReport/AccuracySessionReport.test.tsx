import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AccuracySessionReport from "./AccuracySessionReport";
import { EMPTY, EMPTY_MATERIAL, MATERIAL, ROWS, SUMMARY } from "./fixtures";

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
      // A pass is put off for later: its best moves hidden.
      ["1…", "e5", "–", "Passed", "–", "–", ""],
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

  it("counts each category's pieces and its material, and every category's together (CTA-249)", () => {
    render(<AccuracySessionReport summary={SUMMARY} material={MATERIAL} rows={ROWS} onOpen={() => {}} testId="report" />);
    const table = screen.getByRole("table", { name: "Material per category" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Category", "Pawn", "Knight", "Bishop", "Rook", "Queen", "Material"]);
    expect(
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => [...row.querySelectorAll("th, td")].map((cell) => cell.textContent)),
    ).toEqual([
      ["Place in order", "0", "0", "0", "0", "1", "9"],
      ["Best move", "0", "0", "0", "1", "0", "5"],
      ["Clean candidates", "1", "0", "0", "0", "1", "10"],
      ["Better than the game", "0", "0", "0", "0", "0", "0"],
      ["See the line", "1", "0", "0", "0", "0", "1"],
      ["All categories", "2", "0", "0", "1", "2", "25"],
    ]);
    expect(screen.getByRole("rowheader", { name: "All categories" })).toBeInTheDocument();
  });

  it("draws no achievements without material", () => {
    render(<AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={() => {}} testId="report" />);
    expect(screen.queryByRole("table", { name: "Material per category" })).toBeNull();
  });

  it("passes axe with its achievements, won and none", async () => {
    const { container } = render(
      <>
        <AccuracySessionReport summary={SUMMARY} material={MATERIAL} rows={ROWS} onOpen={() => {}} testId="report" />
        <AccuracySessionReport summary={EMPTY} material={EMPTY_MATERIAL} rows={[]} onOpen={() => {}} testId="report-empty" />
      </>,
    );
    await expectNoAxeViolations(container);
  });

  it("passes axe", async () => {
    render(<AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={() => {}} testId="report" />);
    await expectNoAxeViolations();
  });
});
